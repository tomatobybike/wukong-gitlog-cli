import path from 'path'

import { exportExcelPerPeriodSheets , exportExcel } from '../excel.mjs'

export async function outputOvertimeExcelPerPeriod(map, period, config) {
  if (config.mode === 'sheets') {
    await exportExcelPerPeriodSheets(
      map,
      path.join(config.dir, `${period}/overtime_${config.base}.xlsx`)
    )
    return
  }

  // files 模式
  for (const key of Object.keys(map)) {
    // eslint-disable-next-line no-await-in-loop
    await exportExcel(map[key], null, {
      file: path.join(
        config.dir,
        `${period}/overtime_${config.base}_${key}.xlsx`
      )
    })
  }
}
