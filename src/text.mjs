import { renderAuthorChangeStatsText } from './stats-text.mjs'
import { buildAuthorChangeStats } from './stats.mjs'

export function renderText(records, groups = null, opts = {}) {
  const { showGerrit = false } = opts
  const pad = (s, n) =>
    s.length >= n ? `${s.slice(0, n - 1)}…` : s + ' '.repeat(n - s.length)

  const baseHeader = `${pad('Hash', 10)} | ${pad('Author', 18)} | ${pad(
    'Date',
    20
  )} | ${pad('Message', 40)} | ${pad('Changed', 8)}` // ★ 新增 changed 列

  const gerritHeader = showGerrit ? ` | ${pad('Gerrit', 50)}` : ''
  const header = baseHeader + gerritHeader

  const line = '-'.repeat(header.length)

  const rows = []

  const buildRow = (r) => {
    return (
      [
        pad(r.hash.slice(0, 8), 10),
        pad(r.author, 18),
        pad(r.date.replace(/ .+/, ''), 20),
        pad(r.message, 40),
        pad(String(r.changed ?? 0), 8) // ★ 输出 changed 数量
      ].join(' | ') + (showGerrit ? ` | ${pad(r.gerrit || '', 50)}` : '')
    )
  }

  if (groups) {
    for (const [g, list] of Object.entries(groups)) {
      rows.push(`\n=== ${g} ===\n`)
      list.forEach((r) => rows.push(buildRow(r)))
    }
  } else {
    records.forEach((r) => rows.push(buildRow(r)))
  }

  return [header, line, ...rows].join('\n')
}

export function renderChangedLinesText(records, opts = {}) {
  const stats = buildAuthorChangeStats(records)

  const result = renderAuthorChangeStatsText(stats, opts)

  return result
}
