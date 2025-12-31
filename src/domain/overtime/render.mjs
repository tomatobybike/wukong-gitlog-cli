export function renderOvertimeText(stats) {
  return `Total: ${stats.total}
Off-work: ${stats.offWork}
Weekend: ${stats.weekend}`
}

export function renderOvertimeCsv(stats) {
  return `total,offWork,weekend
${stats.total},${stats.offWork},${stats.weekend}`
}

export function renderOvertimeTab(stats) {
  return `total\toffWork\tweekend
${stats.total}\t${stats.offWork}\t${stats.weekend}`
}
