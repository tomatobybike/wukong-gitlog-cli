export function renderAuthorChangeStatsText(stats, opts = {}) {
  const {
    section = 'all', // 'daily' | 'weekly' | 'monthly' | 'all'
  } = opts;

  const pad = (s, n) =>
    s.length >= n ? `${s.slice(0, n - 1)}…` : s + ' '.repeat(n - s.length);

  const buildSection = (title, obj, unitLabel) => {
    if (!obj || !Object.keys(obj).length) return '';

    const lines = [];

    const header =
      `${pad('Author', 18)} | ${pad(unitLabel, 12)} | ${pad('Changed', 10)}`;
    const line = '-'.repeat(header.length);

    lines.push(`\n=== ${title} ===`);
    lines.push(header);
    lines.push(line);

    for (const [author, periodMap] of Object.entries(obj)) {
      const keys = Object.keys(periodMap).sort();
      for (const key of keys) {
        lines.push(
          [
            pad(author, 18),
            pad(key, 12),
            pad(String(periodMap[key]), 10),
          ].join(' | ')
        );
      }
    }

    return lines.join('\n');
  };

  let output = '';

  if (section === 'all' || section === 'daily') {
    output += buildSection('Daily Changed', stats.daily, 'Date');
  }
  if (section === 'all' || section === 'weekly') {
    output += buildSection('Weekly Changed', stats.weekly, 'Week');
  }
  if (section === 'all' || section === 'monthly') {
    output += buildSection('Monthly Changed', stats.monthly, 'Month');
  }

  return `${output.trim()  }\n`;
}
