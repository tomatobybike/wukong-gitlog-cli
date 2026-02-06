import chalk from 'chalk'
import dayjs from 'dayjs'
import ora from 'ora'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { wait } from '#src/utils/wait.mjs'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getAuthorChangeStats } from '../domain/author/analyze.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import { outputAll, outputData } from '../output/index.mjs'
import { getWeekRange } from '../utils/getWeekRange.mjs'
import { groupRecords } from '../utils/groupRecords.mjs'

/**
 * 处理单条 commit message
 * 如果冒号前是 feat-* 或 fix-*，则去掉前缀
 */
function normalizeCommitMsg(message) {
  // 匹配：feat-xxx: 或 fix-xxx:
  const match = message.match(/^(feat|fix)-[^:]+:(.+)$/i)

  if (match) {
    return match[2].trim()
  }

  return message
}


export const getWorkTimeConfig = (opts) => {
  // startHour = 9, endHour = 18, lunchStart = 12, lunchEnd = 14, country = 'CN'
  return {
    startHour: opts.worktime.start,
    endHour: opts.worktime.end,
    lunchStart: opts.worktime.lunch.start,
    lunchEnd: opts.worktime.lunch.end,
    country: opts.worktime.country,
    overnightCutoff: opts.worktime.overnightCutoff
  }
}

export const getOvertimeByWeek = (commits) => {
  // 新增：每周趋势数据（用于前端图表）
  const weekGroups = groupRecords(commits, 'week')
  const weekKeys = Object.keys(weekGroups).sort()
  const weeklySeries = weekKeys.map((k) => {
    const s = getWorkOvertimeStats(weekGroups[k])
    return {
      period: k,
      range: getWeekRange(k),
      total: s.total,
      outsideWorkCount: s.outsideWorkCount,
      outsideWorkRate: s.outsideWorkRate,
      nonWorkdayCount: s.nonWorkdayCount,
      nonWorkdayRate: s.nonWorkdayRate
    }
  })
  return weeklySeries
}

export const getOvertimeByMonth = (commits) => {
  // 新增：每月趋势数据（用于前端图表）
  const monthGroups = groupRecords(commits, 'month')
  const monthKeys = Object.keys(monthGroups).sort()
  const monthlySeries = monthKeys.map((k) => {
    const s = getWorkOvertimeStats(monthGroups[k])
    return {
      period: k,
      total: s.total,
      outsideWorkCount: s.outsideWorkCount,
      outsideWorkRate: s.outsideWorkRate,
      nonWorkdayCount: s.nonWorkdayCount,
      nonWorkdayRate: s.nonWorkdayRate
    }
  })
  return monthlySeries
}

