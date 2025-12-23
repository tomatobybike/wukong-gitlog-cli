import chalk from 'chalk'

const formatTime = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${(ms / 60000).toFixed(2)} min`
}

export const createProfiler = ({
  enabled = false,
  verbose = false,
  slowThreshold = 500,
  flame = false
} = {}) => {
  const start = process.hrtime.bigint()
  let last = start
  const events = []

  const nowMs = (a, b) => Number(b - a) / 1e6

  const step = (name, meta = {}) => {
    const now = process.hrtime.bigint()
    const duration = nowMs(last, now)
    last = now

    const event = {
      name,
      duration,
      sinceStart: nowMs(start, now),
      meta
    }
    events.push(event)

    if (enabled || verbose) {
      const isSlow = duration >= slowThreshold
      const bar = flame
        ? '█'.repeat(Math.min(40, Math.round(duration / 20)))
        : ''

      console.log(
        chalk.gray('  ├─'),
        isSlow ? chalk.red.bold(name) : chalk.white(name),
        chalk.yellow(formatTime(duration)),
        bar && chalk.gray(bar)
      )
    }
  }

  const end = (label = 'Total') => {
    const total = nowMs(start, process.hrtime.bigint())

    if (enabled || verbose) {
      console.log(
        chalk.cyan('⏱'),
        chalk.bold(label),
        chalk.yellow(formatTime(total))
      )
    }

    return {
      total,
      events
    }
  }

  return { step, end }
}
