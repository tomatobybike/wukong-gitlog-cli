/**
 * @file: exportAction.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:27
 */
import chalk from 'chalk'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { handleExportAuthor } from '#src/domain/export/exportAuthor.mjs'
import { handleExportAuthorChanges } from '#src/domain/export/exportAuthorChanges.mjs'
import { handleExportAuthorChangesJson } from '#src/domain/export/exportAuthorChangesJson.mjs'
import { handleExportByMonth } from '#src/domain/export/exportByMonth.mjs'
import { handleExportByWeek } from '#src/domain/export/exportByWeek.mjs'
import { handleExportCommits } from '#src/domain/export/exportCommits.mjs'
import { handleExportCommitsExcel } from '#src/domain/export/exportCommitsExcel.mjs'
import { handleExportCommitsJson } from '#src/domain/export/exportCommitsJson.mjs'
import {
  handleExportOvertimeCsv,
  handleExportOvertimeMain,
  handleExportOvertimeTabTxt,
  handleExportOvertimeTxt
} from '#src/domain/export/index.mjs'
import { getProfileDirFile } from '#utils/getProfileDirFile.mjs'
import { groupRecords } from '#utils/groupRecords.mjs'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { resolveGerrit } from '../domain/git/resolveGerrit.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import {
  renderOvertimeCsv,
  renderOvertimeTab,
  renderOvertimeText
} from '../domain/overtime/overtime.mjs'
import { outputAll, outputData } from '../output/index.mjs'
import {
  getLatestCommitByDay,
  getOvertimeByMonth,
  getOvertimeByWeek,
  getWorkTimeConfig
} from './helpers.mjs'

export async function exportAction(rawOpts = {}) {
  const opts = await parseOptions(rawOpts)
  const traceFile = getProfileDirFile('trace.json', opts)


  const profiler = createProfiler({ ...opts.profile, traceFile }, opts)

  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Export'),
    format: ' [:bar] :percent :payload'
  })

  const result = {}
  try {
    // 1️⃣ 拉取 Git 记录
    bar.step(5, '正在提取 Git 提交记录...')
    const { commits, authorMap } = await profiler.stepAsync('getGitLogs', () =>
      getGitLogsFast(opts)
    )
    result.commits = commits

    bar.step(15, 'Git 记录提取完成')

    const records = result.commits

    // 2️⃣ Gerrit enrich（公共）
    const enrichedRecords = opts.gerrit
      ? await resolveGerrit(records, opts)
      : records

    // 3️⃣ 加班分析（根据配置可选）
    const worktimeOptions = getWorkTimeConfig(opts)

    bar.step(10, '正在计算加班概况...')
    result.overtime = await profiler.stepAsync('overtime', () => {
      return getWorkOvertimeStats(enrichedRecords, worktimeOptions)
    })

    if (['all','week'].includes(opts.period.groupBy)) {
      bar.step(20, '正在生成周趋势数据...')
      result.overtimeByWeek = await getOvertimeByWeek(enrichedRecords)
    }

    if (['all','month'].includes(opts.period.groupBy)) {
      bar.step(20, '正在生成月趋势数据...')
      result.overtimeByMonth = await getOvertimeByMonth(enrichedRecords)
    }

    bar.step(20, '正在标记每日最晚提交点...')
    result.overtimeLatestCommitByDay = await getLatestCommitByDay({
      commits: enrichedRecords,
      opts: worktimeOptions
    })

    // 4️⃣ 数据输出
    bar.step(10, '正在持久化分析结果...')
    await profiler.stepAsync('output', async () => {
      await outputData(result, {
        dir: opts.output.dir || path.resolve('output-wukong'),
        worktimeOptions,
        git: opts.git || {},
      })
    })

    bar.step(100, '分析任务全部完成！')
    handleExportOvertimeMain({
      fileName: 'overtime.json',
      opts,
      result: result.overtime
    })

    // 导出 overtime_commits.txt
    const overtimeTxtResult = renderOvertimeText(result.overtime)
    handleExportOvertimeTxt({
      fileName: 'overtime_commits.txt',
      opts,
      result: overtimeTxtResult
    })

    // 导出 overtime_commits.tab.txt
    const overtimeTabTxtResult = renderOvertimeTab(result.overtime)
    handleExportOvertimeTabTxt({
      fileName: 'overtime_commits.tab.txt',
      opts,
      result: overtimeTabTxtResult
    })

    // 导出 overtime_commits.csv
    const overtimeCsvResult = renderOvertimeCsv(result.overtime)
    handleExportOvertimeCsv({
      fileName: 'overtime_commits.csv',
      opts,
      result: overtimeCsvResult
    })

    if (['all','month'].includes(opts.period.groupBy)) {
      // 导出 每月数据
      handleExportByMonth({
        opts,
        records: commits,
        worktimeOptions
      })
    }

    if (['all','week'].includes(opts.period.groupBy)) {
      // 导出 每周数据
      handleExportByWeek({
        opts,
        records: commits,
        worktimeOptions
      })
    }

    // 导出 commit logs
    handleExportCommits({
      opts,
      records: commits,
      fileName: 'commits.txt'
    })

    // 导出 commit logs
    handleExportAuthorChanges({
      opts,
      records: commits,
      fileName: 'author-changes.txt'
    })

    // --- 分组 ---
    const groups = opts.period.groupBy
      ? groupRecords(records, opts.period.groupBy)
      : null


    handleExportCommitsExcel({
      opts,
      records: commits,
      fileName: 'commits.xlsx',
      groups
    })

    handleExportCommitsJson({
      opts,
      records: commits,
      fileName: 'commits.json',
      groups
    })

    handleExportAuthorChangesJson({
      opts,
      records: commits,
      fileName: 'author-changes.json'
    })
    handleExportAuthor({ opts, records: authorMap, fileName: 'author.txt' })
  } catch (error) {
    // 异常处理：停止进度条并打印红色错误
    mb.stop()
    console.error(
      `\n${chalk.bgRed(' ERROR ')} ${chalk.red(error.stack || error)}`
    )
    process.exit(1)
  } finally {
    // 正常结束
    profiler.end('analyze')
    mb.stop()
  }

  return result
}
