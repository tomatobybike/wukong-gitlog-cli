import { outFile } from './outputPath.mjs'
import { writeJson, writeText } from './writeFile.mjs'

/* ---------------- helpers ---------------- */

export function writeJsonFile(dir, name, data) {
  writeJson(outFile(dir, name), data)
  return name
}

export function writeTxtFile(dir, name, data) {
  writeText(outFile(dir, name), data)
  return name
}
