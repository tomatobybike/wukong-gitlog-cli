import osLocale from 'os-locale'; // 使用同步版本更适合 CLI 启动
import { resources } from './resources.mjs'

let currentRes = resources.en

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

/**
 * 初始化国际化
 * @param {string} forceLang - 用户通过 --lang 传入的强制语言
 */
export function initI18n(forceLang) {
  let lang = forceLang;

  // 如果用户没传 --lang，则自动检测系统语言
  if (!lang) {
    try {
      const locale = osLocale(); // 例如 'zh-CN'
      lang = locale.split('-')?.[0];   // 简化为 'zh'
    } catch (e) {
      lang = 'en'; // 报错则保底使用英文
    }
  }

  // 确保语言在我们的资源库中，否则回退到 en
  const targetLang = resources[lang] ? lang : 'en';
  currentRes = resources[targetLang];

  return targetLang;
}

export const t = (key, params = {}) => {
  const text = get(currentRes, key) ?? get(resources.en, key) ?? key
  return text.replace(/\{\{(.+?)\}\}/g, (_, p) => {
    const k = p.trim()
    return params[k] !== undefined ? String(params[k]) : `{{${k}}}`
  })
}