// 每日最晚提交小时（用于显著展示加班严重程度）
export const getLatestCommitByDay = ({ commits, opts }) => {
  // 新增：每日最晚提交小时（用于显著展示加班严重程度）
  const dayGroups2 = groupRecords(commits, 'day')
  const dayKeys2 = Object.keys(dayGroups2).sort()

  // 次日凌晨归并窗口（默认 6 点前仍算前一天的加班）
  const overnightCutoff = Number.isFinite(opts.overnightCutoff)
    ? opts.overnightCutoff
    : 6
  // 次日上班时间（默认按 workStart，若未指定则 9 点）
  const workStartHour =
    opts.workStart || opts.workStart === 0 ? opts.workStart : 9
  const workEndHour = opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18

  // 有些日期「本身没有 commit」，但第二天凌晨有提交要归并到这一天，
  // 需要补出这些“虚拟日期”，否则 latestByDay 会漏掉这天。
  const virtualPrevDays = new Set()
  commits.forEach((r) => {
    const d = new Date(r.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    if (h < 0 || h >= overnightCutoff || h >= workStartHour) return
    const curDay = dayjs(d).format('YYYY-MM-DD')
    const prevDay = dayjs(curDay).subtract(1, 'day').format('YYYY-MM-DD')
    if (!dayGroups2[prevDay]) {
      virtualPrevDays.add(prevDay)
    }
  })

  const allDayKeys = Array.from(
    new Set([...dayKeys2, ...virtualPrevDays])
  ).sort()

  const latestByDay = allDayKeys.map((k) => {
    const list = dayGroups2[k] || []

    // 1) 当天「下班后」的提交：只统计 >= workEndHour 的小时
    const sameDayHours = list
      .map((r) => new Date(r.date))
      .filter((d) => !Number.isNaN(d.valueOf()))
      .map((d) => d.getHours())
      .filter((h) => h >= workEndHour && h < 24)

    // 2) 次日凌晨、但仍算前一日加班的提交
    const nextKey = dayjs(k).add(1, 'day').format('YYYY-MM-DD')
    const early = dayGroups2[nextKey] || []
    const earlyHours = early
      .map((r) => new Date(r.date))
      .filter((d) => !Number.isNaN(d.valueOf()))
      .map((d) => d.getHours())
      // 只看 [0, overnightCutoff) 之间的小时，
      // 并且默认认为 < workStartHour 属于「次日上班前」
      .filter(
        (h) =>
          h >= 0 &&
          h < overnightCutoff &&
          // 保护性判断：若有人把 overnightCutoff 设得大于上班时间，
          // 我们仍然只统计到上班时间为止
          h < workStartHour
      )

    // 3) 计算「逻辑上的最晚加班时间」
    //    - 当天晚上的用原始小时（如 22 点）
    //    - 次日凌晨的用 24 + 小时（如 1 点 → 25）
    const overtimeValues = [
      ...sameDayHours.map((h) => h),
      ...earlyHours.map((h) => 24 + h)
    ]

    if (overtimeValues.length === 0) {
      // 这一天没有任何「下班后到次日上班前」的提交
      return {
        date: k,
        latestHour: null,
        latestHourNormalized: null
      }
    }

    const latestHourNormalized = Math.max(...overtimeValues)

    // latestHour 保留「当天自然日内」的最晚提交通常小时数，供前端需要时参考
    const sameDayMax =
      sameDayHours.length > 0 ? Math.max(...sameDayHours) : null

    return {
      date: k,
      latestHour: sameDayMax,
      latestHourNormalized
    }
  })
  return latestByDay
}

/**
 * @function getGitLogsDayReport
 * @description 返回数据包含 git commit 的日期day （YYYY-MM-DD）,msg(当天提交的所有合并到一个msg),author
 * 用于 git log --all 的日报统计（Gerrit 友好）
 *
 * - 按 Change-Id 去重（同一 Change 只统计一次，取最新提交）
 * - 按 day + author 聚合
 * - msg：normalize 后 + 去重 + 合并
 * - originalMsg：当天所有原始 commit message（不去重，便于排查）
 * 返回数据包含：
 * - day: YYYY-MM-DD
 * - author
 * - originalMsg: 当天所有原始 commit message
 * - msg: 处理后的 message（去掉 feat-/fix- 冒号前缀）去重合并后的结果
 * @param {Array} records
 * @param {Object} opts
 * @returns {Array<{ day: string, msg: string, author: string }>}
 */
export const getGitLogsDayReport = async (records = [], opts = {}) => {
  if (!Array.isArray(records) || records.length === 0) {
    return []
  }

  const authorFilter = opts?.author
  function toList(v) {
    if (!v) return null
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean)
    return String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const include = authorFilter && typeof authorFilter === 'object' ? toList(authorFilter.include) : (typeof authorFilter === 'string' ? toList(authorFilter) : null)
  const exclude = authorFilter && typeof authorFilter === 'object' ? toList(authorFilter.exclude) : null

  /* ---------------- 1️⃣ Change-Id 级别去重（取最新） ---------------- */

  const changeMap = new Map()

  for (const item of records) {
    if (!item?.date || !item?.message) continue

    const key = item.changeId || item.hash
    const time = dayjs(item.date).valueOf()

    const prev = changeMap.get(key)
    if (!prev || time > dayjs(prev.date).valueOf()) {
      changeMap.set(key, item)
    }
  }

  const dedupedRecords = Array.from(changeMap.values())

  /* ---------------- 2️⃣ Day + Author 聚合 ---------------- */

  const map = {}

  for (const item of dedupedRecords) {
    const author =
      item.author ||
      item.originalAuthor ||
      item.email ||
      'unknown'

    // --author 过滤：支持字符串/数组 或 { include: [], exclude: [] }
    if ((include && include.length) || (exclude && exclude.length)) {
      const name = (item.author || item.originalAuthor || '').trim().toLowerCase()
      const mail = (item.email || '').trim().toLowerCase()
      const matches = (list) =>
        list.some((it) => {
          const v = String(it).trim().toLowerCase()
          if (v.includes('@')) return v === mail
          return v === name
        })

      if (include && include.length) {
        if (!matches(include)) continue
      }
      if (exclude && exclude.length) {
        if (matches(exclude)) continue
      }
    } else if (authorFilter && typeof authorFilter === 'string') {
      // legacy: simple string match
      if (author !== authorFilter) continue
    }

    const day = dayjs(item.date).format('YYYY-MM-DD')
    const key = `${day}__${author}`

    if (!map[key]) {
      map[key] = {
        day,
        author,
        originalMsgs: [],
        msgSet: new Set()
      }
    }

    const originalMsg = item.message.trim()
    const handledMsg = normalizeCommitMsg(originalMsg)

    map[key].originalMsgs.push(originalMsg)
    map[key].msgSet.add(handledMsg)
  }
  // FIXME: remove debug log before production
  console.log('❌', 'map', map);
  /* 
  wukong-gitlog-cli journal  --since 2026-02-01 可以得到2026-02-02日数据
  wukong-gitlog-cli journal  --since 2026-02-02 不能得到2026-02-02日数据
  */

  /* ---------------- 3️⃣ 输出 + 稳定排序 ---------------- */

  return Object.values(map)
    .map((item) => ({
      day: item.day,
      author: item.author,
      originalMsg: item.originalMsgs.join('\n'),
      msg: Array.from(item.msgSet).join('\n')
    }))
    .sort((a, b) => {
      const dayDiff =
        dayjs(b.day).valueOf() - dayjs(a.day).valueOf()
      if (dayDiff !== 0) return dayDiff
      return a.author.localeCompare(b.author, 'zh')
    })
}
