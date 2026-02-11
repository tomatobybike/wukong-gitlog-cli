import chalk from 'chalk'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { getProfileDirFile } from '#utils/getProfileDirFile.mjs'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { resolveGerrit } from '../domain/git/resolveGerrit.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import { t } from '../i18n/index.mjs'
import { outputAll, outputData } from '../output/index.mjs'
import { resolveOutDir } from '../output/utils/outputPath.mjs'
import {
  getLatestCommitByDay,
  getOvertimeByMonth,
  getOvertimeByWeek,
  getWorkTimeConfig
} from './helpers.mjs'

export async function overtimeAction(rawOpts = {}) {
  const opts = await parseOptions(rawOpts)
  const traceFile = getProfileDirFile('trace.json', opts)

  const profiler = createProfiler({ ...opts.profile, traceFile })

  // 未来 可考虑将 MultiBar 抽离到更高层，支持所有 action 共用，wukong-progress 需要支持自定义子任务占位符
  // 初始化 MultiBar
  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan(t('overtime.prefix')), // '加班分析' / 'Overtime'
    format: ' [:bar] :percent :payload'
  })

  const result = {}
  try {
    // 1️⃣ 拉取 Git 记录
    bar.step(5, t('analyze.step_git_fetch'))
    const { commits } = await profiler.stepAsync('getGitLogs', () =>
      getGitLogsFast(opts)
    )
    result.commits = commits

    bar.step(5, t('analyze.step_git_done'))

    const records = result.commits

    // 2️⃣ Gerrit enrich（公共）
    const enrichedRecords = opts.gerrit
      ? await resolveGerrit(records, opts)
      : records

    // 3️⃣ 加班分析（根据配置可选）
    const worktimeOptions = getWorkTimeConfig(opts)

    bar.step(5, t('analyze.step_overtime_calc'))
    result.overtime = await profiler.stepAsync('overtime', () => {
      return getWorkOvertimeStats(enrichedRecords, worktimeOptions)
    })

    bar.step(5, t('analyze.step_trends'))
    result.overtimeByWeek = await getOvertimeByWeek(enrichedRecords)
    result.overtimeByMonth = await getOvertimeByMonth(enrichedRecords)
    bar.step(10, t('analyze.step_latest_mark'))
    result.overtimeLatestCommitByDay = await getLatestCommitByDay({
      commits: enrichedRecords,
      opts: worktimeOptions
    })

    // 4️⃣ 数据输出
    bar.step(1, t('analyze.step_output'))
    const dir = opts.output.dir || path.resolve('output-wukong')
    await profiler.stepAsync('output', async () => {
      return outputData(result, {
        dir,
        worktimeOptions,
        git: opts.git || {}
      })
    })

    bar.step(100, t('analyze.step_complete'))
    console.log(
      chalk.green(`\n${t('overtime.complete')} ${resolveOutDir(dir)}\n`)
    )
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
