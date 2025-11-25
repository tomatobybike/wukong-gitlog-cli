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

    const key =
      mode === 'day'
        ? date.format('YYYY-MM-DD')
        : date.format('YYYY-MM');

    if (!group[key]) group[key] = [];
    group[key].push(r);
  });

  return group;
}
