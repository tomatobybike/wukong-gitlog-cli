import { Command } from 'commander'
import chalk from 'chalk'
import { getGitLogs } from './git.mjs'
import { renderText } from './text.mjs'
import { exportExcel } from './excel.mjs'
import { groupRecords, writeJSON, writeTextFile } from './utils.mjs'

const program = new Command()

program
  .name('git-commits')
  .description('Advanced Git commit log exporter.')
  .option('--author <name>', '指定 author 名')
  .option('--email <email>', '指定 email')
  .option('--since <date>', '起始日期')
  .option('--until <date>', '结束日期')
  .option('--limit <n>', '限制数量', parseInt)
  .option('--no-merges', '不包含 merge commit')
  .option('--json', '输出 JSON')
  .option('--format <type>', '输出格式: text | excel | json', 'text')
  .option('--group-by <type>', '按日期分组: day | month')
  .option('--stats', '输出每日统计数据')
  .option('--out <file>', '输出文件名')
  .parse()

const opts = program.opts()

;(async () => {
  const records = await getGitLogs(opts)

  let final = records

  // --- 分组 ---
  let groups = null
  if (opts.groupBy) {
    groups = groupRecords(records, opts.groupBy)
  }

  // --- JSON ---
  if (opts.json) {
    const file = opts.out || 'commits.json'
    writeJSON(file, groups || records)
    console.log(chalk.green(`JSON 已导出: ${file}`))
    return
  }

  // --- text ---
  if (opts.format === 'text') {
    const file = opts.out || 'commits.txt'
    const text = renderText(records, groups)
    writeTextFile(file, text)
    console.log(text)
    console.log(chalk.green(`已导出文本: ${file}`))
    return
  }

  // --- EXCEL（默认也输出TXT） ---
  if (opts.format === 'excel') {
    const excelFile = opts.out || 'commits.xlsx'
    const txtFile = excelFile.replace(/\.xlsx$/, '.txt')

    await exportExcel(records, groups, {
      file: excelFile,
      stats: opts.stats
    })

    const text = renderText(records, groups)
    writeTextFile(txtFile, text)

    console.log(chalk.green(`Excel 已导出: ${excelFile}`))
    console.log(chalk.green(`文本已自动导出: ${txtFile}`))
  }
})()
