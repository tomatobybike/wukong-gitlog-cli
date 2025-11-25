import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

export async function exportExcel(records, groups, options = {}) {
  const { file, stats } = options;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Commits');

  ws.columns = [
    { header: 'Hash', key: 'hash', width: 12 },
    { header: 'Author', key: 'author', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Message', key: 'message', width: 80 }
  ];

  (groups ? Object.values(groups).flat() : records).forEach(r =>
    ws.addRow(r)
  );

  ws.autoFilter = 'A1:E1';

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
