const store = {
  debug: false,
}

export function setConfig(key, value) {
  store[key] = value
}

export function getConfig(key) {
  return store[key]
}
