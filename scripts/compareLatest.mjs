import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const commitsMod = await import(path.join(__dirname, '../output-wukong/data/commits.mjs'))
const overtimeMod = await import(path.join(__dirname, '../output-wukong/data/overtime.latest.commit.day.mjs'))
const commits = commitsMod.default || commitsMod
const overtimeLatest = overtimeMod.default || overtimeMod

function formatDateYMD(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function computeLatestByDayLocal(commits, startHour = 9, endHour = 18, cutoff = 6) {
  const cutoffHour = cutoff || 6
  const dayGroups = {}
  commits.forEach((c) => {
    const d = new Date(c.date)
    if (isNaN(d.getTime())) return
    const dateStr = formatDateYMD(d)
    if (!dayGroups[dateStr]) dayGroups[dateStr] = []
    dayGroups[dateStr].push(c)
  })

  const dayKeys = Object.keys(dayGroups).sort()
  const virtualPrevDays = new Set()
  commits.forEach((c) => {
    const d = new Date(c.date)
    if (isNaN(d.getTime())) return
    const h = d.getHours()
    if (h < 0 || h >= cutoffHour || h >= startHour) return
    const prevDate = new Date(d)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDay = formatDateYMD(prevDate)
    if (!dayGroups[prevDay]) virtualPrevDays.add(prevDay)
  })

  const allDayKeys = Array.from(new Set([...dayKeys, ...virtualPrevDays])).sort()

  const latestByDay = allDayKeys.map((k) => {
    const list = dayGroups[k] || []
    const sameDayHours = list
      .map((c) => new Date(c.date))
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.getHours())
      .filter((h) => h >= endHour && h < 24)

    const nextDate = new Date(`${k}T00:00:00`)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextKey = formatDateYMD(nextDate)
    const early = dayGroups[nextKey] || []
    const earlyHours = early
      .map((c) => new Date(c.date))
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.getHours())
      .filter((h) => h >= 0 && h < cutoffHour && h < startHour)

    const overtimeValues = [...sameDayHours, ...earlyHours.map((h) => 24 + h)]
    if (overtimeValues.length === 0) return { date: k, latestHour: null, latestHourNormalized: null }
    const latestHourNormalized = Math.max(...overtimeValues)
    const sameDayMax = sameDayHours.length > 0 ? Math.max(...sameDayHours) : null
    return { date: k, latestHour: sameDayMax, latestHourNormalized }
  })

  return latestByDay
}

async function main() {
  console.log('Computing frontend-style latestByDay from commits...')
  const computed = computeLatestByDayLocal(commits)
  const byDate = {}
  computed.forEach((d) => { byDate[d.date] = d })

  const mismatches = []
  overtimeLatest.forEach((o) => {
    const comp = byDate[o.date]
    if (!comp) {
      mismatches.push({ date: o.date, reason: 'missing-in-computed', expected: o, actual: null })
      return
    }
    const expNorm = o.latestHourNormalized
    const actNorm = comp.latestHourNormalized
    if (expNorm !== actNorm) {
      mismatches.push({ date: o.date, expected: o, actual: comp })
    }
  })

  if (mismatches.length === 0) {
    console.log('No mismatches: computed latestByDay matches overtime.latest.commit.day.mjs')
  } else {
    console.log(`Found ${mismatches.length} mismatches:`)
    mismatches.slice(0, 50).forEach((m) => {
      console.log('---')
      console.log(m.date)
      console.log(' expected:', m.expected)
      console.log(' actual :', m.actual)
    })
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
