import { Command } from 'commander';
import chalk from 'chalk';
import { getGitLogs } from './git.mjs';
import { renderText } from './text.mjs';
import { exportExcel } from './excel.mjs';
import { groupRecords, writeJSON, writeTextFile } from './utils.mjs';
import { outputFilePath } from './utils/output.mjs';

const program = new Command();

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
  .option('--out <file>', '输出文件名（不含路径）')
  .parse();

const opts = program.opts();

(async () => {
  const records = await getGitLogs(opts);

  // --- 分组 ---
  const groups = opts.groupBy ? groupRecords(records, opts.groupBy) : null;

  // --- JSON ---
  if (opts.json || opts.format === 'json') {
    const file = opts.out || 'commits.json';
    const filepath = outputFilePath(file);

    writeJSON(filepath, groups || records);
    console.log(chalk.green(`JSON 已导出: ${filepath}`));
    return;
  }

  // --- TEXT ---
  if (opts.format === 'text') {
    const file = opts.out || 'commits.txt';
    const filepath = outputFilePath(file);

    const text = renderText(records, groups);
    writeTextFile(filepath, text);

    console.log(text);
    console.log(chalk.green(`文本已导出: ${filepath}`));
    return;
  }

  // --- EXCEL（强制同时输出 TXT） ---
  if (opts.format === 'excel') {
    // Excel
    const excelFile = opts.out || 'commits.xlsx';
    const excelPath = outputFilePath(excelFile);

    // TXT（自动附带）
    const txtFile = excelFile.replace(/\.xlsx$/, '.txt');
    const txtPath = outputFilePath(txtFile);

    // 导出 Excel 文件
    await exportExcel(records, groups, {
      file: excelPath,
      stats: opts.stats,
    });

    // 导出文本
    const text = renderText(records, groups);
    writeTextFile(txtPath, text);

    console.log(chalk.green(`Excel 已导出: ${excelPath}`));
    console.log(chalk.green(`文本已自动导出: ${txtPath}`));

    return;
  }
})();
