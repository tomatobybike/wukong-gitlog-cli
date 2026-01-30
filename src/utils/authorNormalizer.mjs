/**
 * 按邮箱自动归一化作者名字
 * - 中文名优先覆盖
 * - 同邮箱多个英文名保持第一个
 * - 保留原始 author 以便 debug
 */
export function createAuthorNormalizer(aliases = {}) {
  const map = {} // email -> canonical name
  const originalMap = {} // email -> Set of original author names

  // 预处理别名配置：按 email/name 划分
  const aliasByEmail = {}
  const aliasByName = {}
  for (const [k, v] of Object.entries(aliases || {})) {
    const key = (k || '').trim()
    if (!key) continue
    if (key.includes('@')) aliasByEmail[key] = v
    else aliasByName[key] = v
  }

  function isChinese(str) {
    return /[\u4e00-\u9fa5]/.test(str)
  }

  function cleanName(str) {
    // eslint-disable-next-line no-misleading-character-class
    return (str || '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim()
  }

  function cleanEmail(str) {
    return (str || '').trim()
  }

  function getAuthor(name, email) {
    const n = cleanName(name)
    const e = cleanEmail(email)

    if (!e) {
      // 如果没有邮箱，先尝试按名字别名匹配
      if (n && aliasByName[n]) return aliasByName[n]
      return n || 'Unknown'
    }

    // 记录原始 author
    if (!originalMap[e]) originalMap[e] = new Set()
    if (n) originalMap[e].add(n)

    // 先检查 email 别名配置
    if (aliasByEmail[e]) {
      map[e] = aliasByEmail[e]
      return map[e]
    }

    // 再检查名字别名配置
    if (n && aliasByName[n]) {
      map[e] = aliasByName[n]
      return map[e]
    }

    const prev = map[e]

    // 中文名优先覆盖
    if (isChinese(n)) {
      map[e] = n
      return n
    }

    // 已有中文名 → 返回中文
    if (prev && isChinese(prev)) return prev

    // 首次出现英文名 → 记录
    if (!prev) map[e] = n

    return map[e]
  }

  return {
    getAuthor,
    getMap: () => map,
    getOriginalMap: () => {
      const res = {}
      for (const [email, names] of Object.entries(originalMap)) {
        res[email] = Array.from(names)
      }
      return res
    }
  }
}
