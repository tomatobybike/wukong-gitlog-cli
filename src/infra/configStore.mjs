/**
 * @file: configStore.mjs
 * @description: 配置存储与加载模块，支持 JS/MJS 动态配置。
* 配置存储与加载模块。
 命令参数优先级：
   CLI > RC文件 > 内置默认值 (DEFAULT_CONFIG)。
   出厂配置 < 用户全局配置 < 项目配置 < 命令行参数
* @author: King Monkey
 * @created: 2026-01-01 01:45
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import yaml from 'yaml'

// 1. 定义出厂默认配置（底座）
export const DEFAULT_CONFIG = {
  git: { merges: true, limit: undefined },
  period: { groupBy: 'month' },
  worktime: {
    country: 'CN',
    start: 9,
    end: 18,
    lunch: { start: 12, end: 14 },
    overnightCutoff: 6
  },
  output: {
    out: 'commits', //  文件名前缀
    dir: 'output-wukong',
    formats: ['text'],
    perPeriod: { enabled: true, excelMode: 'sheets' }
  }
}

// 配置文件名列表
const RC_NAMES = [
  '.wukonggitlogrc',
  '.wukonggitlogrc.js',
  '.wukonggitlogrc.mjs',
  '.wukonggitlogrc.yml',
  '.wukonggitlogrc.yaml',
  '.wukonggitlogrc.json'
]

function deepMerge(target, source) {
  const result = { ...target }
  if (!source) return result

  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      !Array.isArray(source[key]) &&
      key in target
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

let cachedConfig = null

/**
 * 核心加载逻辑：支持异步 import
 */
export async function loadRcConfig(cwd = process.cwd()) {
  if (cachedConfig) return cachedConfig

  // 优先级队列：家目录(全局) -> 当前项目目录
  const searchDirs = [os.homedir(), cwd]
  let config = { ...DEFAULT_CONFIG }

  for (const dir of searchDirs) {
    for (const name of RC_NAMES) {
      const filePath = path.join(dir, name)
      // eslint-disable-next-line no-continue
      if (!fs.existsSync(filePath)) continue

      try {
        let parsed = {}
        const ext = path.extname(filePath)

        if (
          ext === '.js' ||
          ext === '.mjs' ||
          (name.endsWith('.wukonggitlogrc') && !ext)
        ) {
          // 处理 JS/MJS 或 无后缀但可能是 JS 的文件
          // 必须转为 URL 格式以兼容 Windows 和 ESM 动态导入
          const fileUrl = pathToFileURL(filePath).href
          // eslint-disable-next-line no-await-in-loop
          const module = await import(`${fileUrl}?t=${Date.now()}`) // 加缓存击穿避免热更新问题
          parsed = module.default || module
        } else if (ext === '.json') {
          parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        } else {
          // 处理 YAML
          parsed = yaml.parse(fs.readFileSync(filePath, 'utf8'))
        }

        config = deepMerge(config, parsed)

      } catch (e) {
        console.warn(
          `[Config] 无法解析配置文件: ${filePath}\n原因: ${e.message}`
        )
      }
    }
  }

  cachedConfig = config
  return cachedConfig
}

/**
 * 获取已加载的配置，如果未加载则抛出异常或异步加载
 * 注意：由于支持了 JS，现在建议统一 await loadRcConfig()
 */
export function getRcConfig() {
  if (!cachedConfig) {
    throw new Error('Config not loaded. Please await loadRcConfig() first.')
  }
  return cachedConfig
}
