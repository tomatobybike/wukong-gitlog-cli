#!/usr/bin/env node
import { Command } from 'commander'
import { defineOptions } from './cli/defineOptions.mjs'
import { runAnalyze } from './app/runAnalyze.mjs'
import { runServe } from './app/runServe.mjs'
import { runVersion } from './app/runVersion.mjs'

const program = new Command()

defineOptions(program)

program
  .command('analyze')
  .description('Analyze git commits')
  .action(runAnalyze)

program
  .command('serve')
  .description('Start web server')
  .action(runServe)

program
  .command('version')
  .action(runVersion)

// 默认命令
program.parse(process.argv)
if (!process.argv.slice(2).length) {
  runAnalyze(program.opts())
}
