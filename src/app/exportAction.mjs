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

import { handleExportByMonth } from '#src/domain/export/exportByMonth.mjs'
import { handleExportByWeek } from '#src/domain/export/exportByWeek.mjs'
import {
  handleExportOvertimeCsv,
  handleExportOvertimeMain,
  handleExportOvertimeTabTxt,
  handleExportOvertimeTxt
} from '#src/domain/export/index.mjs'

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

  const profiler = createProfiler({ ...opts.profile })

  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Export'),
    format: ' [:bar] :percent :payload'
  })

  const result = {}
  try {
    // 1️⃣ 拉取 Git 记录
    bar.step(5, '正在提取 Git 提交记录...')
    const { commits } = await profiler.stepAsync('getGitLogs', () =>
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

    bar.step(20, '正在生成周/月趋势数据...')
    result.overtimeByWeek = await getOvertimeByWeek(enrichedRecords)
    result.overtimeByMonth = await getOvertimeByMonth(enrichedRecords)

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
        worktimeOptions
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

    // 导出 每月数据
    handleExportByMonth({
      opts,
      records: commits,
      worktimeOptions
    })

    // 导出 每周数据
    handleExportByWeek({
      opts,
      records: commits,
      worktimeOptions
    })
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
