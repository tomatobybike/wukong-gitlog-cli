import chalk from 'chalk'

/* ================= utils ================= */

const formatTime = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${(ms / 60000).toFixed(2)} min`
}

const makeBar = (ratio, width = 32) => {
  const len = Math.max(1, Math.round(ratio * width))
  return '█'.repeat(len)
}

/* ================= profiler ================= */

export const createProfiler = ({
  enabled = false,
  verbose = false,
  flame = false,
  slowThreshold = 500,   // ms
  hotThreshold = 0.8     // ratio (0~1)
} = {}) => {
  const start = process.hrtime.bigint()
  let last = start
  const events = []

  const toMs = (a, b) => Number(b - a) / 1e6

  /* -------- step -------- */
  const step = (name, meta = {}) => {
    const now = process.hrtime.bigint()
    const duration = toMs(last, now)
    last = now

    events.push({
      name,
      duration,
      sinceStart: toMs(start, now),
      meta
    })

    if (!enabled && !verbose) return

    const isSlow = duration >= slowThreshold

    console.log(
      chalk.gray('  ├─'),
      isSlow ? chalk.red.bold(name) : chalk.white(name),
      chalk.yellow(formatTime(duration))
    )
  }

  /* -------- end -------- */
  const end = (label = 'Total') => {
    const endTime = process.hrtime.bigint()
    const total = toMs(start, endTime)

    // 计算 HOT
    for (const e of events) {
      e.ratio = total > 0 ? e.duration / total : 0
      e.hot = e.ratio >= hotThreshold
    }

    if (enabled || verbose) {
      console.log(
        chalk.cyan('⏱'),
        chalk.bold(label),
        chalk.yellow(formatTime(total))
      )

      if (flame) {
        for (const e of events) {
          const bar = makeBar(e.ratio)
          const hotMark = e.hot ? chalk.red.bold(' 🔥 HOT') : ''
          const slowMark =
            !e.hot && e.duration >= slowThreshold
              ? chalk.yellow(' ⚠ SLOW')
              : ''

          console.log(
            chalk.gray('  ├─'),
            chalk.white(e.name.padEnd(24)),
            chalk.yellow(formatTime(e.duration)),
            chalk.gray(bar),
            hotMark || slowMark
          )
        }
      }
    }

    return {
      total,
      events
    }
  }

  return { step, end }
}
