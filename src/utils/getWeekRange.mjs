import dayjs from 'dayjs'

/** 将 "2025-W48" → { start: '2025-11-24', end: '2025-11-30' } */
export function getWeekRange(periodStr) {
  // periodStr = "2025-W48"
  const [year, w] = periodStr.split('-W')
  const week = parseInt(w, 10)

  const start = dayjs().year(year).isoWeek(week).startOf('week') // Monday
  const end = dayjs().year(year).isoWeek(week).endOf('week') // Sunday

  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  }
}
