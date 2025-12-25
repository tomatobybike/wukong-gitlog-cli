export const formatTime = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${(ms / 60000).toFixed(2)} min`
}

export const makeBar = (ratio, width = 32) => {
  const len = Math.max(1, Math.round(ratio * width))
  return '█'.repeat(len)
}
