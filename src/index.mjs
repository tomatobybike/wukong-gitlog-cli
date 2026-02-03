#!/usr/bin/env node
import { Command } from 'commander'

import { runGitPreflight } from '#src/domain/git/index.mjs'

import { analyzeAction } from './app/analyzeAction.mjs'
import { exportAction } from './app/exportAction.mjs'
// import { initAction } from './app/initAction.mjs'
import { initActionWithTemp as initAction } from './app/initActionWithTemp.mjs'
import { journalAction } from './app/journalAction.mjs'
import { overtimeAction } from './app/overtimeAction.mjs'
import { serveAction } from './app/serveAction.mjs'
import { versionAction } from './app/versionAction.mjs'
import { defineOptions } from './cli/defineOptions.mjs'
import { loadRcConfig } from './infra/configStore.mjs'

// 引入加载器

const main = async () => {
  await runGitPreflight()
  // 【关键优化】在一切开始前，先异步加载 RC 配置
  // 这样后续 parseOptions 内部的 cachedConfig 就有值了
  await loadRcConfig()
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

  program
    .command('init')
    .description('在当前目录初始化 .wukonggitlogrc.yml 配置文件模板')
    .option('-f, --force', '强制覆盖已存在的配置文件（慎用）') // 生产工具建议加个强制参数
    .action(async (options) => {
      // 如果你不想抽离到 app 层，也可以直接写这里
      // 但推荐抽离以保持架构一致性
      await initAction(options)
    })

  // # 核心分析（默认） 分析 git 提交记录
  program
    .command('analyze')
    .description('Analyze git commits')
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      analyzeAction(finalOpts)
    })

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
    .description('Export （excel / csv / json）')
    // .option('-f, --format <type>', '导出格式') // 局部参数
    .action((cmdOpts, command) => {
      // globalOpts 拿到 author, since 等
      const globalOpts = command.parent.opts()
      // 合并全局和局部参数
      const finalOpts = { ...globalOpts, ...cmdOpts }
      exportAction(finalOpts)
    })

  // # 每日 日报
  program
    .command('journal')
    .description('Export daily journal')
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      journalAction(finalOpts)
    })

  // # Web 服务
  program
    .command('serve')
    .description('Start web server')
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      serveAction(finalOpts)
    })

  program.parse(process.argv)

  // const opts = program.opts()
  // console.log('✅ Cli Opts:', opts)
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  /* empty */
}
