import chalk from 'chalk'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { getProfileDirFile } from '#utils/getProfileDirFile.mjs'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getAuthorChangeStats } from '../domain/author/analyze.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { resolveGerrit } from '../domain/git/resolveGerrit.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import { outputAll, outputData } from '../output/index.mjs'
import {
  getLatestCommitByDay,
  getOvertimeByMonth,
  getOvertimeByWeek,
  getWorkTimeConfig
} from './helpers.mjs'

// 建议将辅助计算函数抽离，保持主逻辑清晰

export async function analyzeAction(rawOpts = {}) {
  const opts = await parseOptions(rawOpts)

  const traceFile = getProfileDirFile('trace.json', opts)
  const profileFile = getProfileDirFile('profile.json', opts)
  // FIXME: remove debug log before production
  console.log('❌', 'traceFile', traceFile);
  console.log('❌', 'profileFile', profileFile);
  const profiler = createProfiler({ ...opts.profile,enabled:true, traceFile, profileFile })

  // 未来 可考虑将 MultiBar 抽离到更高层，支持所有 action 共用，wukong-progress 需要支持自定义子任务占位符
  // 初始化 MultiBar
  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Analyze'),
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
    result.authorMap = authorMap
    bar.step(15, 'Git 记录提取完成')

    const records = result.commits

    // 2️⃣ Gerrit enrich（公共）
    const enrichedRecords = opts.gerrit
      ? await resolveGerrit(records, opts)
      : records

    // 2️⃣ 分析作者变更
    bar.step(10, '正在分析作者代码贡献...')
    const authorChanges = await profiler.stepAsync(
      'analyzeAuthorChanges',
      () => {
        return getAuthorChangeStats(enrichedRecords)
      }
    )
    result.authorChanges = authorChanges

    // 3️⃣ 加班分析（根据配置可选）
    if (opts.overtime) {
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
    } else {
      bar.step(50, '跳过加班数据分析')
    }

    // 4️⃣ 数据输出
    bar.step(10, '正在持久化分析结果...')
    await profiler.stepAsync('output', async () => {
      const worktimeOptions = getWorkTimeConfig(opts)
      await outputData(result, {
        dir: opts.output.dir || path.resolve('output-wukong'),
        worktimeOptions
      })
    })

    bar.step(100, '分析任务全部完成！')
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
