/**
 * @file: exportAction.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:27
 */
import chalk from 'chalk'
import { createMultiBar } from 'wukong-progress'

import { parseOptions } from '../cli/parseOptions.mjs'

export async function exportAction(rawOpts = {}) {
  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Build'),
    format: 'Build [:bar] :percent'
  })

  bar.tick(10)
  const opts = await parseOptions(rawOpts)
  bar.tick(100)

  mb.stop()
  // 结束进度条
}
