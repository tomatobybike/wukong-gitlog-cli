import { outputOvertimeCsvByPeriod } from './csv/overtime.mjs'
import { writeServeData, writeServeDataMjs } from './data/writeData.mjs'
import { outputCommitsExcel } from './excel/commits.mjs'
import { outputOvertimeExcelPerPeriod } from './excel/perPeriod.mjs'
import { outputOvertimeJson } from './json/overtime.mjs'
import { outputOvertimeTabByPeriod } from './tab/overtime.mjs'
import { outputCommitsText } from './text/commits.mjs'
import { outputOvertimeText } from './text/overtime.mjs'
import { resolveOutDir } from './utils/outputPath.mjs'

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
      outputOvertimeCsvByPeriod(result.overtimeByMonth, 'month', { dir, base })
    }

    if (config.perPeriod.formats.includes('tab')) {
      outputOvertimeTabByPeriod(result.overtimeByMonth, 'month', { dir, base })
    }

    if (config.perPeriod.formats.includes('xlsx')) {
      await outputOvertimeExcelPerPeriod(result.overtimeByMonth, 'month', {
        dir,
        base,
        mode: config.perPeriod.excelMode
      })
    }
  }
}

export async function outputData(result, config) {
  const dir = resolveOutDir(config.dir)

  /* ---------- serve data（永远写） ---------- */
  writeServeDataMjs(result, { dir, worktimeOptions: config.worktimeOptions })
}
