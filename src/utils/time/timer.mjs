// utils/timer.js
import chalk from 'chalk'

const ENABLED = process.env.CLI_TIMER !== 'false'

const formatTime = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${(ms / 60000).toFixed(2)} min`
}

export const createTimer = (label, { silent = false } = {}) => {
  const start = process.hrtime.bigint()

  const stop = (suffix) => {
    if (!ENABLED || silent) return

    const end = process.hrtime.bigint()
    const ms = Number(end - start) / 1e6

    console.log(
      chalk.cyan('⏱'),
      chalk.white(label),
      suffix ? chalk.gray(`(${suffix})`) : '',
      chalk.bold.yellow(formatTime(ms))
    )

    return ms
  }

  return { stop }
}
