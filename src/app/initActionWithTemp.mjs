/**
 * @file: initActionWithTemp.mjs
 * @description: 使用 @inquirer/prompts 初始化带详细注释的配置文件
 * @author: King Monkey
 */
import { confirm, select } from '@inquirer/prompts'
import fs from 'fs'
import path from 'path'

import { DEFAULT_CONFIG, RC_NAMES } from '../infra/configStore.mjs'




// 定义带注释的 YAML 模板，提升用户体验
const YAML_TEMPLATE = `# ---------------------------------------------------------
# Wukong GitLog 配置文件 (.wukonggitlogrc.yml)
# 生成时间: ${new Date().toLocaleString()}
# ---------------------------------------------------------

# 作者统计配置
author:
  include: []    # [数组] 只统计这些作者，留空表示全部。示例: ["King Monkey", "Wukong"]
  exclude: []    # [数组] 排除这些作者

# Git 提取配置
git:
  merges: true     # [布尔] 是否排除 merge commit
  limit: 5000        # [数字] 最大拉取提交数，防止大仓拉取过慢

# 统计周期配置
period:
  groupBy: month     # [枚举] 统计周期: day (天) | week (周) | month (月)
  since: ""          # [字符串] 起始日期 (YYYY-MM-DD)，留空则不限制
  until: ""          # [字符串] 截止日期 (YYYY-MM-DD)，留空则不限制

# Gerrit 链接转换 (可选)
gerrit:
  prefix: ""         # 示例: https://gerrit.xxx.com/c/{{changeNumber}}
  api: ""            # Gerrit API 地址
  auth: ""           # 格式: "user:pass" 或 "TOKEN"

# 工作时间与加班计算配置
worktime:
  country: CN        # [字符串] 国家代码 (CN/US)，用于识别法定节假日
  start: 9           # [数字] 工作日开始时间 (0-23)
  end: 18            # [数字] 工作日结束时间 (0-23)
  lunch:
    start: 12        # [数字] 午休开始时间
    end: 14          # [数字] 午休结束时间
  overnightCutoff: 6 # [数字] 凌晨截止点。例如 6 表示凌晨 0-6 点的提交归属于前一天

# 输出与报告配置
output:
  dir: "output-wukong"   # [字符串] 报告输出目录名
  formats: ["text", "excel"] # [数组] 输出格式: text, json, excel
  perPeriod:
    enabled: true        # [布尔] 是否按周期 (月/周) 生成单独的明细文件
    excelMode: "sheets"  # [枚举] sheets (一文件多页) | files (一周期一个独立文件)

# 作者别名映射：将邮箱或原始显示名映射为规范化作者名
authorAliases: {}
`

// JS 模板 (支持逻辑，适合高级用户)
const JS_TEMPLATE = `/**
 * Wukong GitLog 配置文件 (.wukonggitlogrc.js)
 * 生成时间: ${new Date().toLocaleString()}
 */
export default {
  // 作者统计配置
  author: {
    include: [],    // 只统计这些作者
    exclude: []     // 排除这些作者
  },

  // Git 提取配置
  git: {
    merges: true,
    limit: 5000
  },

  // 工作时间与加班计算
  worktime: {
    country: 'CN',
    start: 9,
    end: 18,
    lunch: { start: 12, end: 14 },
    overnightCutoff: 6
  },

  // 用户自定义的作者别名映射（key 可以是邮箱或原始作者名）
  authorAliases: {},

  // 输出与报告
  output: {
    dir: 'output-wukong',
    formats: ['text', 'excel'],
    perPeriod: { enabled: true, excelMode: 'sheets' }
  }
};
`

async function manageGitignore(outputDir) {
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (!fs.existsSync(gitignorePath)) return

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8')

    // 使用从 configStore 导出的 RC_NAMES
    const configFiles = Array.isArray(RC_NAMES) ? RC_NAMES : []

    const hasOutput = content.includes(outputDir)
    const hasAllConfigs = configFiles.length && configFiles.every((f) => content.includes(f))
    if (hasOutput && hasAllConfigs) return

    const shouldAdd = await confirm({
      message: `是否自动将报告目录 "${outputDir}/" 以及配置文件名添加到 .gitignore?`,
      default: true
    })

    if (shouldAdd) {
      const prefix = content.endsWith('\n') ? '' : '\n'
      let entry = `${prefix}\n# Wukong GitLog Reports\n`
      if (!hasOutput) entry += `${outputDir}/\n`

      const missingConfigs = configFiles.filter((f) => !content.includes(f))
      if (missingConfigs.length) {
        entry += `\n# Wukong GitLog Config\n${  missingConfigs.map((f) => `${f}\n`).join('')}`
      }

      fs.appendFileSync(gitignorePath, entry, 'utf8')
      console.log(`✅ 已更新 .gitignore`)
    }
  } catch (err) {
    if (err.name !== 'ExitPromptError') {
      console.warn(`⚠️ 无法更新 .gitignore: ${err.message}`)
    }
  }
}



export async function initActionWithTemp(options) {
  console.log(`\n🚀 ${'Wukong GitLog'} 配置文件初始化\n`)

  try {
    const format = await select({
      message: '请选择要生成的配置文件格式:',
      choices: [
        { name: 'ES Module (.mjs)', value: 'mjs' },
        { name: 'JavaScript (灵活，支持逻辑)', value: 'js' },
        { name: 'YAML (推荐，带详细中文注释)', value: 'yaml' },
        { name: 'JSON (标准格式)', value: 'json' },
        { name: 'YAML 无后缀 (.wukonggitlogrc)', value: 'plain' }
      ]
    })

    const fileNameMap = {
      mjs: '.wukonggitlogrc.mjs',
      js: '.wukonggitlogrc.js',
      yaml: '.wukonggitlogrc.yml',
      json: '.wukonggitlogrc.json',
      plain: '.wukonggitlogrc'
    }

    const fileName = fileNameMap[format]
    const targetPath = path.join(process.cwd(), fileName)

    if (fs.existsSync(targetPath) && !options.force) {
      console.error(`\n❌ 错误: 当前目录已存在 ${fileName}`)
      return
    }

    let content = ''
    if (format === 'js' || format === 'mjs') content = JS_TEMPLATE
    else if (format === 'yaml' || format === 'plain') content = YAML_TEMPLATE
    else content = JSON.stringify(DEFAULT_CONFIG, null, 2)

    fs.writeFileSync(targetPath, content, 'utf8')
    console.log(`✅ 成功生成配置: ${fileName}`)

    await manageGitignore(DEFAULT_CONFIG.output.dir)
    console.log(`\n✨ 初始化完成！\n`)
  } catch (err) {
    if (err.name === 'ExitPromptError') console.log('\n👋 已取消初始化')
    else console.error(`\n❌ 初始化失败: ${err.message}`)
  }
}

