import chalk from 'chalk'
import { Command } from 'commander'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import { fileURLToPath } from 'url'

import { CLI_NAME } from './constants/index.mjs'
import {
  exportExcel,
  exportExcelAuthorChangeStats,
  exportExcelPerPeriodSheets
} from './excel.mjs'
import { getGitLogs } from './git.mjs'
import { renderAuthorChangesJson } from './json.mjs'
import {
  analyzeOvertime,
  renderOvertimeCsv,
  renderOvertimeTab,
  renderOvertimeText
} from './overtime.mjs'
import { startServer } from './server.mjs'
import { renderChangedLinesText, renderText } from './text.mjs'
import { checkUpdateWithPatch } from './utils/checkUpdate.mjs'
import {
  groupRecords,
  outputFilePath,
  writeJSON,
  writeTextFile
} from './utils/index.mjs'
import { showVersionInfo } from './utils/showVersionInfo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
)

dayjs.extend(isoWeek)

const PKG_NAME = pkg.name
const VERSION = pkg.version

const autoCheckUpdate = async () => {
  // === CLI 主逻辑完成后提示更新 ===
  await checkUpdateWithPatch({
    pkg: {
      name: PKG_NAME,
      version: VERSION
    },
    force: true
  })
}

const version = async () => {
  showVersionInfo(VERSION)
  await autoCheckUpdate()
  process.exit(0)
}

/** 将 "2025-W48" → { start: '2025-11-24', end: '2025-11-30' } */
export function getWeekRange(periodStr) {
  // periodStr = "2025-W48"
  const [year, w] = periodStr.split('-W')
  const week = parseInt(w, 10)

  const start = dayjs().year(year).isoWeek(week).startOf('week') // Monday
  const end = dayjs().year(year).isoWeek(week).endOf('week') // Sunday

  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  }
}

