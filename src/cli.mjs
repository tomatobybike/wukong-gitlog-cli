import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { getGitLogs } from './git.mjs';
import { renderText } from './text.mjs';
import { analyzeOvertime, renderOvertimeText, renderOvertimeTab, renderOvertimeCsv } from './overtime.mjs';
import { exportExcel, exportExcelPerPeriodSheets } from './excel.mjs';
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
  .option('--group-by <type>', '按日期分组: day | month | week')
  .option('--stats', '输出每日统计数据')
  .option('--gerrit <prefix>', '显示 Gerrit 地址，支持在 prefix 中使用 {{hash}} 占位符')
  .option('--gerrit-api <url>', '可选：Gerrit REST API 基础地址，用于解析 changeNumber，例如 `https://gerrit.example.com`')
  .option('--gerrit-auth <tokenOrUserPass>', '可选：Gerrit API 授权，格式为 `user:pass` 或 `TOKEN`（表示 Bearer token）')
  .option('--overtime', '分析公司加班文化（输出下班时间与非工作日提交占比）')
  .option('--country <code>', '节假日国家：CN 或 US，默认为 CN', 'CN')
  .option('--work-start <hour>', '上班开始小时，默认 9', (v) => parseInt(v, 10), 9)
  .option('--work-end <hour>', '下班小时，默认 18', (v) => parseInt(v, 10), 18)
  .option('--lunch-start <hour>', '午休开始小时，默认 12', (v) => parseInt(v, 10), 12)
  .option('--lunch-end <hour>', '午休结束小时，默认 14', (v) => parseInt(v, 10), 14)
  .option('--out <file>', '输出文件名（不含路径）')
  .option('--out-dir <dir>', '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output`')
  .option('--out-parent', '将输出目录放到当前工程的父目录的 `output/`（等同于 `--out-dir ../output`）')
  .option('--per-period-formats <formats>', '每个周期单独输出的格式，逗号分隔：text,csv,tab,xlsx。默认为空（不输出 CSV/Tab/XLSX）', '')
  .option('--per-period-excel-mode <mode>', 'per-period Excel 模式：sheets|files（默认：sheets）', 'sheets')
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
    // support optional changeNumber resolution via Gerrit REST API
    const { gerritApi, gerritAuth } = opts;
    // create new array to avoid mutating function parameters (eslint: no-param-reassign)
    if (prefix.includes('{{changeNumber}}') && gerritApi) {
      // async mapping to resolve changeNumber using Gerrit API
      const cache = new Map();
      const headers = {};
      if (gerritAuth) {
        if (gerritAuth.includes(':')) {
          headers.Authorization = `Basic ${Buffer.from(gerritAuth).toString('base64')}`;
        } else {
          headers.Authorization = `Bearer ${gerritAuth}`;
        }
      }

      const fetchGerritJson = async (url) => {
        try {
          const res = await fetch(url, { headers });
          const txt = await res.text();
          // Gerrit prepends )]}' to JSON responses — strip it
          const jsonText = txt.replace(/^\)\]\}'\n/, '');
          return JSON.parse(jsonText);
        } catch (err) {
          return null;
        }
      };

      const resolveChangeNumber = async (r) => {
        // try changeId first
        if (r.changeId) {
          if (cache.has(r.changeId)) return cache.get(r.changeId);
          // try `changes/{changeId}/detail`
          const url = `${gerritApi.replace(/\/$/, '')}/changes/${encodeURIComponent(r.changeId)}/detail`;
          let j = await fetchGerritJson(url);
          if (j && j._number) {
            cache.set(r.changeId, j._number);
            return j._number;
          }
          // fallback: query search
          const url2 = `${gerritApi.replace(/\/$/, '')}/changes/?q=change:${encodeURIComponent(r.changeId)}`;
          j = await fetchGerritJson(url2);
          if (Array.isArray(j) && j.length > 0 && j[0]._number) {
            cache.set(r.changeId, j[0]._number);
            return j[0]._number;
          }
        }
        // try commit hash
        if (r.hash) {
          if (cache.has(r.hash)) return cache.get(r.hash);
          const url3 = `${gerritApi.replace(/\/$/, '')}/changes/?q=commit:${encodeURIComponent(r.hash)}`;
          const j = await fetchGerritJson(url3);
          if (Array.isArray(j) && j.length > 0 && j[0]._number) {
            cache.set(r.hash, j[0]._number);
            return j[0]._number;
          }
        }
        return null;
      };

      records = await Promise.all(
        records.map(async (r) => {
          const changeNumber = await resolveChangeNumber(r);
          const changeNumberOrFallback = changeNumber || r.changeId || r.hash;
          const gerritUrl = prefix.replace('{{changeNumber}}', changeNumberOrFallback);
          return { ...r, gerrit: gerritUrl };
        })
      );
    } else if (prefix.includes('{{changeNumber}}') && !gerritApi) {
        console.warn('prefix contains {{changeNumber}} but no --gerrit-api provided — falling back to changeId/hash');
        records = records.map((r) => ({ ...r, gerrit: prefix.replace('{{changeNumber}}', r.changeId || r.hash) }));
      } else {
      records = records.map((r) => {
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
  }

  // --- 分组 ---
  const groups = opts.groupBy ? groupRecords(records, opts.groupBy) : null;

  // --- Overtime analysis ---
  if (opts.overtime) {
    const stats = analyzeOvertime(records, {
      startHour: opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
      endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
      lunchStart: opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
      lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
      country: opts.country || 'CN',
    });
    // Output to console
    console.log('\n--- Overtime analysis ---\n');
    console.log(renderOvertimeText(stats));
    // if user requested json format, write stats to file
    if (opts.json || opts.format === 'json') {
      const file = opts.out || 'overtime.json';
      const filepath = outputFilePath(file, outDir);
      writeJSON(filepath, stats);
      console.log(chalk.green(`overtime JSON 已导出: ${filepath}`));
    }
    // Always write human readable overtime text to file (default: overtime.txt)
    const outBase = opts.out ? path.basename(opts.out, path.extname(opts.out)) : 'commits';
    const overtimeFileName = `overtime_${outBase}.txt`;
    const overtimeFile = outputFilePath(overtimeFileName, outDir);
    writeTextFile(overtimeFile, renderOvertimeText(stats));
    // write tab-separated text file for better alignment in editors that use proportional fonts
    const overtimeTabFileName = `overtime_${outBase}.tab.txt`;
    const overtimeTabFile = outputFilePath(overtimeTabFileName, outDir);
    writeTextFile(overtimeTabFile, renderOvertimeTab(stats));
    // write CSV for structured data consumption
    const overtimeCsvFileName = `overtime_${outBase}.csv`;
    const overtimeCsvFile = outputFilePath(overtimeCsvFileName, outDir);
    writeTextFile(overtimeCsvFile, renderOvertimeCsv(stats));
    console.log(chalk.green(`Overtime text 已导出: ${overtimeFile}`));
    console.log(chalk.green(`Overtime table (tabs) 已导出: ${overtimeTabFile}`));
    console.log(chalk.green(`Overtime CSV 已导出: ${overtimeCsvFile}`));
    // 按月输出每个月的加班统计（合并文件 + individual files in month/）
    const perPeriodFormats = String(opts.perPeriodFormats || '').split(',').map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
    try {
      const monthGroups = groupRecords(records, 'month');
      const monthlyFileName = `overtime_${outBase}_monthly.txt`;
      const monthlyFile = outputFilePath(monthlyFileName, outDir);
      let monthlyContent = '';
      const monthKeys = Object.keys(monthGroups).sort();
      monthKeys.forEach((k) => {
        const groupRecs = monthGroups[k];
        const s = analyzeOvertime(groupRecs, {
          startHour: opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
          endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
          lunchStart: opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
          lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
          country: opts.country || 'CN',
        });
        monthlyContent += `===== ${k} =====\n`;
        monthlyContent += `${renderOvertimeText(s)}\n\n`;
        // Also write a single file per month under 'month/' folder
        try {
          const perMonthFileName = `month/overtime_${outBase}_${k}.txt`;
          const perMonthFile = outputFilePath(perMonthFileName, outDir);
          writeTextFile(perMonthFile, renderOvertimeText(s));
          console.log(chalk.green(`Overtime 月度(${k}) 已导出: ${perMonthFile}`));
        // per-period CSV / Tab format (按需生成)
        if (perPeriodFormats.includes('csv')) {
          try {
            const perMonthCsvName = `month/overtime_${outBase}_${k}.csv`;
            writeTextFile(outputFilePath(perMonthCsvName, outDir), renderOvertimeCsv(s));
            console.log(chalk.green(`Overtime 月度(CSV)(${k}) 已导出: ${outputFilePath(perMonthCsvName, outDir)}`));
          } catch (err) {
            console.warn(`Write monthly CSV for ${k} failed:`, err && err.message ? err.message : err);
          }
        }
        if (perPeriodFormats.includes('tab')) {
          try {
            const perMonthTabName = `month/overtime_${outBase}_${k}.tab.txt`;
            writeTextFile(outputFilePath(perMonthTabName, outDir), renderOvertimeTab(s));
            console.log(chalk.green(`Overtime 月度(Tab)(${k}) 已导出: ${outputFilePath(perMonthTabName, outDir)}`));
          } catch (err) {
            console.warn(`Write monthly Tab for ${k} failed:`, err && err.message ? err.message : err);
          }
        }
        } catch (err) {
          console.warn(`Write monthly file for ${k} failed:`, err && err.message ? err.message : err);
        }
      });
      writeTextFile(monthlyFile, monthlyContent);
      console.log(chalk.green(`Overtime 月度汇总 已导出: ${monthlyFile}`));
      // per-period Excel (sheets or files)
      if (perPeriodFormats.includes('xlsx')) {
        const perPeriodExcelMode = String(opts.perPeriodExcelMode || 'sheets');
        if (perPeriodExcelMode === 'sheets') {
          try {
            const monthXlsxName = `month/overtime_${outBase}_monthly.xlsx`;
            const monthXlsxFile = outputFilePath(monthXlsxName, outDir);
            await exportExcelPerPeriodSheets(monthGroups, monthXlsxFile, { stats: opts.stats, gerrit: opts.gerrit });
            console.log(chalk.green(`Overtime 月度(XLSX) 已导出: ${monthXlsxFile}`));
          } catch (err) {
            console.warn('Export month XLSX (sheets) failed:', err && err.message ? err.message : err);
          }
        } else {
          try {
            const monthKeys2 = Object.keys(monthGroups).sort();
            const tasks = monthKeys2.map(k2 => {
              const perMonthXlsxName = `month/overtime_${outBase}_${k2}.xlsx`;
              const perMonthXlsxFile = outputFilePath(perMonthXlsxName, outDir);
              return exportExcel(monthGroups[k2], null, { file: perMonthXlsxFile, stats: opts.stats, gerrit: opts.gerrit })
                .then(() => console.log(chalk.green(`Overtime 月度(XLSX)(${k2}) 已导出: ${perMonthXlsxFile}`)));
            });
            await Promise.all(tasks);
          } catch (err) {
            console.warn('Export monthly XLSX files failed:', err && err.message ? err.message : err);
          }
        }
      }
    } catch (err) {
      console.warn('Generate monthly overtime failed:', err && err.message ? err.message : err);
    }
    // 按周输出每周的加班统计（合并文件 + individual files in week/）
    try {
      const weekGroups = groupRecords(records, 'week');
      const weeklyFileName = `overtime_${outBase}_weekly.txt`;
      const weeklyFile = outputFilePath(weeklyFileName, outDir);
      let weeklyContent = '';
      const weekKeys = Object.keys(weekGroups).sort();
      weekKeys.forEach((k) => {
        const groupRecs = weekGroups[k];
        const s = analyzeOvertime(groupRecs, {
          startHour: opts.workStart || opts.workStart === 0 ? opts.workStart : 9,
          endHour: opts.workEnd || opts.workEnd === 0 ? opts.workEnd : 18,
          lunchStart: opts.lunchStart || opts.lunchStart === 0 ? opts.lunchStart : 12,
          lunchEnd: opts.lunchEnd || opts.lunchEnd === 0 ? opts.lunchEnd : 14,
          country: opts.country || 'CN',
        });
        weeklyContent += `===== ${k} =====\n`;
        weeklyContent += `${renderOvertimeText(s)}\n\n`;
        // Also write a single file per week under 'week/' folder
        try {
          const perWeekFileName = `week/overtime_${outBase}_${k}.txt`;
          const perWeekFile = outputFilePath(perWeekFileName, outDir);
          writeTextFile(perWeekFile, renderOvertimeText(s));
          console.log(chalk.green(`Overtime 周度(${k}) 已导出: ${perWeekFile}`));
        // per-period CSV / Tab format (按需生成)
        if (perPeriodFormats.includes('csv')) {
          try {
            const perWeekCsvName = `week/overtime_${outBase}_${k}.csv`;
            writeTextFile(outputFilePath(perWeekCsvName, outDir), renderOvertimeCsv(s));
            console.log(chalk.green(`Overtime 周度(CSV)(${k}) 已导出: ${outputFilePath(perWeekCsvName, outDir)}`));
          } catch (err) {
            console.warn(`Write weekly CSV for ${k} failed:`, err && err.message ? err.message : err);
          }
        }
        if (perPeriodFormats.includes('tab')) {
          try {
            const perWeekTabName = `week/overtime_${outBase}_${k}.tab.txt`;
            writeTextFile(outputFilePath(perWeekTabName, outDir), renderOvertimeTab(s));
            console.log(chalk.green(`Overtime 周度(Tab)(${k}) 已导出: ${outputFilePath(perWeekTabName, outDir)}`));
          } catch (err) {
            console.warn(`Write weekly Tab for ${k} failed:`, err && err.message ? err.message : err);
          }
        }
        } catch (err) {
          console.warn(`Write weekly file for ${k} failed:`, err && err.message ? err.message : err);
        }
      });
      writeTextFile(weeklyFile, weeklyContent);
      console.log(chalk.green(`Overtime 周度汇总 已导出: ${weeklyFile}`));
      // per-period Excel (sheets or files)
      if (perPeriodFormats.includes('xlsx')) {
        const perPeriodExcelMode = String(opts.perPeriodExcelMode || 'sheets');
        if (perPeriodExcelMode === 'sheets') {
          try {
            const weekXlsxName = `week/overtime_${outBase}_weekly.xlsx`;
            const weekXlsxFile = outputFilePath(weekXlsxName, outDir);
            await exportExcelPerPeriodSheets(weekGroups, weekXlsxFile, { stats: opts.stats, gerrit: opts.gerrit });
            console.log(chalk.green(`Overtime 周度(XLSX) 已导出: ${weekXlsxFile}`));
          } catch (err) {
            console.warn('Export week XLSX (sheets) failed:', err && err.message ? err.message : err);
          }
        } else {
          try {
            const weekKeys2 = Object.keys(weekGroups).sort();
            const tasks2 = weekKeys2.map(k2 => {
              const perWeekXlsxName = `week/overtime_${outBase}_${k2}.xlsx`;
              const perWeekXlsxFile = outputFilePath(perWeekXlsxName, outDir);
              return exportExcel(weekGroups[k2], null, { file: perWeekXlsxFile, stats: opts.stats, gerrit: opts.gerrit })
                .then(() => console.log(chalk.green(`Overtime 周度(XLSX)(${k2}) 已导出: ${perWeekXlsxFile}`)));
            });
            await Promise.all(tasks2);
          } catch (err) {
            console.warn('Export weekly XLSX files failed:', err && err.message ? err.message : err);
          }
        }
      }
    } catch (err) {
      console.warn('Generate weekly overtime failed:', err && err.message ? err.message : err);
    }
    // don't return — allow other outputs to proceed
  }

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
