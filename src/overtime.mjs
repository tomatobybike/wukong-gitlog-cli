import dayjs from 'dayjs';
import DateHolidays from 'date-holidays';

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

  // init holiday checker for country
  const hd = new DateHolidays();
  try {
    hd.init(String(country).toUpperCase());
  } catch (err) {
    // fallback to CN
    hd.init('CN');
  }

  records.forEach((r) => {
    const dt = parseCommitDate(r.date);
    if (!dt || !dt.isValid()) return; // skip

    const outside = isOutsideWorkHours(dt, startHour, endHour, lunchStart, lunchEnd);
    const isHoliday = !!hd.isHoliday(dt.toDate());
    const isNonWork = isWeekend(dt) || isHoliday;

    if (outside) outsideWorkCount++;
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
    startHour,
    endHour,
      lunchStart,
      lunchEnd,
      country,
      holidayCount,
      holidayRate: total ? +(holidayCount / total).toFixed(3) : 0,
  };
}

export function renderOvertimeText(stats) {
  const { total, outsideWorkCount, nonWorkdayCount, holidayCount, outsideWorkRate, nonWorkdayRate, holidayRate, perAuthor, startHour, endHour, lunchStart, lunchEnd, country } = stats;
  const { startCommit, endCommit, latestCommit } = stats;
  const lines = [];
  lines.push(`总提交数：${total}`);
  if (startCommit && endCommit) {
    lines.push(`统计区间：${startCommit.date} — ${endCommit.date}`);
  }
  if (latestCommit) {
    lines.push(`最晚一次提交：${latestCommit.hash} ${latestCommit.author} ${latestCommit.date} ${latestCommit.message}`);
  }
  // country: holiday region, lunchStart/lunchEnd define midday break
  lines.push(`下班时间定义：${startHour}:00 - ${endHour}:00 (午休 ${lunchStart}:00 - ${lunchEnd}:00)`);
  lines.push(`国家假期参考：${String(country).toUpperCase()}，节假日提交数：${holidayCount}，占比：${(holidayRate * 100).toFixed(1)}%`);
  lines.push(`下班时间（工作时间外）提交数：${outsideWorkCount}，占比：${(outsideWorkRate * 100).toFixed(1)}%`);
  lines.push(`非工作日（周末）提交数：${nonWorkdayCount}，占比：${(nonWorkdayRate * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('按人员统计：');
  lines.push(`  ${'Name'.padEnd(20)} | 总数 | 下班外数 | 下班外占比 | 非工作日数 | 非工作日占比 | 假日数 | 假日占比`);
  lines.push('-'.repeat(80));

  perAuthor.forEach((p) => {
    lines.push(
      `  ${p.name.padEnd(20)} | ${String(p.total).padStart(3)}  | ${String(p.outsideWorkCount).padStart(8)}  | ${String((p.outsideWorkRate * 100).toFixed(1)).padStart(8)}%  | ${String(p.nonWorkdayCount).padStart(8)}  | ${String((p.nonWorkdayRate * 100).toFixed(1)).padStart(8)}%  | ${String(p.holidayCount).padStart(6)}  | ${String((p.holidayRate * 100).toFixed(1)).padStart(6)}%`
    );
  });

  return lines.join('\n');
}
