// analyzeOvertimeCached.mjs
import { memoize } from '../lib/memoize.mjs'
import {
  analyzeOvertime
} from './overtime.mjs'

export const analyzeOvertimeCached = memoize(analyzeOvertime)
