export function resolveBool(cli, config, def = false) {
  if (cli !== undefined) return cli
  if (config !== undefined) return config
  return def
}

export function resolveValue(cli, config, def) {
  if (cli !== undefined) return cli
  if (config !== undefined) return config
  return def
}
