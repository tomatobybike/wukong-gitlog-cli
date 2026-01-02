import ora from 'ora'
import path from 'path'
import { start } from 'repl'
import { createProfiler } from 'wukong-profiler'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getAuthorChangeStats } from '../domain/author/analyze.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { getWorkOvertimeStats } from '../domain/overtime/analyze.mjs'
import { outputAll, outputData } from '../output/index.mjs'

export async function analyzeAction(rawOpts = {}) {
  const opts = await parseOptions(rawOpts)
  // TODO: remove debug log before production
  // console.log('✅', 'rawOpts', rawOpts);
  console.log('✅', 'opts.profile', opts.profile)
  const spinner = ora('Analyzing git commits...').start()

  const profiler = createProfiler({
    ...opts.profile
  })

  // 1️⃣ 拉 git 记录
  const { commits, authorMap } = await profiler.stepAsync('getGitLogs', () =>
    getGitLogsFast(opts)
  )

  const { authorChanges } = await profiler.stepAsync(
    'analyzeAuthorChanges',
    () => {
      // 分析作者变更统计
      const result = getAuthorChangeStats(commits)
      return { authorChanges: result }
    }
  )

  const result = {
    commits,
    authorMap,
    authorChanges
  }

  // TODO: remove debug log before production
  console.log(' 🟢', 'opts', opts)
  // 2️⃣ 加班分析（可选）
  if (opts.overtime) {
    result.overtime = await profiler.stepAsync('overtime', () => {
      // startHour = 9, endHour = 18, lunchStart = 12, lunchEnd = 14, country = 'CN'
      const options = {
        startHour: opts.worktime.start,
        endHour: opts.worktime.end,
        lunchStart: opts.worktime.lunch.start,
        lunchEnd: opts.worktime.lunch.end,
        country: opts.worktime.country
      }
      return getWorkOvertimeStats(commits, options)
    })
  }

  // 3️⃣ 输出
  await profiler.stepAsync('output', () => {
    outputData(result, {
      dir: opts.outDir || path.resolve('output-wukong')
    })
  })

  profiler.end('analyze')
  spinner.succeed('Done')
  return result
}
