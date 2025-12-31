import { resolveOutDir } from './utils/outputPath.mjs'
import { writeServeData } from './data/writeData.mjs'

import { outputCommitsText } from './text/commits.mjs'
import { outputCommitsExcel } from './excel/commits.mjs'
import { outputOvertimeText } from './text/overtime.mjs'
import { outputOvertimeJson } from './json/overtime.mjs'
import { outputOvertimeCsvByPeriod } from './csv/overtime.mjs'
import { outputOvertimeTabByPeriod } from './tab/overtime.mjs'
import { outputOvertimeExcelPerPeriod } from './excel/perPeriod.mjs'

export async function outputAll(result, config) {
  const dir = resolveOutDir(config.dir)
  const base = config.base || 'commits'

  /* ---------- serve data（永远写） ---------- */
  writeServeData(result, { dir })

  /* ---------- 人类可读输出 ---------- */
  if (config.formats.includes('text')) {
    outputCommitsText(result, { dir })
  }

  if (config.formats.includes('excel')) {
    await outputCommitsExcel(result, { dir })
  }

  if (!result.overtime) return

  outputOvertimeText(result.overtime, { dir, base })

  if (config.formats.includes('json')) {
    outputOvertimeJson(result.overtime, { dir, base })
  }

  if (result.overtimeByMonth) {
    if (config.perPeriod.formats.includes('csv')) {
      outputOvertimeCsvByPeriod(
        result.overtimeByMonth,
        'month',
        { dir, base }
      )
    }

    if (config.perPeriod.formats.includes('tab')) {
      outputOvertimeTabByPeriod(
        result.overtimeByMonth,
        'month',
        { dir, base }
      )
    }

    if (config.perPeriod.formats.includes('xlsx')) {
      await outputOvertimeExcelPerPeriod(
        result.overtimeByMonth,
        'month',
        { dir, base, mode: config.perPeriod.excelMode }
      )
    }
  }
}
