/**
 * @file: configStore.mjs
 * @description:
 * 配置存储与加载模块。
 命令参数优先级：
   CLI > RC文件 > 内置默认值 (DEFAULT_CONFIG)。
   出厂配置 < 用户全局配置 < 项目配置 < 命令行参数

 * @author: King Monkey
 * @created: 2026-01-01 00:51
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import yaml from 'yaml'

// 1. 定义出厂默认配置（底座）
export const DEFAULT_CONFIG = {
  git: { noMerges: true, limit: 5000 },
  period: { groupBy: 'month' },
  worktime: {
    country: 'CN',
    start: 9,
    end: 18,
    lunch: { start: 12, end: 14 },
    overnightCutoff: 6
  },
  output: {
    dir: 'output-wukong',
    formats: ['text'],
    perPeriod: { enabled: true, excelMode: 'sheets' }
  }
}

const RC_NAMES = ['.wukonggitlogrc', '.wukonggitlogrc.yml', '.wukonggitlogrc.json']

// 深度合并工具函数（保持内部逻辑自包含）
function deepMerge(target, source) {
  const result = { ...target }
  if (!source) return result

  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

let cachedConfig = null

export function loadRcConfig(cwd = process.cwd()) {
  if (cachedConfig) return cachedConfig

  // 2. 这里的顺序决定了优先级：全局 < 当前项目
  const searchPaths = [
    path.join(os.homedir(), '.wukonggitlogrc'), // 用户家目录下的全局配置
    ...RC_NAMES.map(name => path.join(cwd, name)) // 当前项目目录
  ]

  let config = { ...DEFAULT_CONFIG }

  for (const filePath of searchPaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const parsed = filePath.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw)
        // 3. 逐层覆盖
        config = deepMerge(config, parsed)
      } catch (e) {
        console.warn(`[Config] 无法解析配置文件: ${filePath}`, e.message)
      }
    }
  }

  cachedConfig = config
  return cachedConfig
}

export function getRcConfig() {
  return cachedConfig || loadRcConfig()
}
