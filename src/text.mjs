export function renderText(records, groups = null, opts = {}) {
  const { showGerrit = false } = opts;
  const pad = (s, n) =>
    s.length >= n ? `${s.slice(0, n - 1)  }…` : s + ' '.repeat(n - s.length);

  const baseHeader =
    `${pad('Hash', 10) 
    } | ${ 
    pad('Author', 18) 
    } | ${ 
    pad('Date', 20) 
    } | ${ 
    pad('Message', 60)}`;

  const gerritHeader = showGerrit ? ` | ${  pad('Gerrit', 50)}` : '';
  const header = baseHeader + gerritHeader;

  const line = '-'.repeat(header.length);

  const rows = [];

  if (groups) {
    for (const [g, list] of Object.entries(groups)) {
      rows.push(`\n=== ${g} ===\n`);
      list.forEach(r => {
        rows.push(
          (
            [
              pad(r.hash.slice(0, 8), 10),
              pad(r.author, 18),
              pad(r.date.replace(/ .+/, ''), 20),
              pad(r.message, 60)
            ].join(' | ') +
            (showGerrit ? ` | ${  pad(r.gerrit || '', 50)}` : '')
          )
        );
      });
    }
  } else {
    records.forEach(r => {
      rows.push(
        (
          [
            pad(r.hash.slice(0, 8), 10),
            pad(r.author, 18),
            pad(r.date.replace(/ .+/, ''), 20),
            pad(r.message, 60)
          ].join(' | ') +
          (showGerrit ? ` | ${  pad(r.gerrit || '', 50)}` : '')
        )
      );
    });
  }

  return [header, line, ...rows].join('\n');
}
