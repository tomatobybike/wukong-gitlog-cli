import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

export async function exportExcel(records, groups, options = {}) {
  const { file, stats, gerrit } = options;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Commits');

  const cols = [
    { header: 'Hash', key: 'hash', width: 12 },
    { header: 'Author', key: 'author', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Message', key: 'message', width: 80 }
  ];

  if (gerrit) {
    cols.push({ header: 'Gerrit', key: 'gerrit', width: 50 });
  }

  ws.columns = cols;

  (groups ? Object.values(groups).flat() : records).forEach(r =>
    ws.addRow(r)
  );

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  // --- stats sheet ---
  if (stats) {
    const statWs = wb.addWorksheet('Stats');

    const map = {};

    records.forEach(r => {
      const d = dayjs(r.date).format('YYYY-MM-DD');
      map[d] = (map[d] || 0) + 1;
    });

    statWs.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Commits', key: 'count', width: 15 }
    ];

    Object.entries(map).forEach(([d, cnt]) =>
      statWs.addRow({ date: d, count: cnt })
    );
  }

  await wb.xlsx.writeFile(file);
}

export async function exportExcelPerPeriodSheets(groups, file, options = {}) {
  // groups: { periodKey: [records] }
  const { stats, gerrit } = options;

  const wb = new ExcelJS.Workbook();

  const cols = [
    { header: 'Hash', key: 'hash', width: 12 },
    { header: 'Author', key: 'author', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Message', key: 'message', width: 80 }
  ];
  if (gerrit) cols.push({ header: 'Gerrit', key: 'gerrit', width: 50 });

  const keys = Object.keys(groups).sort();
  keys.forEach((k) => {
    const ws = wb.addWorksheet(String(k).slice(0, 31)); // Excel sheet name limit 31
    ws.columns = cols;
    groups[k].forEach(r => ws.addRow(r));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  });

  // summary sheet with counts per period
  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Period', key: 'period', width: 20 },
    { header: 'Commits', key: 'count', width: 12 }
  ];
  keys.forEach(k => summary.addRow({ period: k, count: groups[k].length }));

  await wb.xlsx.writeFile(file);
}

export async function exportExcelPerPeriodFiles(groups, dir, filePrefix, options = {}) {
  // groups: { periodKey: [records] }
  // dir: output directory path, filePrefix: base name without extension
  // For each key, call exportExcel with that key's records
  const keys = Object.keys(groups).sort();
  for (const k of keys) {
    const perFile = `${dir}/overtime_${filePrefix}_${k}.xlsx`;
    await exportExcel(groups[k], null, { file: perFile, stats: options.stats, gerrit: options.gerrit });
  }
}
