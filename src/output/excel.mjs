import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import { buildAuthorChangeStats } from '#utils/buildAuthorChangeStats.mjs'


export async function exportExcel(records, groups, options = {}) {
  const { file, stats, gerrit } = options

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Commits')

  const cols = [
    { header: 'Hash', key: 'hash', width: 12 },
    { header: 'Author', key: 'author', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Message', key: 'message', width: 80 },
    { header: 'Changed', key: 'changed', width: 12 } // ★ 新增 changed 列
  ]

  if (gerrit) {
    cols.push({ header: 'Gerrit', key: 'gerrit', width: 50 })
  }

  ws.columns = cols

  ;(groups ? Object.values(groups).flat() : records).forEach((r) =>
    ws.addRow(r)
  )

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: cols.length }
  }

  // --- stats sheet ---
  if (stats) {
    const statWs = wb.addWorksheet('Stats')

    const map = {}

    records.forEach((r) => {
      const d = dayjs(r.date).format('YYYY-MM-DD')
      map[d] = (map[d] || 0) + 1
    })

    statWs.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Commits', key: 'count', width: 15 }
    ]

    Object.entries(map).forEach(([d, cnt]) =>
      statWs.addRow({ date: d, count: cnt })
    )
  }

  await wb.xlsx.writeFile(file)
}

export async function exportExcelPerPeriodSheets(groups, file, options = {}) {
  const {  gerrit } = options

  const wb = new ExcelJS.Workbook()

  const cols = [
    { header: 'Hash', key: 'hash', width: 12 },
    { header: 'Author', key: 'author', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Message', key: 'message', width: 80 },
    { header: 'Changed', key: 'changed', width: 12 } // ★ 新增 changed 列
  ]

  if (gerrit) cols.push({ header: 'Gerrit', key: 'gerrit', width: 50 })

  const keys = Object.keys(groups).sort()

  keys.forEach((k) => {
    const ws = wb.addWorksheet(String(k).slice(0, 31))
    ws.columns = cols
    groups[k].forEach((r) => ws.addRow(r))

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols.length }
    }
  })

  // summary sheet
  const summary = wb.addWorksheet('Summary')
  summary.columns = [
    { header: 'Period', key: 'period', width: 20 },
    { header: 'Commits', key: 'count', width: 12 }
  ]
  keys.forEach((k) => summary.addRow({ period: k, count: groups[k].length }))

  await wb.xlsx.writeFile(file)
}

export async function exportExcelPerPeriodFiles(
  groups,
  dir,
  filePrefix,
  options = {}
) {
  const keys = Object.keys(groups).sort()
  for (const k of keys) {
    const perFile = `${dir}/overtime_${filePrefix}_${k}.xlsx`
    // eslint-disable-next-line no-await-in-loop
    await exportExcel(groups[k], null, {
      file: perFile,
      stats: options.stats,
      gerrit: options.gerrit
    })
  }
}

/**
 * 导出作者的日/周/月 changed 统计
 * @param {*} records 原始 commits（包含 author/date/changed）
 * @param {*} file 输出文件
 */
export async function exportExcelAuthorChangeStats(records, file) {
  const stats = buildAuthorChangeStats(records)

  const wb = new ExcelJS.Workbook()

  //-------------------------------------------
  // 工具方法：创建一个统计 sheet
  //-------------------------------------------
  function addStatSheet(title, dataMap) {
    const ws = wb.addWorksheet(title)

    ws.columns = [
      { header: 'Author', key: 'author', width: 20 },
      { header: 'Period', key: 'period', width: 20 },
      { header: 'Changed', key: 'changed', width: 12 }
    ]

    for (const [author, periodMap] of Object.entries(dataMap)) {
      const periods = Object.keys(periodMap).sort()
      for (const p of periods) {
        ws.addRow({
          author,
          period: p,
          changed: periodMap[p]
        })
      }
    }

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 3 }
    }
  }

  //-------------------------------------------
  // 创建 3 个 Sheet
  //-------------------------------------------
  addStatSheet('Author Daily', stats.daily)
  addStatSheet('Author Weekly', stats.weekly)
  addStatSheet('Author Monthly', stats.monthly)

  //-------------------------------------------
  // 保存文件
  //-------------------------------------------
  await wb.xlsx.writeFile(file)
}
