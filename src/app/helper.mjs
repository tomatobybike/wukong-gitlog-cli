import chalk from 'chalk'

import dayjs from 'dayjs'
import ora from 'ora'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getAuthorChangeStats } from '../domain/author/analyze.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import { outputAll, outputData } from '../output/index.mjs'
import { getWeekRange } from '../utils/getWeekRange.mjs'
import { groupRecords } from '../utils/groupRecords.mjs'

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
