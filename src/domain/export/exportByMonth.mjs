import path from 'path'

import { EXPORT_DIR_MONTH } from '#src/constants/index.mjs'
import {
  renderOvertimeCsv,
  renderOvertimeTab,
  renderOvertimeText
} from '#src/domain/overtime/overtime.mjs'
import {
  exportExcel,
  exportExcelAuthorChangeStats,
  exportExcelPerPeriodFiles,
  exportExcelPerPeriodSheets
} from '#src/output/excel.mjs'
import { writeJsonFile, writeTxtFile } from '#src/output/utils/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'
import { groupRecords } from '#utils/groupRecords.mjs'
import { logger } from '#utils/logger.mjs'

import { getWorkOvertimeStats } from '../overtime/analyze.mjs'

/**
 * @function handleExportByMonth
 * @description 按月导出
 * @param {type}
 * @returns {type} // TODO: Describe return value
 */
export const handleExportByMonth = async ({
  opts,
  records,
  worktimeOptions
}) => {
  // Always write human readable overtime text to file (default: overtime.txt)
  const outBase = opts.output.out || 'commits'
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR_MONTH}`

  // TODO: remove debug log before production
  console.log('✅', 'opts', opts)
  // 按月输出 ... 保持原逻辑
  const perPeriodFormats = opts.output.perPeriod.formats
  try {
    const monthGroups = groupRecords(records, 'month')
    const monthlyFileName = `overtime_${outBase}_monthly.txt`

    let monthlyContent = ''
    const monthKeys = Object.keys(monthGroups).sort()
    monthKeys.forEach((k) => {
      const groupRecs = monthGroups[k]
      const s = getWorkOvertimeStats(groupRecs, worktimeOptions)
      monthlyContent += `===== ${k} =====\n`
      monthlyContent += `${renderOvertimeText(s)}\n\n`
      // Also write a single file per month under 'month/' folder
      try {
        const perMonthFileName = `month/overtime_${outBase}_${k}.txt`
        // const perMonthFile = outFile(perMonthFileName, outDir)
        // writeTextFile(perMonthFile, renderOvertimeText(s))
        writeTxtFile(baseDir, perMonthFileName, renderOvertimeText(s))
        logger.info(`Overtime 月度(${k}) 已导出: ${perMonthFileName}`)
        // per-period CSV / Tab format (按需生成)
        if (perPeriodFormats.includes('csv')) {
          try {
            const perMonthCsvName = `month/overtime_${outBase}_${k}.csv`
            // writeTextFile(
            //   outFile(perMonthCsvName, outDir),
            //   renderOvertimeCsv(s)
            // )
            writeTxtFile(baseDir, perMonthCsvName, renderOvertimeCsv(s))

            logger.info(`Overtime 月度(CSV)(${k}) 已导出: ${perMonthCsvName}`)
          } catch (err) {
            console.warn(
              `Write monthly CSV for ${k} failed:`,
              err && err.message ? err.message : err
            )
          }
        }
        if (perPeriodFormats.includes('tab')) {
          try {
            const perMonthTabName = `month/overtime_${outBase}_${k}.tab.txt`
            // writeTextFile(
            //   outFile(perMonthTabName, outDir),
            //   renderOvertimeTab(s)
            // )
            writeTxtFile(baseDir, perMonthTabName, renderOvertimeTab(s))

            logger.info(`Overtime 月度(Tab)(${k}) 已导出: ${perMonthTabName}`)
          } catch (err) {
            console.warn(
              `Write monthly Tab for ${k} failed:`,
              err && err.message ? err.message : err
            )
          }
        }
      } catch (err) {
        console.warn(
          `Write monthly file for ${k} failed:`,
          err && err.message ? err.message : err
        )
      }
    })
    if (!opts.perPeriodOnly) {
      // writeTextFile(monthlyFile, monthlyContent)
      writeTxtFile(baseDir, monthlyFileName, monthlyContent)
      logger.info(`Overtime 月度汇总 已导出: ${monthlyFileName}`)
    }
    // per-period Excel (sheets or files)
    if (perPeriodFormats.includes('xlsx')) {
      const perPeriodExcelMode = String(opts.perPeriodExcelMode || 'sheets')
      if (perPeriodExcelMode === 'sheets') {
        try {
          const monthXlsxName = `overtime_${outBase}_monthly.xlsx`
          const monthXlsxFile = outFile(baseDir, monthXlsxName)
          await exportExcelPerPeriodSheets(monthGroups, monthXlsxFile, {
            stats: opts.stats,
            gerrit: opts.gerrit
          })
          logger.info(`Overtime 月度(XLSX) 已导出: ${monthXlsxFile}`)
        } catch (err) {
          console.warn(
            'Export month XLSX (sheets) failed:',
            err && err.message ? err.message : err
          )
        }
      } else {
        try {
          const monthKeys2 = Object.keys(monthGroups).sort()
          const tasks = monthKeys2.map((k2) => {
            const perMonthXlsxName = `overtime_${outBase}_${k2}.xlsx`
            const perMonthXlsxFile = outFile(baseDir, perMonthXlsxName)
            return exportExcel(monthGroups[k2], null, {
              file: perMonthXlsxFile,
              stats: opts.stats,
              gerrit: opts.gerrit
            }).then(() =>
              console.log(
                chalk.green(
                  `Overtime 月度(XLSX)(${k2}) 已导出: ${perMonthXlsxFile}`
                )
              )
            )
          })
          await Promise.all(tasks)
        } catch (err) {
          console.warn(
            'Export monthly XLSX files failed:',
            err && err.message ? err.message : err
          )
        }
      }
    }
  } catch (err) {
    console.warn(
      'Generate monthly overtime failed:',
      err && err.message ? err.message : err
    )
  }
}
