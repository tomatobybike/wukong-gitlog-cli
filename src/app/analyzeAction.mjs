import ora from 'ora'
import path from 'path'
import { createProfiler } from 'wukong-profiler'

import { parseOptions } from '../cli/parseOptions.mjs'
import { getGitLogsFast } from '../domain/git/getGitLogs.mjs'
import { analyzeOvertime } from '../domain/overtime/analyze.mjs'
import { outputAll } from '../output/index.mjs'

export async function analyzeAction(rawOpts = {}) {
  const opts = parseOptions(rawOpts)
  const spinner = ora('Analyzing git commits...').start()

  const profiler = createProfiler(opts.profile)

  // 1️⃣ 拉 git 记录
  const { commits, authorMap } = await profiler.stepAsync('getGitLogs', () =>
    getGitLogsFast(opts)
  )

  const result = {
    commits,
    authorMap
  }

  // 2️⃣ 加班分析（可选）
  if (opts.overtime) {
    result.overtime = await profiler.stepAsync('overtime', () =>
      analyzeOvertime(commits, opts.worktime)
    )
  }

  // 3️⃣ 输出
  await profiler.stepAsync('output', () =>
    outputAll(result, {
      format: opts.format,
      outDir: opts.outDir || path.resolve('output-wukong')
    })
  )

  spinner.succeed('Done')
  profiler.end('analyze')

  return result
}
