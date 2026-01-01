/**
 * 按邮箱自动归一化作者名字
 * - 中文名优先覆盖
 * - 同邮箱多个英文名保持第一个
 * - 保留原始 author 以便 debug
 */
export function createAuthorNormalizer() {
  const map = {} // email -> canonical name
  const originalMap = {} // email -> Set of original author names

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

    if (!e) return n || 'Unknown'

    // 记录原始 author
    if (!originalMap[e]) originalMap[e] = new Set()
    if (n) originalMap[e].add(n)

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
