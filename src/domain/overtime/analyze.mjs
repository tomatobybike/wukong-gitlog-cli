// export function analyzeOvertime(records, worktime) {
//   // 你现在的 createOvertimeStats 逻辑
//   return {
//     summary: {},
//     byAuthor: {},
//     byDay: {}
//   }
// }


export function analyzeOvertime(records, worktime) {
  const stats = {
    total: records.length,
    offWork: 0,
    weekend: 0,
    byAuthor: {}
  }

  records.forEach((r) => {
    const d = new Date(r.date)
    const hour = d.getHours()
    const day = d.getDay()

    const isWeekend = day === 0 || day === 6
    const isOffWork =
      hour < worktime.start ||
      hour >= worktime.end ||
      (hour >= worktime.lunch.start && hour < worktime.lunch.end)

    if (isWeekend) stats.weekend++
    if (isOffWork) stats.offWork++

    const name = r.author
    stats.byAuthor[name] ||= { total: 0, offWork: 0 }
    stats.byAuthor[name].total++
    if (isOffWork) stats.byAuthor[name].offWork++
  })

  return stats
}
