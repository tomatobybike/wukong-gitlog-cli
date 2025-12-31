import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const getPackage = () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
  )
  return pkg
}
