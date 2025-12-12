// authorNormalizer.js

/**
 * 一个按邮箱自动归一化作者名字的工具。
 * - 优先使用中文姓名
 * - 如果同邮箱出现多个非中文名，保持第一个
 * - 保留原始 author 以防 debug
 */

export function createAuthorNormalizer() {
  const map = {} // email -> canonical name

  function isChinese(str) {
    return /[\u4e00-\u9fa5]/.test(str)
  }

  function getAuthor(name, email) {
    if (!email) return name

    const canonical = map[email]

    // 首次遇到这个邮箱 → 记录当前作者名
    if (!canonical) {
      map[email] = name
      return name
    }

    // 如果新的作者名是中文 → 覆盖旧的
    if (isChinese(name)) {
      map[email] = name
      return name
    }

    // 新名不是中文 → 返回已有中文（或旧名）
    return canonical
  }

  return {
    getAuthor,
    getMap: () => map
  }
}
