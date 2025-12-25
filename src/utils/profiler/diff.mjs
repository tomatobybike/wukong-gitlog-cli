export const diffProfiles = (prev, curr, threshold = 0.2) => {
  const map = new Map()

  prev.events.forEach(e => {
    map.set(e.name, e.duration)
  })

  const regressions = []

  curr.events.forEach(e => {
    const before = map.get(e.name)
    if (!before) return

    const diff = (e.duration - before) / before
    if (diff >= threshold) {
      regressions.push({
        name: e.name,
        before,
        after: e.duration,
        diff
      })
    }
  })

  return regressions
}
