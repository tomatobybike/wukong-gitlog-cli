import chalk from 'chalk'
import path from 'path'
import { createProfiler } from 'wukong-profiler'
import { createMultiBar } from 'wukong-progress'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getAuthorChangeStats } from '../domain/author/analyze.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
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
  const profiler = createProfiler({ ...opts.profile })

  // 未来 可考虑将 MultiBar 抽离到更高层，支持所有 action 共用，wukong-progress 需要支持自定义子任务占位符
  // 初始化 MultiBar
  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Analyze'),
    format: ' [:bar] :percent :current/:total'
  })

  // 辅助函数：内部更新进度并修改描述文字
  const step = (tickValue, taskName) => {
    bar.state.prefix =
      chalk.cyan('Analyze') + chalk.green(` [${taskName}]`)
    bar.tick(tickValue)
  }
  const result = {}

  try {
    // 1️⃣ 拉取 Git 记录
    step(5, '正在提取 Git 提交记录...')
    const { commits, authorMap } = await profiler.stepAsync('getGitLogs', () =>
      getGitLogsFast(opts)
    )
    result.commits = commits
    result.authorMap = authorMap
    step(15, 'Git 记录提取完成')

    // 2️⃣ 分析作者变更
    step(10, '正在分析作者代码贡献...')
    const authorChanges = await profiler.stepAsync(
      'analyzeAuthorChanges',
      () => {
        return getAuthorChangeStats(commits)
      }
    )
    result.authorChanges = authorChanges

    // 3️⃣ 加班分析（根据配置可选）
    if (opts.overtime) {
      const worktimeOptions = getWorkTimeConfig(opts)

      step(10, '正在计算加班概况...')
      result.overtime = await profiler.stepAsync('overtime', () => {
        return getWorkOvertimeStats(commits, worktimeOptions)
      })

      step(20, '正在生成周/月趋势数据...')
      result.overtimeByWeek = await getOvertimeByWeek(commits)
      result.overtimeByMonth = await getOvertimeByMonth(commits)

      step(20, '正在标记每日最晚提交点...')
      result.overtimeLatestCommitByDay = await getLatestCommitByDay({
        commits,
        opts: worktimeOptions
      })
    } else {
      step(50, '跳过加班数据分析')
    }

    // 4️⃣ 数据输出
    step(10, '正在持久化分析结果...')
    await profiler.stepAsync('output', async () => {
      const worktimeOptions = getWorkTimeConfig(opts)
      await outputData(result, {
        dir: opts.outDir || path.resolve('output-wukong'),
        worktimeOptions
      })
    })

    step(10, '分析任务全部完成！')
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
