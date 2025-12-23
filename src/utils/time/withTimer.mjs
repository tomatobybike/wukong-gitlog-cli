// utils/withTimer.js
import { createTimer } from './timer.mjs'

export const withTimer = async (label, fn, opts) => {
  const timer = createTimer(label, opts)
  try {
    return await fn()
  } finally {
    timer.stop()
  }
}
