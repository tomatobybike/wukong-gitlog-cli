#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { runGitPreflight, showGitInfo } from '#src/domain/git/index.mjs'

import { analyzeAction } from './app/analyzeAction.mjs'
import { exportAction } from './app/exportAction.mjs'
// import { initAction } from './app/initAction.mjs'
import { initActionWithTemp as initAction } from './app/initActionWithTemp.mjs'
import { journalAction } from './app/journalAction.mjs'
import { overtimeAction } from './app/overtimeAction.mjs'
import { serveAction } from './app/serveAction.mjs'
import { versionAction } from './app/versionAction.mjs'
import { createCommand } from './cli/createCommand.mjs'
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
import { checkUpdateWithPatch } from './utils/checkUpdate.mjs'

// 引入加载器

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pkgPath = path.resolve(__dirname, '../package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const autoCheckUpdate = async () => {
  // 避免 CI 打印更新提示
  if (process.env.CI) return
  // CLI 更新提示只在 global 安装时出现
  if (process.env.npm_config_global !== 'true') return
  if (!process.stdout.isTTY) return

  // === CLI 主逻辑完成后提示更新 ===
  // await checkUpdateWithPatch({
  //   pkg: {
  //     name: pkg.name,
  //     version: pkg.version
  //   },
  //   // force:true
  // })
  
  // 放到下一个 tick
  setTimeout(() => {
    checkUpdateWithPatch({ pkg }).catch(() => {})
  }, 0)
}

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

  // ---------------------------------------------------------
  // 2. 环境准备
  // ---------------------------------------------------------
  const gitPreflightResult = await runGitPreflight()
  if (args.includes('--info') || args.includes('-i')) {
    console.log(`✔ Language: ${finalLang}`)
    await showGitInfo(gitPreflightResult)
  }
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

  createCommand(program, {
    name: 'init',
    description: t('cmds.init'),
    optionsBuilder: (cmd) => {
      cmd.option('-f, --force', t('options.force'))
    },
    handler: initAction,
    autoUpdate: autoCheckUpdate
  })

  // # 命令: Analyze 核心分析（默认） 分析 git 提交记录 (最全参数)
  createCommand(program, {
    name: 'analyze',
    description: t('cmds.analyze'),
    optionsBuilder: (cmd) => {
      addGitSourceOptions(cmd)
      addAnalysisOptions(cmd)
      addOutputOptions(cmd)
      addPerformanceOptions(cmd)
    },
    handler: analyzeAction,
    autoUpdate: autoCheckUpdate
  })

  // # 命令: Overtime 加班文化分析
  createCommand(program, {
    name: 'overtime',
    description: t('cmds.overtime'),
    optionsBuilder: (cmd) => {
      addGitSourceOptions(cmd)
      addAnalysisOptions(cmd)
    },
    handler: overtimeAction,
    autoUpdate: autoCheckUpdate
  })

  // # 命令: Export (专注导出) 导出（excel / csv / json）
  createCommand(program, {
    name: 'export',
    description: t('cmds.export'),
    optionsBuilder: (cmd) => {
      addGitSourceOptions(cmd)
      addOutputOptions(cmd)
    },
    handler: exportAction,
    autoUpdate: autoCheckUpdate
  })

  // === 命令: Journal (日报) ===
  createCommand(program, {
    name: 'journal',
    description: t('cmds.journal'),
    optionsBuilder: (cmd) => {
      addGitSourceOptions(cmd)
      addPerformanceOptions(cmd)
    },
    handler: journalAction,
    autoUpdate: autoCheckUpdate
  })

  // === 命令: Serve (Web服务) ===
  createCommand(program, {
    name: 'serve',
    description: 'Start web server',
    optionsBuilder: (cmd) => {
      addServeOptions(cmd)
    },
    handler: serveAction,
    autoUpdate: autoCheckUpdate
  })

  await program.parseAsync(process.argv)

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
