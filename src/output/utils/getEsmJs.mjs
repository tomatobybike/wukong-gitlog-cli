/**
 * @file: getEsmJs.mjs
 * @description:生成ESM文件内容的工具函数
 * @author: King Monkey
 * @created: 2026-01-02 00:03
 */

export const getEsmJs = (data) => {
  return `export default ${JSON.stringify(data, null, 2)};\n`
}
