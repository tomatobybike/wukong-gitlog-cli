import { writeText } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'
import { renderOvertimeTab } from '../../domain/overtime/render.mjs'

export function outputOvertimeTabByPeriod(map, period, config) {
  for (const key of Object.keys(map)) {
    writeText(
      outFile(config.dir, `${period}/overtime_${config.base}_${key}.tab.txt`),
      renderOvertimeTab(map[key])
    )
  }
}
