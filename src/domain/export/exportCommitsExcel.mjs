import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import {
  exportExcel,
  exportExcelAuthorChangeStats,
  exportExcelPerPeriodFiles,
  exportExcelPerPeriodSheets
} from '#src/output/excel.mjs'
import { renderText } from '#src/output/text.mjs'
import { writeTxtFile } from '#src/output/utils/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'

/**
 * @function handleExportCommitsExcel
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportCommitsExcel = async ({
  opts,
  records,
  fileName,
  groups
}) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  try {
    const excelFile = fileName || 'commits.xlsx'

    const excelPath = outFile(baseDir, excelFile)

    await exportExcel(records, groups, {
      file: excelPath,
      stats: opts.stats,
      gerrit: opts.gerrit
    })
  } catch (err) {
    console.warn(
      'handleExportCommitsExcel failed:',
      err && err.message ? err.message : err
    )
  }
}
