import fs from 'fs'

export const exportChromeTrace = (events, file) => {
  const traceEvents = []

  for (const e of events) {
    traceEvents.push({
      name: e.name,
      cat: 'cli',
      ph: 'X',                 // complete event
      ts: e.start * 1000,      // μs
      dur: e.duration * 1000,  // μs
      pid: 1,
      tid: e.depth || 0
    })
  }

  const trace = {
    traceEvents,
    displayTimeUnit: 'ms'
  }

  fs.writeFileSync(file, JSON.stringify(trace, null, 2))
  // TODO: remove debug log before production
  console.log('✅', 'file', file);
}
