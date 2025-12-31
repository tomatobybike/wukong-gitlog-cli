import { writeText } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'
import { renderOvertimeCsv } from '../../domain/overtime/render.mjs'

export function outputOvertimeCsvByPeriod(map, period, config) {
  for (const key of Object.keys(map)) {
    writeText(
      outFile(config.dir, `${period}/overtime_${config.base}_${key}.csv`),
      renderOvertimeCsv(map[key])
    )
  }
}
