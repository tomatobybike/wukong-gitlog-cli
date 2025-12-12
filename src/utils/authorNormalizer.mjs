// authorNormalizer.js
/**
 * 按邮箱自动归一化作者名字
 * - 优先使用中文姓名
 * - 如果同邮箱出现多个非中文名，保持第一个
 * - 自动清理空格与不可见字符
 * - 保留原始 author 以便 debug
 */
export function createAuthorNormalizer() {
  const map = {} // email -> canonical name
  const originalMap = {} // email -> 原始所有 author 名

  function isChinese(str) {
    return /[\u4e00-\u9fa5]/.test(str)
  }

  function cleanName(str) {
    if (!str) return ''
    return str
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // 去零宽空格
      .replace(/\s+/g, ' ') // 多空格 -> 单空格
      .trim()
  }

  function cleanEmail(str) {
    return (str || '').trim()
  }

  function getAuthor(name, email) {
    const cleanedName = cleanName(name)
    const cleanedEmail = cleanEmail(email)

    if (!cleanedEmail) return cleanedName || 'Unknown'

    // 记录原始 author 便于 debug
    if (!originalMap[cleanedEmail]) originalMap[cleanedEmail] = new Set()
    if (cleanedName) originalMap[cleanedEmail].add(cleanedName)

    const canonical = map[cleanedEmail]

    // 首次遇到这个邮箱 → 记录当前作者名
    if (!canonical) {
      map[cleanedEmail] = cleanedName || cleanedEmail
      return map[cleanedEmail]
    }

    // 新名是中文 → 覆盖旧的
    if (isChinese(cleanedName)) {
      map[cleanedEmail] = cleanedName
      return map[cleanedEmail]
    }

    // 新名非中文 → 保留已有中文或旧名
    return canonical
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