const main = async () => {
  const program = new Command()

  program
    .name('git-commits')
    .version(pkg.version, '-v', 'show version')
    .description('Advanced Git commit log exporter.')
    .option('--author <name>', '指定 author 名')
    .option('--email <email>', '指定 email')
    .option('--since <date>', '起始日期')
    .option('--until <date>', '结束日期')
    .option('--limit <n>', '限制数量', parseInt)
    .option('--no-merges', '不包含 merge commit')
    .option('--json', '输出 JSON')
    .option('--format <type>', '输出格式: text | excel | json', 'text')
    .option('--group-by <type>', '按日期分组: day | month | week')
    .option('--stats', '输出每日统计数据')
    .option(
      '--gerrit <prefix>',
      '显示 Gerrit 地址，支持在 prefix 中使用 {{hash}} 占位符'
    )
    .option(
      '--gerrit-api <url>',
      '可选：Gerrit REST API 基础地址，用于解析 changeNumber，例如 `https://gerrit.example.com`'
    )
    .option(
      '--gerrit-auth <tokenOrUserPass>',
      '可选：Gerrit API 授权，格式为 `user:pass` 或 `TOKEN`（表示 Bearer token）'
    )
    .option('--overtime', '分析公司加班文化（输出下班时间与非工作日提交占比）')
    .option('--country <code>', '节假日国家：CN 或 US，默认为 CN', 'CN')
    .option(
      '--work-start <hour>',
      '上班开始小时，默认 9',
      (v) => parseInt(v, 10),
      9
    )
    .option(
      '--work-end <hour>',
      '下班小时，默认 18',
      (v) => parseInt(v, 10),
      18
    )
    .option(
      '--lunch-start <hour>',
      '午休开始小时，默认 12',
      (v) => parseInt(v, 10),
      12
    )
    .option(
      '--lunch-end <hour>',
      '午休结束小时，默认 14',
      (v) => parseInt(v, 10),
      14
    )
    .option(
      '--overnight-cutoff <hour>',
      '次日凌晨归并窗口（小时），默认 6',
      (v) => parseInt(v, 10),
      6
    )
    .option('--out <file>', '输出文件名（不含路径）')
    .option(
      '--out-dir <dir>',
      '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output-wukong`'
    )
    .option(
      '--out-parent',
      '将输出目录放到当前工程的父目录的 `output-wukong/`（等同于 `--out-dir ../output-wukong`）'
    )
    .option(
      '--per-period-formats <formats>',
      '每个周期单独输出的格式，逗号分隔：text,csv,tab,xlsx。默认为空（不输出 CSV/Tab/XLSX）',
      ''
    )
    .option(
      '--per-period-excel-mode <mode>',
      'per-period Excel 模式：sheets|files（默认：sheets）',
      'sheets'
    )
    .option(
      '--per-period-only',
      '仅输出 per-period（month/week）文件，不输出合并的 monthly/weekly 汇总文件'
    )
    .option(
      '--serve',
      '启动本地 web 服务，查看提交统计（将在 output-wukong/data 下生成数据文件）'
    )
    .option(
      '--port <n>',
      '本地 web 服务端口（默认 3000）',
      (v) => parseInt(v, 10),
      3000
    )
    .option(
      '--serve-only',
      '仅启动 web 服务，不导出或分析数据（使用 output-wukong/data 中已有的数据）'
    )
    .option('--version', 'show version information')
    .parse()

  const opts = program.opts()
  // compute output directory root early (so serve-only can use it)
  const outDir = opts.outParent
    ? path.resolve(process.cwd(), '..', 'output-wukong')
    : opts.outDir || undefined

  if (opts.version) {
    await version()
    return
  }
  // if serve-only is requested, start server and exit
  if (opts.serveOnly) {
    try {
      await startServer(opts.port || 3000, outDir)
    } catch (err) {
      console.warn(
        'Start server failed:',
        err && err.message ? err.message : err
      )
      process.exit(1)
    }
    return
  }

  const spinner = ora('Loading...').start()

  let records = await getGitLogs(opts)

  // compute output directory root if user provided one or wants parent

  // --- Gerrit 地址处理（若提供） ---
  if (opts.gerrit) {
    const prefix = opts.gerrit
    // support optional changeNumber resolution via Gerrit REST API
    const { gerritApi, gerritAuth } = opts
    // create new array to avoid mutating function parameters (eslint: no-param-reassign)
    if (prefix.includes('{{changeNumber}}') && gerritApi) {
      // async mapping to resolve changeNumber using Gerrit API
      const cache = new Map()
      const headers = {}
      if (gerritAuth) {
        if (gerritAuth.includes(':')) {
          headers.Authorization = `Basic ${Buffer.from(gerritAuth).toString('base64')}`
        } else {
          headers.Authorization = `Bearer ${gerritAuth}`
        }
      }
      const fetchGerritJson = async (url) => {
        try {
          const res = await fetch(url, { headers })
          const txt = await res.text()
          // Gerrit prepends )]}' to JSON responses — strip it
          const jsonText = txt.replace(/^\)\]\}'\n/, '')
          return JSON.parse(jsonText)
        } catch (err) {
          return null
        }
      }
      const resolveChangeNumber = async (r) => {
        // try changeId first
        if (r.changeId) {
          if (cache.has(r.changeId)) return cache.get(r.changeId)
          // try `changes/{changeId}/detail`
          const url = `${gerritApi.replace(/\/$/, '')}/changes/${encodeURIComponent(r.changeId)}/detail`
          let j = await fetchGerritJson(url)
          if (j && j._number) {
            cache.set(r.changeId, j._number)
            return j._number
          }
          // fallback: query search
          const url2 = `${gerritApi.replace(/\/$/, '')}/changes/?q=change:${encodeURIComponent(r.changeId)}`
          j = await fetchGerritJson(url2)
          if (Array.isArray(j) && j.length > 0 && j[0]._number) {
            cache.set(r.changeId, j[0]._number)
            return j[0]._number
          }
        }
        // try commit hash
        if (r.hash) {
          if (cache.has(r.hash)) return cache.get(r.hash)
          const url3 = `${gerritApi.replace(/\/$/, '')}/changes/?q=commit:${encodeURIComponent(r.hash)}`
          const j = await fetchGerritJson(url3)
          if (Array.isArray(j) && j.length > 0 && j[0]._number) {
            cache.set(r.hash, j[0]._number)
            return j[0]._number
          }
        }
        return null
      }
      records = await Promise.all(
        records.map(async (r) => {
          const changeNumber = await resolveChangeNumber(r)
          const changeNumberOrFallback = changeNumber || r.changeId || r.hash
          const gerritUrl = prefix.replace(
            '{{changeNumber}}',
            changeNumberOrFallback
          )
          return { ...r, gerrit: gerritUrl }
        })
      )
    } else if (prefix.includes('{{changeNumber}}') && !gerritApi) {
      console.warn(
        'prefix contains {{changeNumber}} but no --gerrit-api provided — falling back to changeId/hash'
      )
      records = records.map((r) => ({
        ...r,
        gerrit: prefix.replace('{{changeNumber}}', r.changeId || r.hash)
      }))
    } else {
      records = records.map((r) => {
        let gerritUrl
        if (prefix.includes('{{changeId}}')) {
          const changeId = r.changeId || r.hash
          gerritUrl = prefix.replace('{{changeId}}', changeId)
        } else if (prefix.includes('{{hash}}')) {
          gerritUrl = prefix.replace('{{hash}}', r.hash)
        } else {
          gerritUrl = prefix.endsWith('/')
            ? `${prefix}${r.hash}`
            : `${prefix}/${r.hash}`
        }
        return { ...r, gerrit: gerritUrl }
      })
    }
  }

  // --- 分组 ---
  const groups = opts.groupBy ? groupRecords(records, opts.groupBy) : null

  // --- Overtime analysis ---
  if (opts.overtime) {
    const stats = analyzeOvertime(records, {
      startHour: opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
      endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
      lunchStart:
        opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
      lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
      country: opts.country || 'CN'
    })
    // Output to console
    console.log('\n--- Overtime analysis ---\n')
    console.log(renderOvertimeText(stats))
    // if user requested json format, write stats to file
    if (opts.json || opts.format === 'json') {
      const file = opts.out || 'overtime.json'
      const filepath = outputFilePath(file, outDir)
      writeJSON(filepath, stats)
      console.log(chalk.green(`overtime JSON 已导出: ${filepath}`))
    }
    // Always write human readable overtime text to file (default: overtime.txt)
    const outBase = opts.out
      ? path.basename(opts.out, path.extname(opts.out))
      : 'commits'
    const overtimeFileName = `overtime_${outBase}.txt`
    const overtimeFile = outputFilePath(overtimeFileName, outDir)
    writeTextFile(overtimeFile, renderOvertimeText(stats))
    // write tab-separated text file for better alignment in editors that use proportional fonts
    const overtimeTabFileName = `overtime_${outBase}.tab.txt`
    const overtimeTabFile = outputFilePath(overtimeTabFileName, outDir)
    writeTextFile(overtimeTabFile, renderOvertimeTab(stats))
    // write CSV for structured data consumption
    const overtimeCsvFileName = `overtime_${outBase}.csv`
    const overtimeCsvFile = outputFilePath(overtimeCsvFileName, outDir)
    writeTextFile(overtimeCsvFile, renderOvertimeCsv(stats))
    console.log(chalk.green(`Overtime text 已导出: ${overtimeFile}`))
    console.log(chalk.green(`Overtime table (tabs) 已导出: ${overtimeTabFile}`))
    console.log(chalk.green(`Overtime CSV 已导出: ${overtimeCsvFile}`))

    // If serve mode is enabled, write data modules and launch the web server
    if (opts.serve) {
      try {
        const dataCommitsFile = outputFilePath('data/commits.mjs', outDir)
        const commitsModule = `export default ${JSON.stringify(records, null, 2)};\n`
        writeTextFile(dataCommitsFile, commitsModule)
        const dataStatsFile = outputFilePath('data/overtime-stats.mjs', outDir)
        const statsModule = `export default ${JSON.stringify(stats, null, 2)};\n`
        writeTextFile(dataStatsFile, statsModule)

        // 新增：每周趋势数据（用于前端图表）
        const weekGroups = groupRecords(records, 'week')
        const weekKeys = Object.keys(weekGroups).sort()
        const weeklySeries = weekKeys.map((k) => {
          const s = analyzeOvertime(weekGroups[k], {
            startHour:
              opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
            endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
            lunchStart:
              opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
            lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
            country: opts.country || 'CN'
          })
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
        const dataWeeklyFile = outputFilePath(
          'data/overtime-weekly.mjs',
          outDir
        )
        const weeklyModule = `export default ${JSON.stringify(weeklySeries, null, 2)};\n`
        writeTextFile(dataWeeklyFile, weeklyModule)
        console.log(chalk.green(`Weekly series 已导出: ${dataWeeklyFile}`))

        // 新增：每月趋势数据（用于前端图表）
        const monthGroups2 = groupRecords(records, 'month')
        const monthKeys2 = Object.keys(monthGroups2).sort()
        const monthlySeries = monthKeys2.map((k) => {
          const s = analyzeOvertime(monthGroups2[k], {
            startHour:
              opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
            endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
            lunchStart:
              opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
            lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
            country: opts.country || 'CN'
          })
          return {
            period: k,
            total: s.total,
            outsideWorkCount: s.outsideWorkCount,
            outsideWorkRate: s.outsideWorkRate,
            nonWorkdayCount: s.nonWorkdayCount,
            nonWorkdayRate: s.nonWorkdayRate
          }
        })
        const dataMonthlyFile = outputFilePath(
          'data/overtime-monthly.mjs',
          outDir
        )
        const monthlyModule = `export default ${JSON.stringify(monthlySeries, null, 2)};\n`
        writeTextFile(dataMonthlyFile, monthlyModule)
        console.log(chalk.green(`Monthly series 已导出: ${dataMonthlyFile}`))

        // 新增：每日最晚提交小时（用于显著展示加班严重程度）
        const dayGroups2 = groupRecords(records, 'day')
        const dayKeys2 = Object.keys(dayGroups2).sort()

        // 次日凌晨归并窗口（默认 6 点前仍算前一天的加班）
        const overnightCutoff = Number.isFinite(opts.overnightCutoff)
          ? opts.overnightCutoff
          : 6
        // 次日上班时间（默认按 workStart，若未指定则 9 点）
        const workStartHour =
          opts.workStart || opts.workStart === 0 ? opts.workStart : 9
        const workEndHour =
          opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18

        // 有些日期「本身没有 commit」，但第二天凌晨有提交要归并到这一天，
        // 需要补出这些“虚拟日期”，否则 latestByDay 会漏掉这天。
        const virtualPrevDays = new Set()
        records.forEach((r) => {
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
        const dataLatestByDayFile = outputFilePath(
          'data/overtime-latest-by-day.mjs',
          outDir
        )
        const latestByDayModule = `export default ${JSON.stringify(latestByDay, null, 2)};\n`
        writeTextFile(dataLatestByDayFile, latestByDayModule)
        console.log(
          chalk.green(`Latest-by-day series 已导出: ${dataLatestByDayFile}`)
        )

        // 导出配置（供前端显示）
        try {
          const configFile = outputFilePath('data/config.mjs', outDir)
          const cfg = {
            startHour: opts.workStart || 9,
            endHour: opts.workEnd || 18,
            lunchStart: opts.lunchStart || 12,
            lunchEnd: opts.lunchEnd || 14,
            overnightCutoff
          }
          writeTextFile(
            configFile,
            `export default ${JSON.stringify(cfg, null, 2)};\n`
          )
          console.log(chalk.green(`Config 已导出: ${configFile}`))
        } catch (e) {
          console.warn('Export config failed:', e && e.message ? e.message : e)
        }

        startServer(opts.port || 3000, outDir).catch(() => {})
      } catch (err) {
        console.warn(
          'Export data modules failed:',
          err && err.message ? err.message : err
        )
      }
    }

    // 按月输出 ... 保持原逻辑
    const perPeriodFormats = String(opts.perPeriodFormats || '')
      .split(',')
      .map((s) =>
        String(s || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
    try {
      const monthGroups = groupRecords(records, 'month')
      const monthlyFileName = `overtime_${outBase}_monthly.txt`
      const monthlyFile = outputFilePath(monthlyFileName, outDir)
      let monthlyContent = ''
      const monthKeys = Object.keys(monthGroups).sort()
      monthKeys.forEach((k) => {
        const groupRecs = monthGroups[k]
        const s = analyzeOvertime(groupRecs, {
          startHour:
            opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
          endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
          lunchStart:
            opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
          lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
          country: opts.country || 'CN'
        })
        monthlyContent += `===== ${k} =====\n`
        monthlyContent += `${renderOvertimeText(s)}\n\n`
        // Also write a single file per month under 'month/' folder
        try {
          const perMonthFileName = `month/overtime_${outBase}_${k}.txt`
          const perMonthFile = outputFilePath(perMonthFileName, outDir)
          writeTextFile(perMonthFile, renderOvertimeText(s))
          console.log(
            chalk.green(`Overtime 月度(${k}) 已导出: ${perMonthFile}`)
          )
          // per-period CSV / Tab format (按需生成)
          if (perPeriodFormats.includes('csv')) {
            try {
              const perMonthCsvName = `month/overtime_${outBase}_${k}.csv`
              writeTextFile(
                outputFilePath(perMonthCsvName, outDir),
                renderOvertimeCsv(s)
              )
              console.log(
                chalk.green(
                  `Overtime 月度(CSV)(${k}) 已导出: ${outputFilePath(perMonthCsvName, outDir)}`
                )
              )
            } catch (err) {
              console.warn(
                `Write monthly CSV for ${k} failed:`,
                err && err.message ? err.message : err
              )
            }
          }
          if (perPeriodFormats.includes('tab')) {
            try {
              const perMonthTabName = `month/overtime_${outBase}_${k}.tab.txt`
              writeTextFile(
                outputFilePath(perMonthTabName, outDir),
                renderOvertimeTab(s)
              )
              console.log(
                chalk.green(
                  `Overtime 月度(Tab)(${k}) 已导出: ${outputFilePath(perMonthTabName, outDir)}`
                )
              )
            } catch (err) {
              console.warn(
                `Write monthly Tab for ${k} failed:`,
                err && err.message ? err.message : err
              )
            }
          }
        } catch (err) {
          console.warn(
            `Write monthly file for ${k} failed:`,
            err && err.message ? err.message : err
          )
        }
      })
      if (!opts.perPeriodOnly) {
        writeTextFile(monthlyFile, monthlyContent)
        console.log(chalk.green(`Overtime 月度汇总 已导出: ${monthlyFile}`))
      }
      // per-period Excel (sheets or files)
      if (perPeriodFormats.includes('xlsx')) {
        const perPeriodExcelMode = String(opts.perPeriodExcelMode || 'sheets')
        if (perPeriodExcelMode === 'sheets') {
          try {
            const monthXlsxName = `month/overtime_${outBase}_monthly.xlsx`
            const monthXlsxFile = outputFilePath(monthXlsxName, outDir)
            await exportExcelPerPeriodSheets(monthGroups, monthXlsxFile, {
              stats: opts.stats,
              gerrit: opts.gerrit
            })
            console.log(
              chalk.green(`Overtime 月度(XLSX) 已导出: ${monthXlsxFile}`)
            )
          } catch (err) {
            console.warn(
              'Export month XLSX (sheets) failed:',
              err && err.message ? err.message : err
            )
          }
        } else {
          try {
            const monthKeys2 = Object.keys(monthGroups).sort()
            const tasks = monthKeys2.map((k2) => {
              const perMonthXlsxName = `month/overtime_${outBase}_${k2}.xlsx`
              const perMonthXlsxFile = outputFilePath(perMonthXlsxName, outDir)
              return exportExcel(monthGroups[k2], null, {
                file: perMonthXlsxFile,
                stats: opts.stats,
                gerrit: opts.gerrit
              }).then(() =>
                console.log(
                  chalk.green(
                    `Overtime 月度(XLSX)(${k2}) 已导出: ${perMonthXlsxFile}`
                  )
                )
              )
            })
            await Promise.all(tasks)
          } catch (err) {
            console.warn(
              'Export monthly XLSX files failed:',
              err && err.message ? err.message : err
            )
          }
        }
      }
    } catch (err) {
      console.warn(
        'Generate monthly overtime failed:',
        err && err.message ? err.message : err
      )
    }

    // 周度输出保持原逻辑（略）
    try {
      const weekGroups = groupRecords(records, 'week')
      const weeklyFileName = `overtime_${outBase}_weekly.txt`
      const weeklyFile = outputFilePath(weeklyFileName, outDir)
      let weeklyContent = ''
      const weekKeys = Object.keys(weekGroups).sort()
      weekKeys.forEach((k) => {
        const groupRecs = weekGroups[k]
        const s = analyzeOvertime(groupRecs, {
          startHour:
            opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
          endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
          lunchStart:
            opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
          lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
          country: opts.country || 'CN'
        })
        weeklyContent += `===== ${k} =====\n`
        weeklyContent += `${renderOvertimeText(s)}\n\n`
        try {
          const perWeekFileName = `week/overtime_${outBase}_${k}.txt`
          const perWeekFile = outputFilePath(perWeekFileName, outDir)
          writeTextFile(perWeekFile, renderOvertimeText(s))
          console.log(chalk.green(`Overtime 周度(${k}) 已导出: ${perWeekFile}`))
          // eslint-disable-next-line no-shadow
          const perPeriodFormats = String(opts.perPeriodFormats || '')
            .split(',')
            // eslint-disable-next-line no-shadow
            .map((s) =>
              String(s || '')
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
          if (perPeriodFormats.includes('csv')) {
            try {
              const perWeekCsvName = `week/overtime_${outBase}_${k}.csv`
              writeTextFile(
                outputFilePath(perWeekCsvName, outDir),
                renderOvertimeCsv(s)
              )
              console.log(
                chalk.green(
                  `Overtime 周度(CSV)(${k}) 已导出: ${outputFilePath(perWeekCsvName, outDir)}`
                )
              )
            } catch (err) {
              console.warn(
                `Write weekly CSV for ${k} failed:`,
                err && err.message ? err.message : err
              )
            }
          }
          if (perPeriodFormats.includes('tab')) {
            try {
              const perWeekTabName = `week/overtime_${outBase}_${k}.tab.txt`
              writeTextFile(
                outputFilePath(perWeekTabName, outDir),
                renderOvertimeTab(s)
              )
              console.log(
                chalk.green(
                  `Overtime 周度(Tab)(${k}) 已导出: ${outputFilePath(perWeekTabName, outDir)}`
                )
              )
            } catch (err) {
              console.warn(
                `Write weekly Tab for ${k} failed:`,
                err && err.message ? err.message : err
              )
            }
          }
        } catch (err) {
          console.warn(
            `Write weekly file for ${k} failed:`,
            err && err.message ? err.message : err
          )
        }
      })
      writeTextFile(weeklyFile, weeklyContent)
      console.log(chalk.green(`Overtime 周度汇总 已导出: ${weeklyFile}`))
    } catch (err) {
      console.warn(
        'Generate weekly overtime failed:',
        err && err.message ? err.message : err
      )
    }
  }

  // --- JSON/TEXT/EXCEL（保持原逻辑） ---
  if (opts.json || opts.format === 'json') {
    const file = opts.out || 'commits.json'
    const filepath = outputFilePath(file, outDir)
    writeJSON(filepath, groups || records)
    const jsonText = renderAuthorChangesJson(records)
    writeJSON(outputFilePath('author-changes.json', outDir), jsonText)
    console.log(chalk.green(`JSON 已导出: ${filepath}`))
    spinner.succeed('Done')
    return
  }

  if (opts.format === 'text') {
    const file = opts.out || 'commits.txt'
    const filepath = outputFilePath(file, outDir)
    const text = renderText(records, groups, { showGerrit: !!opts.gerrit })
    writeTextFile(filepath, text)
    writeTextFile(
      outputFilePath('author-changes.text', outDir),
      renderChangedLinesText(records)
    )
    console.log(text)
    console.log(chalk.green(`文本已导出: ${filepath}`))
    spinner.succeed('Done')
    return
  }

  if (opts.format === 'excel') {
    const excelFile = opts.out || 'commits.xlsx'
    const excelPath = outputFilePath(excelFile, outDir)
    const txtFile = excelFile.replace(/\.xlsx$/, '.txt')
    const txtPath = outputFilePath(txtFile, outDir)
    await exportExcel(records, groups, {
      file: excelPath,
      stats: opts.stats,
      gerrit: opts.gerrit
    })
    await exportExcelAuthorChangeStats(
      records,
      outputFilePath('author_stats.xlsx', outDir)
    )
    const text = renderText(records, groups)
    writeTextFile(txtPath, text)
    console.log(chalk.green(`Excel 已导出: ${excelPath}`))
    console.log(chalk.green(`文本已自动导出: ${txtPath}`))
    spinner.succeed('Done')
  }

  await autoCheckUpdate()
}

main()
