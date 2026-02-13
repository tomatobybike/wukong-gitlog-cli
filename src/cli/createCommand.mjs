export function createCommand(program, {
  name,
  description,
  optionsBuilder,
  handler,
  autoUpdate
}) {
  const cmd = program.command(name).description(description)

  // 注入 options
  if (optionsBuilder) {
    optionsBuilder(cmd)
  }

  cmd.action(async (cmdOpts, command) => {
    const globalOpts = command.parent?.opts?.() || {}
    const finalOpts = { ...globalOpts, ...cmdOpts }

    try {
      await handler(finalOpts)
    } finally {
      if (autoUpdate) {
        // 不阻塞 CLI
        autoUpdate().catch(() => {})
      }
    }
  })

  return cmd
}
