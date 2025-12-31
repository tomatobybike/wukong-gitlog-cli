import path from 'path'
import fs from 'fs'

export function resolveOutDir(baseDir = 'output-wukong') {
  const dir = path.isAbsolute(baseDir)
    ? baseDir
    : path.resolve(process.cwd(), baseDir)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function outFile(dir, filename) {
  const full = path.join(dir, filename)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  return full
}
