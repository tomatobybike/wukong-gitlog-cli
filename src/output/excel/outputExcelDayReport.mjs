import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import path from 'path'

import { DAY_REPORT } from '#src/constants/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'

/**
 * @function outputExcelDayReport
 * @description
 * 按 author 输出 Excel 日报（每人一个 Excel）
 * @param {Array} dayReports getGitLogsDayReport 的返回结果
 * @param {Object} options
 * @param {string} options.outputDir 输出目录
 */
export const outputExcelDayReport = async (dayReports = [], conf = {}) => {
  if (!Array.isArray(dayReports) || dayReports.length === 0) {
    return
  }

  const config = { dir: conf.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${DAY_REPORT}`

  // 按 author 分组
  const authorMap = {}
  dayReports.forEach((item) => {
    if (!authorMap[item.author]) {
      authorMap[item.author] = []
    }
    authorMap[item.author].push(item)
  })

  // 每个人生成一个 Excel
  for (const [author, records] of Object.entries(authorMap)) {
    // 日期升序
    records.sort((a, b) => dayjs(a.day).valueOf() - dayjs(b.day).valueOf())

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('日报')

    // 表头定义
    sheet.columns = [
      { header: '日期', key: 'day', width: 15 },
      { header: '姓名', key: 'author', width: 12 },
      { header: '打卡时长', key: 'hours', width: 12 },
      { header: '工作内容', key: 'msg', width: 60 },
      { header: '偏差说明', key: 'remark', width: 20 }
    ]

    // 表头加粗
    sheet.getRow(1).font = { bold: true }

    // ✅ 日期列：Excel 原生日期格式
    sheet.getColumn('day').numFmt = 'yyyy-mm-dd'

    // ✅ 工作内容：自动换行
    sheet.getColumn('msg').alignment = {
      wrapText: true,
      vertical: 'top'
    }

    // 填充数据
    records.forEach((item) => {
      sheet.addRow({
        // 用 Date 对象，Excel 才会识别为日期
        day: new Date(item.day),
        author: item.author,
        hours: 8,
        msg: item.msg,
        remark: ''
      })
    })

    // const filePath = path.join(outputDir, `${author}.xlsx`)
    // const filePath = path.join(config.dir, `${author}.xlsx`)
    const excelFile = `${author}.xlsx`
    const filePath = outFile(baseDir, excelFile)
    // eslint-disable-next-line no-await-in-loop
    await workbook.xlsx.writeFile(filePath)

    console.log(`✅ 已生成 Excel：${filePath}`)
  }
}
