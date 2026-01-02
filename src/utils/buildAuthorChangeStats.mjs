import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'

dayjs.extend(isoWeek)

/**
 * 自动统计每个作者的日/周/月 changed
 *
 * records: [{
 *   author: 'Tom',
 *   date: '2025-01-01T12:00:00Z',
 *   changed: 123
 * }]
 */
export function buildAuthorChangeStats(records) {
  const result = {
    daily: {}, // { author: { 'YYYY-MM-DD': x } }
    weekly: {}, // { author: { 'YYYY-WW': x } }
    monthly: {} // { author: { 'YYYY-MM': x } }
  }

  for (const r of records) {
    const author = r.author || 'Unknown'
    const changed = Number(r.changed || 0)

    const d = dayjs(r.date)

    const dayKey = d.format('YYYY-MM-DD')
    const weekKey = `${d.format('GGGG')}-W${d.isoWeek().toString().padStart(2, '0')}`
    const monthKey = d.format('YYYY-MM')

    if (!result.daily[author]) result.daily[author] = {}
    if (!result.weekly[author]) result.weekly[author] = {}
    if (!result.monthly[author]) result.monthly[author] = {}

    result.daily[author][dayKey] = (result.daily[author][dayKey] || 0) + changed
    result.weekly[author][weekKey] =
      (result.weekly[author][weekKey] || 0) + changed
    result.monthly[author][monthKey] =
      (result.monthly[author][monthKey] || 0) + changed
  }

  return result
}
