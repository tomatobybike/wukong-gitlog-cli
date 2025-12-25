import chalk from 'chalk'
import fs from 'fs'
import { formatTime, makeBar } from './format.mjs'
import { exportChromeTrace } from './trace.mjs'
import { diffProfiles } from './diff.mjs'

export const createProfiler = ({
  enabled = false,
  verbose = false,
  flame = false,
  slowThreshold = 500,
  hotThreshold = 0.8,
  traceFile,
  failOnHot = false,
  diffBaseFile,
  diffThreshold = 0.2
} = {}) => {
  const start = process.hrtime.bigint()


  const stack = []
  const events = []

  const toMs = (a, b) => Number(b - a) / 1e6

  /* ================= step ================= */

  const step = (name, fn) => {
    const parent = stack[stack.length - 1]
    const startTime = process.hrtime.bigint()

    const node = {
      name,
      start: toMs(start, startTime),
      duration: 0,
      depth: stack.length,
      children: []
    }

    if (parent) parent.children.push(node)
    stack.push(node)

    const finish = () => {
      const endTime = process.hrtime.bigint()
      node.duration = toMs(startTime, endTime)
      events.push(node)
      stack.pop()
    }

    if (typeof fn === 'function') {
      try {
        return fn()
      } finally {
        finish()
      }
    } else {
      finish()
    }
  }

  /* ================= end ================= */

  const end = (label = 'Total') => {
    const total = toMs(start, process.hrtime.bigint())

    let hasHot = false

    if (enabled || verbose) {
      console.log(
        chalk.cyan('⏱'),
        chalk.bold(label),
        chalk.yellow(formatTime(total))
      )

      if (flame) {
        for (const e of events) {
          const ratio = e.duration / total
          const hot = ratio >= hotThreshold
          const slow = e.duration >= slowThreshold

          if (hot) hasHot = true

          console.log(
            chalk.gray(`${'  '.repeat(e.depth)  }├─`),
            chalk.white(e.name.padEnd(22)),
            chalk.yellow(formatTime(e.duration)),
            chalk.gray(makeBar(ratio)),
            hot
              ? chalk.red.bold(' 🔥 HOT')
              : slow
              ? chalk.yellow(' ⚠ SLOW')
              : ''
          )
        }
      }
    }

    const profile = { total, events }

    /* ---------- Chrome Trace ---------- */

    if (traceFile) {
      exportChromeTrace(events, traceFile)
    }

    /* ---------- diff ---------- */
    if (diffBaseFile && fs.existsSync(diffBaseFile)) {
      const base = JSON.parse(fs.readFileSync(diffBaseFile, 'utf8'))
      const regressions = diffProfiles(base, profile, diffThreshold)

      if (regressions.length) {
        console.log(chalk.red('\n⚠ Performance Regression Detected:\n'))
        regressions.forEach(r => {
          console.log(
            chalk.red(
              `  ${r.name}: ${formatTime(r.before)} → ${formatTime(
                r.after
              )} (+${(r.diff * 100).toFixed(1)}%)`
            )
          )
        })
        process.exitCode = 1
      }
    }

    /* ---------- save profile ---------- */
    if (enabled) {
      fs.writeFileSync(
        'profile.json',
        JSON.stringify(profile, null, 2)
      )
    }

    /* ---------- CI HOT fail ---------- */
    if (failOnHot && hasHot) {
      console.log(chalk.red('\n🔥 HOT step detected — failing CI'))
      process.exitCode = 1
    }

    return profile
  }

  return { step, end }
}
