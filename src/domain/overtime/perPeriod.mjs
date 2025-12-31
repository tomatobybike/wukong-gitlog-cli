import { groupRecords } from '../../utils/groupRecords.mjs'
import { analyzeOvertime } from './analyze.mjs'

export function analyzeOvertimePerPeriod(records, worktime, period) {
  const groups = groupRecords(records, period)
  const result = {}

  Object.keys(groups)
    .sort()
    .forEach((key) => {
      result[key] = analyzeOvertime(groups[key], worktime)
    })

  return result
}
