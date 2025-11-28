import fs from 'fs';
import dayjs from 'dayjs';

export function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function writeTextFile(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

export function groupRecords(records, mode) {
  const group = {};

  records.forEach(r => {
    const date = dayjs(r.date);
    let key;

    if (mode === 'day') {
      key = date.format('YYYY-MM-DD');
    } else if (mode === 'week') {
      // compute ISO week key like 2025-W48 (Monday-based ISO week)
      const d = new Date(Date.UTC(date.year(), date.month(), date.date()));
      // ISO week: Thursday of the current week decides the year
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const year = d.getUTCFullYear();
      const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
      const week = Math.floor(((d - firstDayOfYear) / 86400000 + 1) / 7) + 1;
      key = `${year}-W${String(week).padStart(2, '0')}`;
    } else {
      // default to month grouping
      key = date.format('YYYY-MM');
    }

    if (!group[key]) group[key] = [];
    group[key].push(r);
  });

  return group;
}
