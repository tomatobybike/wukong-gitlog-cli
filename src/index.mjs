import { Command } from 'commander'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProfiler } from 'wukong-profiler'

import { parseOptions } from './cli/parseOptions.mjs'
import { registerOptions } from './cli/registerOptions.mjs'
import { registerCommands } from './cli/registerCommands.mjs'
import { runOvertime } from './handlers/handleOvertime.mjs'
// eslint-disable-next-line no-unused-vars
import { CLI_NAME } from './constants/index.mjs'
import {
  exportExcel,
  exportExcelAuthorChangeStats,
  exportExcelPerPeriodSheets
} from './excel.mjs'
import { getGitLogsFast } from './git.mjs'
import { handleServe } from './handlers/handleServe.mjs'
import { renderAuthorChangesJson } from './json.mjs'
import { setConfig } from './lib/configStore.mjs'
import { createOvertimeStats } from './overtime/createOvertimeStats.mjs'
import {
  renderOvertimeCsv,
  renderOvertimeTab,
  renderOvertimeText
} from './overtime/overtime.mjs'
import { renderAuthorMapText } from './renderAuthorMapText.mjs'
import { startServer } from './server.mjs'
import { renderChangedLinesText, renderText } from './text.mjs'
import { checkUpdateWithPatch } from './utils/checkUpdate.mjs'
import { handleSuccess } from './utils/handleSuccess.mjs'
import {
  groupRecords,
  outputFilePath,
  writeJSON,
  writeTextFile
} from './utils/index.mjs'
import { logDev } from './utils/logDev.mjs'
import { showVersionInfo } from './utils/showVersionInfo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
)

dayjs.extend(isoWeek)

const PKG_NAME = pkg.name
const VERSION = pkg.version

let profiler

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

  // Move option registration to a dedicated module to keep index.mjs concise
  registerOptions(program)

  // register serve/overtime subcommands
  registerCommands(program, {
    getGitLogsFast,
    createOvertimeStats,
    handleServe,
    runOvertime,
    parseOptions,
    startServer,
    ora
  })

  program.parse()

  const opts = program.opts()

  const config = parseOptions(opts)

  profiler = createProfiler({
    enabled: opts.profile,
    verbose: opts.verbose,
    flame: opts.flame,
    traceFile: opts.trace,
    hotThreshold: opts.hotThreshold,
    failOnHot: opts.failOnHot,
    diffBaseFile: opts.diffBase,
    diffThreshold: opts.diffThreshold
  })

  // ❗只创建一次缓存实例
  const getOvertimeStats = createOvertimeStats(config)

  setConfig('debug', opts.debug === true)

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
    console.warn('`--serve-only` is deprecated; prefer `git-commits serve --only` subcommand')
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

  const gitCommits = await getGitLogsFast(opts)
  let { commits: records } = gitCommits
  const { authorMap } = gitCommits
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
  profiler.step('load config')

  // If serve mode is enabled, write data modules and launch the web server
  if (opts.serve) {
    console.warn('`--serve` is deprecated; prefer `git-commits serve` subcommand')
    await handleServe({ opts, outDir, records, getOvertimeStats })
  }

  // --- Overtime analysis ---
  if (opts.overtime) {
    console.warn('`--overtime` is deprecated; prefer `git-commits overtime` subcommand')
    await profiler.stepAsync('getOvertimeStats', async () => {
      await getOvertimeStats(records)
    })

    await runOvertime({
      opts,
      outDir,
      records,
      authorMap,
      getOvertimeStats,
      deps: {
        renderOvertimeCsv,
        renderOvertimeTab,
        renderOvertimeText,
        renderAuthorMapText,
        writeTextFile,
        writeJSON,
        logDev,
        groupRecords,
        outputFilePath,
        exportExcelPerPeriodSheets,
        exportExcel
      }
    })
  }

  // --- JSON/TEXT/EXCEL（保持原逻辑） ---
  if (opts.json || opts.format === 'json') {
    const file = opts.out || 'commits.json'
    const filepath = outputFilePath(file, outDir)
    writeJSON(filepath, groups || records)
    const jsonText = renderAuthorChangesJson(records)
    writeJSON(outputFilePath('author-changes.json', outDir), jsonText)
    logDev(`JSON 已导出: ${filepath}`)
    handleSuccess({ spinner })
    return
  }

  if (opts.format === 'text') {
    const file = opts.out || 'commits.txt'
    const filepath = outputFilePath(file, outDir)
    const text = renderText(records, groups, { showGerrit: !!opts.gerrit })
    writeTextFile(filepath, text)
    writeTextFile(
      outputFilePath('author-changes.txt', outDir),
      renderChangedLinesText(records)
    )

    // console.log('\n Commits List:\n', text, '\n')

    logDev(`文本已导出: ${filepath}`)

    handleSuccess({ spinner })

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
    logDev(`Excel 已导出: ${excelPath}`)
    logDev(`文本已自动导出: ${txtPath}`)

    handleSuccess({ spinner })
  }

  await autoCheckUpdate()

  handleSuccess({ spinner })
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  if (profiler) {
    const result = profiler.end('git-commits')

    // --profile 时输出 JSON
    if (process.argv.includes('--profile')) {
      const json = {
        command: 'git-commits',
        version: VERSION,
        timestamp: Date.now(),
        profile: result
      }
      console.log(JSON.stringify(json, null, 2))
    }
  }
}
