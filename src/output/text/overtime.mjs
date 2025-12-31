import { writeText } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'
import {
  renderOvertimeText,
  renderOvertimeTab
} from '../../domain/overtime/render.mjs'

export function outputOvertimeText(stats, config) {
  writeText(
    outFile(config.dir, `overtime_${config.base}.txt`),
    renderOvertimeText(stats)
  )

  writeText(
    outFile(config.dir, `overtime_${config.base}.tab.txt`),
    renderOvertimeTab(stats)
  )
}
