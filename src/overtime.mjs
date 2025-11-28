import dayjs from 'dayjs';
import DateHolidays from 'date-holidays';
import stringWidth from 'string-width';

export function parseCommitDate(d) {
  // d examples: '2025-11-14 23:53:04 +0800' or ISO format
  // Try dayjs parsing; fallback to slicing timezone
  let dt = dayjs(d);
  if (!dt.isValid()) {
    // strip timezone offset and try again
    const m = String(d).match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
    if (m) dt = dayjs(m[1]);
  }
  return dt;
}

function formatDateForCountry(dateStr, country) {
  try {
    const dt = parseCommitDate(dateStr);
    if (!dt || !dt.isValid()) return dateStr;
    if (String(country).toUpperCase() === 'CN') {
      // Force display in +08:00 timezone
      return dt.utcOffset(8 * 60).format('YYYY-MM-DD HH:mm:ss ZZ');
    }
    return dt.format('YYYY-MM-DD HH:mm:ss ZZ');
  } catch (err) {
    return dateStr;
  }
}

function isWeekend(dt) {
  const day = dt.day();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

function isOutsideWorkHours(dt, startHour = 9, endHour = 18, lunchStart = 12, lunchEnd = 14) {
  const hour = dt.hour();
  // Working hours are startHour <= hour < endHour, excluding lunchtime lunchStart <= hour < lunchEnd
  const inWorkHours = hour >= startHour && hour < endHour && !(hour >= lunchStart && hour < lunchEnd);
  return !inWorkHours;
}

export function analyzeOvertime(records, opts = {}) {
  const { startHour = 9, endHour = 18, lunchStart = 12, lunchEnd = 14, country = 'CN' } = opts;
  const total = records.length;

  let outsideWorkCount = 0;
  let nonWorkdayCount = 0;
  let holidayCount = 0;

  const byAuthor = new Map();

  let startCommit = null;
  let endCommit = null;
  let latestCommit = null;
  let latestOutsideCommit = null;

  // init holiday checker for country
  const hd = new DateHolidays();
  try {
    hd.init(String(country).toUpperCase());
  } catch (err) {
    // fallback to CN
    hd.init('CN');
  }

  // 新增：每小时分布统计
  const hourlyCommits = Array(24).fill(0);
  records.forEach((r) => {
    const dt = parseCommitDate(r.date);
    if (!dt || !dt.isValid()) return; // skip

    const outside = isOutsideWorkHours(dt, startHour, endHour, lunchStart, lunchEnd);
    const isHoliday = !!hd.isHoliday(dt.toDate());
    const isNonWork = isWeekend(dt) || isHoliday;

    // 每小时分布
    const hour = dt.hour();
    if (hour >= 0 && hour < 24) {
      hourlyCommits[hour]++;
    }

    if (outside) {
      outsideWorkCount++;
      // 记录最新的加班提交
      if (!latestOutsideCommit || dt.isAfter(parseCommitDate(latestOutsideCommit.date))) {
        latestOutsideCommit = r;
      }
    }
    if (isNonWork) nonWorkdayCount++;
    if (isHoliday) holidayCount++;

    const authorName = r.author || r.email || 'unknown';
    const key = `${authorName} <${r.email || ''}>`;
    const info = byAuthor.get(key) || {
      name: authorName,
      email: r.email || '',
      total: 0,
      outsideWorkCount: 0,
      nonWorkdayCount: 0,
    };

    info.total++;
    if (outside) info.outsideWorkCount++;
    if (isNonWork) info.nonWorkdayCount++;
    if (isHoliday) info.holidayCount = (info.holidayCount || 0) + 1;
    byAuthor.set(key, info);
  });

  const perAuthor = [];
  for (const [, v] of byAuthor) {
    perAuthor.push({
      name: v.name,
      email: v.email,
      total: v.total,
      outsideWorkCount: v.outsideWorkCount,
      nonWorkdayCount: v.nonWorkdayCount,
      holidayCount: v.holidayCount || 0,
      outsideWorkRate: v.total ? +(v.outsideWorkCount / v.total).toFixed(3) : 0,
      nonWorkdayRate: v.total ? +(v.nonWorkdayCount / v.total).toFixed(3) : 0,
      holidayRate: v.total ? +((v.holidayCount || 0) / v.total).toFixed(3) : 0,
    });
  }

  // compute start/end/latest commit
  // convert to dayjs and find min/max
  const validRecords = records
    .map((r) => ({ ...r, _dt: parseCommitDate(r.date) }))
    .filter((r) => r._dt && r._dt.isValid());
  if (validRecords.length > 0) {
    validRecords.sort((a, b) => a._dt.valueOf() - b._dt.valueOf());
    [startCommit] = validRecords;
    endCommit = validRecords[validRecords.length - 1];
    latestCommit = endCommit;
    // cleanup temp _dt
    for (let i = 0; i < validRecords.length; i++) {
      // copy the object without _dt for safety
      delete validRecords[i]._dt;
    }
  }

  // sort perAuthor by outsideWorkRate desc
  perAuthor.sort((a, b) => b.outsideWorkRate - a.outsideWorkRate || b.total - a.total);

  // 新增：每小时分布百分比
  const hourlyPercent = hourlyCommits.map(v => total ? +(v / total).toFixed(3) : 0);
  return {
    total,
    outsideWorkCount,
    nonWorkdayCount,
    outsideWorkRate: total ? +(outsideWorkCount / total).toFixed(3) : 0,
    nonWorkdayRate: total ? +(nonWorkdayCount / total).toFixed(3) : 0,
    perAuthor,
    /// 提示：计算 min/max 日期 & latest commit
    startCommit: startCommit || null,
    endCommit: endCommit || null,
    latestCommit: latestCommit || null,
    latestOutsideCommit: latestOutsideCommit || null,
    startHour,
    endHour,
    lunchStart,
    lunchEnd,
    country,
    holidayCount,
    holidayRate: total ? +(holidayCount / total).toFixed(3) : 0,
    hourlyCommits,
    hourlyPercent,
  };
}

export function renderOvertimeText(stats) {
  const { total, outsideWorkCount, nonWorkdayCount, holidayCount, outsideWorkRate, nonWorkdayRate, holidayRate, perAuthor, startHour, endHour, lunchStart, lunchEnd, country, hourlyCommits = [], hourlyPercent = [] } = stats;
  const { startCommit, endCommit, latestCommit, latestOutsideCommit } = stats;
  const lines = [];

  const formatPercent = (v) => `${(v * 100).toFixed(1)}%`;
  const padDisplayEnd = (s, width) => {
    const t = String(s ?? '');
    const w = stringWidth(t);
    return t + ' '.repeat(Math.max(0, width - w));
  };
  const padDisplayStart = (s, width) => {
    const t = String(s ?? '');
    const w = stringWidth(t);
    return ' '.repeat(Math.max(0, width - w)) + t;
  };
  const cols = {
    name: 22,
    total: 6,
    outside: 9,
    outsideRate: 10,
    nonWork: 10,
    nonWorkRate: 12,
    holiday: 8,
    holidayRate: 10,
  };
  lines.push(`总提交数：${total}`);
  if (startCommit && endCommit) {
    lines.push(`统计区间：${formatDateForCountry(startCommit.date, country)} — ${formatDateForCountry(endCommit.date, country)}`);
  }
  if (latestCommit) {
    lines.push('最晚一次提交：');
    lines.push(`  Hash   : ${latestCommit.hash}`);
    lines.push(`  Author : ${latestCommit.author}`);
    lines.push(`  Date   : ${formatDateForCountry(latestCommit.date, country)}`);
    lines.push(`  Message: ${latestCommit.message}`);
  }
  if (latestOutsideCommit) {
    lines.push('加班最晚的一次提交：');
    lines.push(`  Hash   : ${latestOutsideCommit.hash}`);
    lines.push(`  Author : ${latestOutsideCommit.author}`);
    lines.push(`  Date   : ${formatDateForCountry(latestOutsideCommit.date, country)}`);
    lines.push(`  Message: ${latestOutsideCommit.message}`);
  }
  // country: holiday region, lunchStart/lunchEnd define midday break
  lines.push(`下班时间定义：${startHour}:00 - ${endHour}:00 (午休 ${lunchStart}:00 - ${lunchEnd}:00)`);
  lines.push(`国家假期参考：${String(country).toUpperCase()}，节假日提交数：${holidayCount}，占比：${(holidayRate * 100).toFixed(1)}%`);
  lines.push(`下班时间（工作时间外）提交数：${outsideWorkCount}，占比：${(outsideWorkRate * 100).toFixed(1)}%`);
  lines.push(`非工作日（周末）提交数：${nonWorkdayCount}，占比：${(nonWorkdayRate * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('每小时分布（提交数/占比）：');
  let hourLine = '  Hour | Count | Percent';
  lines.push(hourLine);
  lines.push('  -----|-------|--------');
  for (let h = 0; h < 24; h++) {
    const cnt = hourlyCommits[h] || 0;
    if (cnt > 0) {
      const pct = hourlyPercent[h] ? (hourlyPercent[h] * 100).toFixed(1) : '0.0';
      lines.push(`  ${String(h).padStart(2, '0')}   | ${String(cnt).padStart(5, ' ')} | ${pct.padStart(6, ' ')}%`);
    }
  }
  lines.push('');
  lines.push('按人员统计：');
  // header
  const header = `  ${padDisplayEnd('Name', cols.name)} | ${padDisplayStart('总数', cols.total)} | ${padDisplayStart('下班外数', cols.outside)} | ${padDisplayStart('下班外占比', cols.outsideRate)} | ${padDisplayStart('非工作日数', cols.nonWork)} | ${padDisplayStart('非工作日占比', cols.nonWorkRate)} | ${padDisplayStart('假日数', cols.holiday)} | ${padDisplayStart('假日占比', cols.holidayRate)}`;
  lines.push(header);
  const totalWidth = cols.name + cols.total + cols.outside + cols.outsideRate + cols.nonWork + cols.nonWorkRate + cols.holiday + cols.holidayRate + 3 * 7; // approximate separator widths
  lines.push('-'.repeat(Math.max(80, totalWidth)));

  perAuthor.forEach((p) => {
    const name = (p.name || '-').toString();
    const row = `  ${padDisplayEnd(name, cols.name)} | ${padDisplayStart(String(p.total), cols.total)} | ${padDisplayStart(String(p.outsideWorkCount), cols.outside)} | ${padDisplayStart(formatPercent(p.outsideWorkRate), cols.outsideRate)} | ${padDisplayStart(String(p.nonWorkdayCount), cols.nonWork)} | ${padDisplayStart(formatPercent(p.nonWorkdayRate), cols.nonWorkRate)} | ${padDisplayStart(String(p.holidayCount), cols.holiday)} | ${padDisplayStart(formatPercent(p.holidayRate), cols.holidayRate)}`;
    lines.push(row);
  });
  lines.push('');

  return lines.join('\n');
}

export function renderOvertimeTab(stats) {
  const { total, outsideWorkCount, nonWorkdayCount, holidayCount, outsideWorkRate, nonWorkdayRate, holidayRate, perAuthor, startHour, endHour, lunchStart, lunchEnd, country, hourlyCommits = [], hourlyPercent = [] } = stats;
  const { startCommit, endCommit, latestCommit, latestOutsideCommit } = stats;
  const rows = [];
  rows.push(`总提交数:\t${total}`);
  if (startCommit && endCommit) rows.push(`统计区间:\t${formatDateForCountry(startCommit.date, country)} — ${formatDateForCountry(endCommit.date, country)}`);
  if (latestCommit) rows.push(`最晚一次提交:\t${latestCommit.hash}\t${latestCommit.author}\t${formatDateForCountry(latestCommit.date, country)}\t${latestCommit.message}`);
  if (latestOutsideCommit) rows.push(`加班最晚的一次提交:\t${latestOutsideCommit.hash}\t${latestOutsideCommit.author}\t${formatDateForCountry(latestOutsideCommit.date, country)}\t${latestOutsideCommit.message}`);
  rows.push(`下班时间定义:\t${startHour}:00 - ${endHour}:00 (午休 ${lunchStart}:00 - ${lunchEnd}:00)`);
  rows.push(`国家假期参考:\t${String(country).toUpperCase()}\t节假日提交数:\t${holidayCount}\t节假日占比:\t${(holidayRate * 100).toFixed(1)}%`);
  rows.push(`下班时间（工作时间外）提交数:\t${outsideWorkCount}\t占比:\t${(outsideWorkRate * 100).toFixed(1)}%`);
  rows.push(`非工作日（周末）提交数:\t${nonWorkdayCount}\t占比:\t${(nonWorkdayRate * 100).toFixed(1)}%`);
  rows.push('');
  rows.push('每小时分布（提交数/占比）：');
  rows.push(['Hour', 'Count', 'Percent'].join('\t'));
  for (let h = 0; h < 24; h++) {
    const cnt = hourlyCommits[h] || 0;
    if (cnt > 0) {
      const pct = hourlyPercent[h] ? (hourlyPercent[h] * 100).toFixed(1) : '0.0';
      rows.push([String(h).padStart(2, '0'), cnt, `${pct}%`].join('\t'));
    }
  }
  rows.push('');
  rows.push(['Name', '总数', '下班外数', '下班外占比', '非工作日数', '非工作日占比', '假日数', '假日占比'].join('\t'));
  perAuthor.forEach((p) => {
    rows.push([p.name || '-', p.total, p.outsideWorkCount, `${(p.outsideWorkRate * 100).toFixed(1)}%`, p.nonWorkdayCount, `${(p.nonWorkdayRate * 100).toFixed(1)}%`, p.holidayCount || 0, `${((p.holidayCount || 0) / p.total * 100).toFixed(1)}%`].join('\t'));
  });
  return rows.join('\n');
}

function escapeCsv(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function renderOvertimeCsv(stats) {
  const { perAuthor, latestOutsideCommit, country, hourlyCommits = [], hourlyPercent = [], total = 0 } = stats;
  const rows = [];
  if (latestOutsideCommit) {
    rows.push(`# 加班最晚的一次提交,Hash,Author,Date,Message`);
    rows.push(`# ,${escapeCsv(latestOutsideCommit.hash)},${escapeCsv(latestOutsideCommit.author)},${escapeCsv(formatDateForCountry(latestOutsideCommit.date, country))},${escapeCsv(latestOutsideCommit.message)}`);
  }
  rows.push('');
  rows.push('Hour,Count,Percent');
  for (let h = 0; h < 24; h++) {
    const cnt = hourlyCommits[h] || 0;
    if (cnt > 0) {
      const pct = hourlyPercent[h] ? (hourlyPercent[h] * 100).toFixed(1) : '0.0';
      rows.push(`${h.toString().padStart(2, '0')},${cnt},${pct}%`);
    }
  }
  rows.push('');
  rows.push('Name,Total,OutsideCount,OutsideRate,NonWorkdayCount,NonWorkdayRate,HolidayCount,HolidayRate');
  perAuthor.forEach((p) => {
    rows.push(`${escapeCsv(p.name)},${p.total},${p.outsideWorkCount},${(p.outsideWorkRate * 100).toFixed(1)}%,${p.nonWorkdayCount},${(p.nonWorkdayRate * 100).toFixed(1)}%,${p.holidayCount || 0},${((p.holidayCount || 0) / p.total * 100).toFixed(1)}%`);
  });
  return rows.join('\n');
}

