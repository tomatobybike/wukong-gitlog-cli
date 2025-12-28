import chalk from 'chalk'
import path from 'path'

export async function runOvertime({
  opts,
  outDir,
  records,
  authorMap,
  getOvertimeStats,
  deps
}) {
  const {
    renderOvertimeCsv,
    renderOvertimeTab,
    renderOvertimeText,
    renderAuthorMapText,
    writeTextFile,
    writeJSON,
    logDev,
    groupRecords,
    outputFilePath,
    exportExcelPerPeriodSheets,
    exportExcel
  } = deps

  // Ensure stats computed and cached
  await getOvertimeStats(records)
  const stats = getOvertimeStats(records)

    // Output to console
    console.log('\n--- Overtime analysis ---\n')
    console.log(renderOvertimeText(stats))

    const authorMapText = renderAuthorMapText(authorMap)
    console.log('\n Developers:\n', authorMapText, '\n')
    writeTextFile(outputFilePath('authors.text', outDir), authorMapText)

    // if user requested json format, write stats to file
    if (opts.json || opts.format === 'json') {
      const file = opts.out || 'overtime.json'
      const filepath = outputFilePath(file, outDir)
      writeJSON(filepath, stats)
      logDev(`overtime JSON 已导出: ${filepath}`)
    }

    // Always write human readable overtime text to file (default: overtime.txt)
    const outBase = opts.out ? path.basename(opts.out, path.extname(opts.out)) : 'commits'
    const overtimeFileName = `overtime_${outBase}.txt`
    const overtimeFile = outputFilePath(overtimeFileName, outDir)
    writeTextFile(overtimeFile, renderOvertimeText(stats))
    // write tab-separated text file for better alignment in editors that use proportional fonts
    const overtimeTabFileName = `overtime_${outBase}.tab.txt`
    const overtimeTabFile = outputFilePath(overtimeTabFileName, outDir)
    writeTextFile(overtimeTabFile, renderOvertimeTab(stats))
    // write CSV for structured data consumption
    const overtimeCsvFileName = `overtime_${outBase}.csv`
    const overtimeCsvFile = outputFilePath(overtimeCsvFileName, outDir)
    writeTextFile(overtimeCsvFile, renderOvertimeCsv(stats))
    logDev(`Overtime text 已导出: ${overtimeFile}`)
    logDev(`Overtime table (tabs) 已导出: ${overtimeTabFile}`)
    logDev(`Overtime CSV 已导出: ${overtimeCsvFile}`)

    // 按月输出 ... 保持原逻辑
    const perPeriodFormats = String(opts.perPeriodFormats || '')
      .split(',')
      .map((s) =>
        String(s || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
    try {
      const monthGroups = groupRecords(records, 'month')
      const monthlyFileName = `overtime_${outBase}_monthly.txt`
      const monthlyFile = outputFilePath(monthlyFileName, outDir)
      let monthlyContent = ''
      const monthKeys = Object.keys(monthGroups).sort()
      monthKeys.forEach((k) => {
        const groupRecs = monthGroups[k]
        const s = getOvertimeStats(groupRecs)
        monthlyContent += `===== ${k} =====\n`
        monthlyContent += `${renderOvertimeText(s)}\n\n`
        // Also write a single file per month under 'month/' folder
        try {
          const perMonthFileName = `month/overtime_${outBase}_${k}.txt`
          const perMonthFile = outputFilePath(perMonthFileName, outDir)
          writeTextFile(perMonthFile, renderOvertimeText(s))
          logDev(`Overtime 月度(${k}) 已导出: ${perMonthFile}`)
          // per-period CSV / Tab format (按需生成)
          if (perPeriodFormats.includes('csv')) {
            try {
              const perMonthCsvName = `month/overtime_${outBase}_${k}.csv`
              writeTextFile(
                outputFilePath(perMonthCsvName, outDir),
                renderOvertimeCsv(s)
              )
              logDev(
                `Overtime 月度(CSV)(${k}) 已导出: ${outputFilePath(perMonthCsvName, outDir)}`
              )
            } catch (err) {
              console.warn(`Write monthly CSV for ${k} failed:`, err && err.message ? err.message : err)
            }
          }
          if (perPeriodFormats.includes('tab')) {
            try {
              const perMonthTabName = `month/overtime_${outBase}_${k}.tab.txt`
              writeTextFile(
                outputFilePath(perMonthTabName, outDir),
                renderOvertimeTab(s)
              )
              logDev(
                `Overtime 月度(Tab)(${k}) 已导出: ${outputFilePath(perMonthTabName, outDir)}`
              )
            } catch (err) {
              console.warn(`Write monthly Tab for ${k} failed:`, err && err.message ? err.message : err)
            }
          }
        } catch (err) {
          console.warn(`Write monthly file for ${k} failed:`, err && err.message ? err.message : err)
        }
      })
      if (!opts.perPeriodOnly) {
        writeTextFile(monthlyFile, monthlyContent)
        logDev(`Overtime 月度汇总 已导出: ${monthlyFile}`)
      }
      // per-period Excel (sheets or files)
      if (perPeriodFormats.includes('xlsx')) {
        const perPeriodExcelMode = String(opts.perPeriodExcelMode || 'sheets')
        if (perPeriodExcelMode === 'sheets') {
          try {
            const monthXlsxName = `month/overtime_${outBase}_monthly.xlsx`
            const monthXlsxFile = outputFilePath(monthXlsxName, outDir)
            await exportExcelPerPeriodSheets(monthGroups, monthXlsxFile, {
              stats: opts.stats,
              gerrit: opts.gerrit
            })
            logDev(`Overtime 月度(XLSX) 已导出: ${monthXlsxFile}`)
          } catch (err) {
            console.warn('Export month XLSX (sheets) failed:', err && err.message ? err.message : err)
          }
        } else {
          try {
            const monthKeys2 = Object.keys(monthGroups).sort()
            const tasks = monthKeys2.map((k2) => {
              const perMonthXlsxName = `month/overtime_${outBase}_${k2}.xlsx`
              const perMonthXlsxFile = outputFilePath(perMonthXlsxName, outDir)
              return exportExcel(monthGroups[k2], null, {
                file: perMonthXlsxFile,
                stats: opts.stats,
                gerrit: opts.gerrit
              }).then(() =>
                console.log(chalk.green(`Overtime 月度(XLSX)(${k2}) 已导出: ${perMonthXlsxFile}`))
              )
            })
            await Promise.all(tasks)
          } catch (err) {
            console.warn('Export monthly XLSX files failed:', err && err.message ? err.message : err)
          }
        }
      }
    } catch (err) {
      console.warn('Generate monthly overtime failed:', err && err.message ? err.message : err)
    }

    // 周度输出保持原逻辑（略）
    try {
      const weekGroups = groupRecords(records, 'week')
      const weeklyFileName = `overtime_${outBase}_weekly.txt`
      const weeklyFile = outputFilePath(weeklyFileName, outDir)
      let weeklyContent = ''
      const weekKeys = Object.keys(weekGroups).sort()
      weekKeys.forEach((k) => {
        const groupRecs = weekGroups[k]
        const s = getOvertimeStats(groupRecs)
        weeklyContent += `===== ${k} =====\n`
        weeklyContent += `${renderOvertimeText(s)}\n\n`
        try {
          const perWeekFileName = `week/overtime_${outBase}_${k}.txt`
          const perWeekFile = outputFilePath(perWeekFileName, outDir)
          writeTextFile(perWeekFile, renderOvertimeText(s))
          logDev(`Overtime 周度(${k}) 已导出: ${perWeekFile}`)

          if (perPeriodFormats.includes('csv')) {
            try {
              const perWeekCsvName = `week/overtime_${outBase}_${k}.csv`
              writeTextFile(outputFilePath(perWeekCsvName, outDir), renderOvertimeCsv(s))
              logDev(`Overtime 周度(CSV)(${k}) 已导出: ${outputFilePath(perWeekCsvName, outDir)}`)
            } catch (err) {
              console.warn(`Write weekly CSV for ${k} failed:`, err && err.message ? err.message : err)
            }
          }
          if (perPeriodFormats.includes('tab')) {
            try {
              const perWeekTabName = `week/overtime_${outBase}_${k}.tab.txt`
              writeTextFile(outputFilePath(perWeekTabName, outDir), renderOvertimeTab(s))
              logDev(`Overtime 周度(Tab)(${k}) 已导出: ${outputFilePath(perWeekTabName, outDir)}`)
            } catch (err) {
              console.warn(`Write weekly Tab for ${k} failed:`, err && err.message ? err.message : err)
            }
          }
        } catch (err) {
          console.warn(`Write weekly file for ${k} failed:`, err && err.message ? err.message : err)
        }
      })
      writeTextFile(weeklyFile, weeklyContent)
      logDev(`Overtime 周度汇总 已导出: ${weeklyFile}`)
    } catch (err) {
      console.warn('Generate weekly overtime failed:', err && err.message ? err.message : err)
    }
}

