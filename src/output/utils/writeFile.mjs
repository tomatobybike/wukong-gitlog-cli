import fs from 'fs'

export function writeText(file, content) {
  fs.writeFileSync(file, content, 'utf8')
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}
