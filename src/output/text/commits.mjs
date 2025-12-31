import { writeText } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'
import { renderText } from '../../text.mjs' // 复用你原来的

export function outputCommitsText(result, config) {
  const file = outFile(config.dir, config.file || 'commits.txt')
  writeText(file, renderText(result.records))
}
