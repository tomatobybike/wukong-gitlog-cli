import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { getGitLogs } from './git.mjs';
import { renderText } from './text.mjs';
import { exportExcel } from './excel.mjs';
import { groupRecords, writeJSON, writeTextFile, outputFilePath } from './utils/index.mjs';

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
  .option('--gerrit <prefix>', '显示 Gerrit 地址，支持在 prefix 中使用 {{hash}} 占位符')
  .option('--out <file>', '输出文件名（不含路径）')
  .option('--out-dir <dir>', '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output`')
  .option('--out-parent', '将输出目录放到当前工程的父目录的 `output/`（等同于 `--out-dir ../output`）')
  .parse();

const opts = program.opts();

(async () => {
  let records = await getGitLogs(opts);

  // compute output directory root if user provided one or wants parent
  const outDir = opts.outParent
    ? path.resolve(process.cwd(), '..', 'output')
    : opts.outDir || undefined;

  // --- Gerrit 地址处理（若提供） ---
  if (opts.gerrit) {
    const prefix = opts.gerrit;
    // create new array to avoid mutating function parameters (eslint: no-param-reassign)
    records = records.map(r => {
      let gerritUrl;
      if (prefix.includes('{{changeId}}')) {
        const changeId = r.changeId || r.hash;
        gerritUrl = prefix.replace('{{changeId}}', changeId);
      } else if (prefix.includes('{{hash}}')) {
        gerritUrl = prefix.replace('{{hash}}', r.hash);
      } else {
        // append hash to prefix, ensure slash handling
        gerritUrl = prefix.endsWith('/') ? `${prefix}${r.hash}` : `${prefix}/${r.hash}`;
      }

      return { ...r, gerrit: gerritUrl };
    });
  }

  // --- 分组 ---
  const groups = opts.groupBy ? groupRecords(records, opts.groupBy) : null;

  // --- JSON ---
  if (opts.json || opts.format === 'json') {
    const file = opts.out || 'commits.json';
    const filepath = outputFilePath(file, outDir);

    writeJSON(filepath, groups || records);
    console.log(chalk.green(`JSON 已导出: ${filepath}`));
    return;
  }

  // --- TEXT ---
  if (opts.format === 'text') {
    const file = opts.out || 'commits.txt';
    const filepath = outputFilePath(file, outDir);

    const text = renderText(records, groups, { showGerrit: !!opts.gerrit });
    writeTextFile(filepath, text);

    console.log(text);
    console.log(chalk.green(`文本已导出: ${filepath}`));
    return;
  }

  // --- EXCEL（强制同时输出 TXT） ---
  if (opts.format === 'excel') {
    // Excel
    const excelFile = opts.out || 'commits.xlsx';
    const excelPath = outputFilePath(excelFile, outDir);

    // TXT（自动附带）
    const txtFile = excelFile.replace(/\.xlsx$/, '.txt');
    const txtPath = outputFilePath(txtFile, outDir);

    // 导出 Excel 文件
    await exportExcel(records, groups, {
      file: excelPath,
      stats: opts.stats,
      gerrit: opts.gerrit
    });

    // 导出文本
    const text = renderText(records, groups);
    writeTextFile(txtPath, text);

    console.log(chalk.green(`Excel 已导出: ${excelPath}`));
    console.log(chalk.green(`文本已自动导出: ${txtPath}`));


  }
})();
