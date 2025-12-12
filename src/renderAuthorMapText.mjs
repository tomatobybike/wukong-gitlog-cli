/**
 * 输出 authorMap 映射表文本
 * @param {Record<string,string>} authorMap - email -> normalized author name
 * @param {Object} opts
 * @param {boolean} opts.showHeader - 是否显示表头
 * @returns {string} 文本内容
 */
export function renderAuthorMapText(authorMap, opts = {}) {
  const { showHeader = true } = opts
  const pad = (s, n) => (s.length >= n ? `${s.slice(0, n - 1)}…` : s + ' '.repeat(n - s.length))

  const header = showHeader ? `${pad('Email', 30)} | ${pad('Author', 20)}` : ''
  const line = showHeader ? '-'.repeat(header.length) : ''

  const rows = []
  for (const [email, author] of Object.entries(authorMap)) {
    rows.push(`${pad(email, 30)} | ${pad(author, 20)}`)
  }

  return showHeader ? [header, line, ...rows].join('\n') : rows.join('\n')
}
