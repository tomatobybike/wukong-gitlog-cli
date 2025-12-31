#!/usr/bin/env node
import { Command } from 'commander'

import { analyzeAction } from './app/analyzeAction.mjs'
import { exportAction } from './app/exportAction.mjs'
import { overtimeAction } from './app/overtimeAction.mjs'
import { serveAction } from './app/serveAction.mjs'
import { versionAction } from './app/versionAction.mjs'
import { defineOptions } from './cli/defineOptions.mjs'

const main = async () => {
  const program = new Command()

  // 1. 先定义配置，以便能通过 program.opts() 获取解析结果
  defineOptions(program)

  // 2. 【关键】手动调用 parseOptions 或简单解析
  // 我们不直接 parse(process.argv)，而是先检查基础参数
  const args = process.argv.slice(2)

  if (args.includes('--version')) {
    await versionAction()
    process.exit(0) // 彻底拦截，不走后面的子命令逻辑
  }

  // 3. 注册子命令
  // # 核心分析（默认）
  program
    .command('analyze')
    .description('Analyze git commits')
    .action(analyzeAction)

  // # 加班文化分析
  program
    .command('overtime')
    .description('Analysis of Overtime Culture')
    .action(overtimeAction)

  // # 导出（excel / csv / json）
  program
    .command('export')
    .description('export （excel / csv / json）')
    .action(exportAction)

  // # Web 服务
  program.command('serve').description('Start web server').action(serveAction)
  program.parse(process.argv)

  const opts = program.opts()
  console.log('✅ Global Opts:', opts)
  // 默认行为：如果没有任何参数，显示帮助
  // if (process.argv.length === 2) {
  //   program.help()
  // }

  // await program.parseAsync(process.argv)
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  /* empty */
}
