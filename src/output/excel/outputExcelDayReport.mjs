import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import path from 'path'

import { DAY_REPORT_EXCEL } from '#src/constants/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'

/**
 * @function outputExcelDayReport
 * @description
 * 按 author 输出 Excel 日报（每人一个 Excel）
 * @param {Array} dayReports getGitLogsDayReport 的返回结果
 * @param {Object} conf
 * @param {string} conf.dir 输出目录
 */
export const outputExcelDayReport = async ({
  dayReports = [],
  conf = {}
} = {}) => {
  if (!Array.isArray(dayReports) || dayReports.length === 0) {
    return
  }

  const config = { dir: conf.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${DAY_REPORT_EXCEL}`

  // 按 author 分组
  const authorMap = {}
  dayReports.forEach((item) => {
    if (!authorMap[item.author]) {
      authorMap[item.author] = []
    }
    authorMap[item.author].push(item)
  })

  for (const [author, records] of Object.entries(authorMap)) {
    records.sort((a, b) => dayjs(a.day).valueOf() - dayjs(b.day).valueOf())

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('日报')

    sheet.columns = [
      { header: '日期', key: 'day', width: 15 },
      { header: '姓名', key: 'author', width: 12 },
      { header: '打卡时长', key: 'hours', width: 12 },
      { header: '工作内容', key: 'msg', width: 60 },
      { header: '偏差说明', key: 'remark', width: 20 },
      { header: '生成时间', key: 'generatedAt', width: 22 }
    ]

    sheet.getRow(1).font = { bold: true }
    // 🔴 生成时间表头红色（F列）
    sheet.getCell('F1').font = {
      bold: true,
      color: { argb: 'FFFF0000' }
    }
    sheet.getColumn('day').numFmt = 'yyyy-mm-dd'
    sheet.getColumn('msg').alignment = {
      wrapText: true,
      vertical: 'top'
    }

    const generatedTime = dayjs().format('YYYY-MM-DD HH:mm:ss')

    records.forEach((item, index) => {
      const row = sheet.addRow({
        day: new Date(item.day),
        author: item.author,
        hours: 8,
        msg: item.msg,
        remark: '',
        generatedAt: index === 0 ? generatedTime : ''
      })

      // ✅ 只给第一行的「生成时间」设红色字体
      if (index === 0) {
        row.getCell('generatedAt').font = {
          color: { argb: 'FFFF0000' } // 红色
        }
      }
    })

    const excelFile = `${author}.xlsx`
    const filePath = outFile(baseDir, excelFile)

    // eslint-disable-next-line no-await-in-loop
    await workbook.xlsx.writeFile(filePath)

    console.log(`✅ 已生成 Excel：${filePath}`)
  }
}
