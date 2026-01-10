import path from 'path'

import { EXPORT_DIR_WEEK } from '#src/constants/index.mjs'
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
 * @function handleExportAuthorChanges
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportAuthorChanges = async ({
  opts,
  records,
  worktimeOptions
}) => {
  // Always write human readable overtime text to file (default: overtime.txt)
  const outBase = opts.output.out || 'commits'
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR_WEEK}`

  // TODO: remove debug log before production
  console.log('✅', 'opts', opts)

  try {
    const weekGroups = groupRecords(records, 'week')
    const weeklyFileName = `overtime_${outBase}_weekly.txt`
    // const weeklyFile = outputFilePath(weeklyFileName, outDir)
    let weeklyContent = ''
    const weekKeys = Object.keys(weekGroups).sort()
    weekKeys.forEach((k) => {
      const groupRecs = weekGroups[k]
      const s = getWorkOvertimeStats(groupRecs, worktimeOptions)
      weeklyContent += `===== ${k} =====\n`
      weeklyContent += `${renderOvertimeText(s)}\n\n`
      try {
        const perWeekFileName = `week/overtime_${outBase}_${k}.txt`
        // const perWeekFile = outputFilePath(perWeekFileName, outDir)
        // writeTextFile(perWeekFile, renderOvertimeText(s))
        writeTxtFile(baseDir, perWeekFileName, renderOvertimeText(s))

        // console.log(chalk.green(`Overtime 周度(${k}) 已导出: ${perWeekFile}`))
        logger.info(`Overtime 周度(${k}) 已导出: ${perWeekFileName}`)

        // eslint-disable-next-line no-shadow
        const perPeriodFormats = String(opts.perPeriodFormats || '')
          .split(',')
          // eslint-disable-next-line no-shadow
          .map((s) =>
            String(s || '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
        if (perPeriodFormats.includes('csv')) {
          try {
            const perWeekCsvName = `week/overtime_${outBase}_${k}.csv`
            // writeTextFile(
            //   outputFilePath(perWeekCsvName, outDir),
            //   renderOvertimeCsv(s)
            // )
            writeTxtFile(baseDir, perWeekCsvName, renderOvertimeCsv(s))

            logger.info(`Overtime 周度(CSV)(${k}) 已导出: ${perWeekCsvName}`)
          } catch (err) {
            console.warn(
              `Write weekly CSV for ${k} failed:`,
              err && err.message ? err.message : err
            )
          }
        }
        if (perPeriodFormats.includes('tab')) {
          try {
            const perWeekTabName = `week/overtime_${outBase}_${k}.tab.txt`
            // writeTextFile(
            //   outputFilePath(perWeekTabName, outDir),
            //   renderOvertimeTab(s)
            // )
            writeTxtFile(baseDir, perWeekTabName, renderOvertimeTab(s))

            logger.info(`Overtime 周度(Tab)(${k}) 已导出: ${perWeekTabName}`)
          } catch (err) {
            console.warn(
              `Write weekly Tab for ${k} failed:`,
              err && err.message ? err.message : err
            )
          }
        }
      } catch (err) {
        console.warn(
          `Write weekly file for ${k} failed:`,
          err && err.message ? err.message : err
        )
      }
    })
    // writeTextFile(weeklyFile, weeklyContent)
    writeTxtFile(baseDir, weeklyFileName, weeklyContent)

    logger.info(`Overtime 周度汇总 已导出: ${weeklyFileName}`)
  } catch (err) {
    console.warn(
      'Generate weekly overtime failed:',
      err && err.message ? err.message : err
    )
  }
}
