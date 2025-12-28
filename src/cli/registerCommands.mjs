import path from 'path'

export function registerCommands(program, deps) {
  const {
    getGitLogsFast,
    createOvertimeStats,
    handleServe,
    runOvertime,
    parseOptions,
    startServer
  } = deps

  // Serve subcommand
  program
    .command('serve')
    .description('Export data modules and start a local web server to view stats')
    .option('--port <n>', '本地 web 服务端口（默认 3000）', (v) => parseInt(v, 10), 3000)
    .option('--out-dir <dir>', '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output-wukong`')
    .option('--out-parent', '将输出目录放到当前工程的父目录的 `output-wukong/`（等同于 `--out-dir ../output-wukong`）')
    .option('--only', '仅启动 web 服务，不导出或分析数据（使用 output-wukong/data 中已有的数据）')
    .action(async function serveAction(cmdOpts) {
      const rootOpts = this.parent.opts()
      const opts = { ...rootOpts, ...cmdOpts }
      const config = parseOptions(opts)
      const getOvertimeStats = createOvertimeStats(config)

      const outDir = opts.outParent
        ? path.resolve(process.cwd(), '..', 'output-wukong')
        : opts.outDir || undefined

      if (cmdOpts.only) {
        try {
          await startServer(cmdOpts.port || 3000, outDir)
        } catch (err) {
          console.warn('Start server failed:', err && err.message ? err.message : err)
          process.exit(1)
        }
        return
      }

      // fetch logs, export data modules and start server
      const spinner = deps.ora ? deps.ora('Loading...').start() : null

      try {
        const gitCommits = await getGitLogsFast(opts)
        const { commits: records } = gitCommits
        await handleServe({ opts, outDir, records, getOvertimeStats })
      } finally {
        if (spinner) spinner.stop()
      }
    })

  // Overtime subcommand
  program
    .command('overtime')
    .description('Analyze overtime statistics and export results')
    .option('--out-dir <dir>', '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output-wukong`')
    .option('--out-parent', '将输出目录放到当前工程的父目录的 `output-wukong/`（等同于 `--out-dir ../output-wukong`）')
    .action(async function overtimeAction(cmdOpts) {
      const rootOpts = this.parent.opts()
      const opts = { ...rootOpts, ...cmdOpts }
      const config = parseOptions(opts)
      const getOvertimeStats = createOvertimeStats(config)
      const outDir = opts.outParent
        ? path.resolve(process.cwd(), '..', 'output-wukong')
        : opts.outDir || undefined

      const spinner = deps.ora ? deps.ora('Loading...').start() : null
      try {
        const gitCommits = await getGitLogsFast(opts)
        const { commits: records, authorMap } = gitCommits
        await runOvertime({ opts, outDir, records, authorMap, getOvertimeStats, deps })
      } finally {
        if (spinner) spinner.stop()
      }
    })

  return program
}
