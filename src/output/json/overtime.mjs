import { writeJson } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'

export function outputOvertimeJson(stats, config) {
  writeJson(
    outFile(config.dir, `overtime_${config.base}.json`),
    stats
  )
}
