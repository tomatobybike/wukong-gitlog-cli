/* ---------------- helpers ---------------- */

function buildHeaders(auth) {
  if (!auth) return {}
  if (auth.includes(':')) {
    return {
      Authorization: `Basic ${Buffer.from(auth).toString('base64')}`
    }
  }
  return { Authorization: `Bearer ${auth}` }
}

function buildGerritUrl(prefix, record, changeNumber) {
  if (prefix.includes('{{changeNumber}}')) {
    return prefix.replace(
      '{{changeNumber}}',
      changeNumber || record.changeId || record.hash
    )
  }
  if (prefix.includes('{{changeId}}')) {
    return prefix.replace('{{changeId}}', record.changeId || record.hash)
  }
  if (prefix.includes('{{hash}}')) {
    return prefix.replace('{{hash}}', record.hash)
  }
  return prefix.endsWith('/')
    ? `${prefix}${record.hash}`
    : `${prefix}/${record.hash}`
}


/**
 * @param {Object[]} records
 * @param {Object} config
 * @param {string} config.prefix
 * @param {string} [config.api]
 * @param {string} [config.auth]
 */
export async function resolveGerrit(records, config) {
  const { prefix, api, auth } = config
  if (!prefix) return records

  const cache = new Map()
  const headers = buildHeaders(auth)

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, { headers })
      const txt = await res.text()
      return JSON.parse(txt.replace(/^\)\]\}'\n/, ''))
    } catch {
      return null
    }
  }

  const resolveChangeNumber = async (record) => {
    if (!api) return null

    const key = record.changeId || record.hash
    if (!key) return null
    if (cache.has(key)) return cache.get(key)

    let json = null

    if (record.changeId) {
      json = await fetchJson(
        `${api}/changes/${encodeURIComponent(record.changeId)}/detail`
      )
      if (!json?._number) {
        json = await fetchJson(
          `${api}/changes/?q=change:${encodeURIComponent(record.changeId)}`
        )
      }
    }

    if (!json && record.hash) {
      json = await fetchJson(
        `${api}/changes/?q=commit:${encodeURIComponent(record.hash)}`
      )
    }

    const num = Array.isArray(json) ? json?.[0]?._number : json?._number
    cache.set(key, num || null)
    return num || null
  }

  return Promise.all(
    records.map(async (r) => {
      let changeNumber = null

      if (prefix.includes('{{changeNumber}}')) {
        changeNumber = await resolveChangeNumber(r)
      }

      return {
        ...r,
        gerrit: buildGerritUrl(prefix, r, changeNumber)
      }
    })
  )
}

