// utils/scopeTimer.js
import chalk from 'chalk'

const formatTime = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${(ms / 60000).toFixed(2)} min`
}

export const createScopeTimer = (scope) => {
  const start = process.hrtime.bigint()
  let last = start

  const step = (label) => {
    const now = process.hrtime.bigint()
    const ms = Number(now - last) / 1e6
    last = now

    console.log(
      chalk.gray('  ├─'),
      chalk.white(label),
      chalk.yellow(formatTime(ms))
    )
  }

  const end = () => {
    const total = Number(process.hrtime.bigint() - start) / 1e6
    console.log(
      chalk.cyan('⏱'),
      chalk.bold(scope),
      chalk.yellow(formatTime(total))
    )
  }

  return { step, end }
}
