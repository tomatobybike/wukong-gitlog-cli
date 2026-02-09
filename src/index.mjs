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
import {
  addAnalysisOptions,
  addGitSourceOptions,
  addOutputOptions,
  addPerformanceOptions,
  addServeOptions,
  setupBaseProgram
} from './cli/defineOptions.mjs'
import { initI18n, t } from './i18n/index.mjs'
import { loadRcConfig } from './infra/configStore.mjs'

// 引入加载器

const main = async () => {
  // --- 第一步：参数预检 (Pre-flight) ---
  const args = process.argv.slice(2)

  // 1. 快速提取 --lang 参数（不依赖 Commander，避免混乱）
  const langArgIndex = args.findIndex((a) => a === '--lang' || a === '-l')
  const userLang = langArgIndex !== -1 ? args[langArgIndex + 1] : null

  // 初始化字典
  // 2. 初始化 i18n（如果有 --lang 用 --lang，没有则内部调 osLocale）
  // 这一步必须在定义子命令描述之前完成！
  const finalLang = await initI18n(userLang)

  console.log(`[i18n] Language: ${finalLang}`)

  // ---------------------------------------------------------
  // 2. 环境准备
  // ---------------------------------------------------------
  await runGitPreflight()
  // 【关键优化】在一切开始前，先异步加载 RC 配置
  // 这样后续 parseOptions 内部的 cachedConfig 就有值了
  await loadRcConfig()

  // 拦截 --version 自定义逻辑
  if (args.includes('--version')) {
    await versionAction()
    process.exit(0) // 彻底拦截，不走后面的子命令逻辑
  }

  // ---------------------------------------------------------
  // 3. 定义 CLI 结构
  // ---------------------------------------------------------
  const program = new Command()

  // A. 挂载基础信息 (name, version, --lang, --debug)
  setupBaseProgram(program)

  // B. 注册子命令：按需组合参数模块

  // === 命令: Init ===

  program
    .command('init')
    .description(t('cmds.init'))
    .option('-f, --force', t('options.force'))
    .action(async (options) => {
      // 如果你不想抽离到 app 层，也可以直接写这里
      // 但推荐抽离以保持架构一致性
      await initAction(options)
    })

  // # 命令: Analyze 核心分析（默认） 分析 git 提交记录 (最全参数)
  const analyzeCmd = program
    .command('analyze')
    .description(t('cmds.analyze'))
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      analyzeAction(finalOpts)
    })

  // 挂载 analyze 需要的参数组
  addGitSourceOptions(analyzeCmd)
  addAnalysisOptions(analyzeCmd)
  addOutputOptions(analyzeCmd)
  addPerformanceOptions(analyzeCmd)

  // # 命令: Overtime 加班文化分析
  const overtimeCmd = program
    .command('overtime')
    .description(t('cmds.overtime'))
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      overtimeAction(finalOpts)
    })
  addGitSourceOptions(overtimeCmd)
  addAnalysisOptions(overtimeCmd) // 加班分析肯定需要上班时间配置

  // # 命令: Export (专注导出) 导出（excel / csv / json）
  const exportCmd = program
    .command('export')
    .description(t('cmds.export'))
    // .option('-f, --format <type>', '导出格式') // 局部参数
    .action((cmdOpts, command) => {
      // globalOpts 拿到 author, since 等
      const globalOpts = command.parent.opts()
      // 合并全局和局部参数
      const finalOpts = { ...globalOpts, ...cmdOpts }
      exportAction(finalOpts)
    })
  addGitSourceOptions(exportCmd)
  addOutputOptions(exportCmd)

  // === 命令: Journal (日报) ===
  const journalCmd = program
    .command('journal')
    .description(t('cmds.journal'))
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      journalAction(finalOpts)
    })

  addGitSourceOptions(journalCmd)

  addPerformanceOptions(journalCmd)


  // === 命令: Serve (Web服务) ===
  const serveCmd = program
    .command('serve')
    .description('Start web server')
    .action((cmdOpts) => {
      const globalOpts = program.opts()
      const finalOpts = { ...globalOpts, ...cmdOpts }
      serveAction(finalOpts)
    })
  // Serve 命令只需要端口，不需要 Git 作者之类的参数
  addServeOptions(serveCmd)
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
