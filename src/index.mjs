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
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      overtimeAction(finalOpts)
    })

  // # 导出（excel / csv / json）
  program
    .command('export')
    .description('export （excel / csv / json）')
    // .option('-f, --format <type>', '导出格式') // 局部参数
    .action((cmdOpts, command) => {
      // globalOpts 拿到 author, since 等
      const globalOpts = command.parent.opts()
      // 合并全局和局部参数
      const finalOpts = { ...globalOpts, ...cmdOpts }
      exportAction(finalOpts)
    })

  // # Web 服务
  program.command('serve').description('Start web server').action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      serveAction(finalOpts)
    })
  program.parse(process.argv)

  const opts = program.opts()
  console.log('✅ Cli Opts:', opts)
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  /* empty */
}
