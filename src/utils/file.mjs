import fs from 'fs';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

// add ISO week plugin to dayjs once when module loaded
dayjs.extend(isoWeek);

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
      // use dayjs isoWeek / isoWeekYear plugins for accurate ISO week computation (Monday-based)
      const week = date.isoWeek();
      const year = date.isoWeekYear();
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
