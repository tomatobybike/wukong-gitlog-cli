import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

let cachedConfig = {}

const RC_FILES = [
  '.wukonggitlogrc',
  '.wukonggitlogrc.yml',
  '.wukonggitlogrc.json'
]

export function loadRcConfig(cwd = process.cwd()) {
  for (const name of RC_FILES) {
    const file = path.join(cwd, name)
    // eslint-disable-next-line no-continue
    if (!fs.existsSync(file)) continue

    const raw = fs.readFileSync(file, 'utf8')
    const config =
      name.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw)

    cachedConfig = config || {}
    return cachedConfig
  }
  return {}
}

export function getRcConfig() {
  return cachedConfig
}
