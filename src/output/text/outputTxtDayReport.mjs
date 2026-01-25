import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'

import { DAY_REPORT_TXT } from '#src/constants/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'

/**
 * @function outputTxtDayReport
 * @description
 * 按 author 输出 TXT 日报（每人一个文件）
 */
export const outputTxtDayReport = async ({
  dayReports = [],
  conf = {}
} = {}) => {
  if (!Array.isArray(dayReports) || dayReports.length === 0) {
    return
  }

  const config = { dir: conf.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${DAY_REPORT_TXT}`

  // 生成时间（来自上层 outputData）
  const generateTime =  dayjs().format('YYYY-MM-DD HH:mm:ss')

  // 按 author 分组
  const authorMap = {}
  dayReports.forEach((item) => {
    if (!authorMap[item.author]) {
      authorMap[item.author] = []
    }
    authorMap[item.author].push(item)
  })

  // 每个人生成一个 txt
  for (const [author, records] of Object.entries(authorMap)) {
    // 日期升序
    records.sort(
      (a, b) =>
        dayjs(a.day).valueOf() - dayjs(b.day).valueOf()
    )

    const lines = []

    // ✅ 文件头：生成时间
    lines.push(`生成时间：${generateTime}`)
    lines.push('')

    // 姓名
    lines.push(`姓名：${author}`)
    lines.push('')

    // 每一天
    records.forEach((item) => {
      lines.push(item.day)
      lines.push('--------------------------------')
      lines.push('工作时长：8 小时')
      lines.push('工作内容：')
      lines.push(item.msg)
      lines.push('') // 空行分隔
    })

    const content = lines.join('\n')

    const txtFile = `${author}.txt`
    const filePath = outFile(baseDir, txtFile)

    // eslint-disable-next-line no-await-in-loop
    fs.writeFileSync(filePath, content, 'utf-8')

    console.log(`✅ 已生成 TXT：${filePath}`)
  }
}
