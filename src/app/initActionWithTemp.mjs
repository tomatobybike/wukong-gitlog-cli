/**
 * @file: initActionWithTemp.mjs
 * @description: 使用 @inquirer/prompts 初始化带详细注释的配置文件
 * @author: King Monkey
 */
import { confirm, select } from '@inquirer/prompts'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

import { t } from '../i18n/index.mjs'
import { DEFAULT_CONFIG, RC_NAMES } from '../infra/configStore.mjs'

// 动态生成 YAML 模板
const getYamlTemplate =
  () => `# ---------------------------------------------------------
# Wukong GitLog Config (.wukonggitlogrc.yml)
# ${t('template.generated_at')}: ${new Date().toLocaleString()}
# ---------------------------------------------------------

# ${t('template.author_config')}
author:
  include: []    # ${t('template.author_include')}
  exclude: []    # ${t('template.author_exclude')}

# ${t('template.git_config')}
git:
  merges: true     # ${t('template.git_merges')}
  limit: 5000      # ${t('template.git_limit')}

# ${t('template.period_config')}
period:
  groupBy: month   # ${t('template.period_group')}
  since: ""        # ${t('template.period_since')}
  until: ""        # ${t('template.period_until')}

# ${t('template.gerrit_config')}
gerrit:
  prefix: ""       # Example: https://gerrit.xxx.com/c/{{changeNumber}}
  api: ""          # Gerrit API URL
  auth: ""         # "user:pass" or "TOKEN"

# ${t('template.worktime_config')}
worktime:
  country: CN        # ${t('template.worktime_country')}
  start: 9           # ${t('template.worktime_start')} (0-23)
  end: 18            # ${t('template.worktime_end')} (0-23)
  lunch:
    start: 12        # ${t('template.worktime_lunch')} start
    end: 14          # ${t('template.worktime_lunch')} end
  overnightCutoff: 6 # ${t('template.worktime_cutoff')}

# ${t('template.output_config')}
output:
  dir: "output-wukong"         # ${t('template.output_dir')}
  formats: ["text", "excel"]   # ${t('template.output_formats')}
  perPeriod:
    enabled: true              # ${t('template.output_per_period')}
    excelMode: "sheets"        # sheets | files

# ${t('template.author_aliases')}
authorAliases: {}
`

// 动态生成 JS 模板
const getJsTemplate = () => `/**
 * Wukong GitLog Config (.wukonggitlogrc.js)
 * ${t('template.generated_at')}: ${new Date().toLocaleString()}
 */
export default {
  // ${t('template.author_config')}
  author: {
    include: [],    // ${t('template.author_include')}
    exclude: []     // ${t('template.author_exclude')}
  },

  // ${t('template.git_config')}
  git: {
    merges: true,
    limit: 5000
  },

  // ${t('template.worktime_config')}
  worktime: {
    country: 'CN',
    start: 9,
    end: 18,
    lunch: { start: 12, end: 14 },
    overnightCutoff: 6
  },

  // ${t('template.author_aliases')}
  authorAliases: {},

  // ${t('template.output_config')}
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
    const hasAllConfigs =
      configFiles.length && configFiles.every((f) => content.includes(f))
    if (hasOutput && hasAllConfigs) return

    const shouldAdd = await confirm({
      message: t('init.gitignore_ask'), // `是否自动将报告目录 "${outputDir}/" 以及配置文件名添加到 .gitignore?`,
      default: true
    })

    if (shouldAdd) {
      const prefix = content.endsWith('\n') ? '' : '\n'
      let entry = `${prefix}\n# Wukong GitLog Reports\n`
      if (!hasOutput) entry += `${outputDir}/\n`

      const missingConfigs = configFiles.filter((f) => !content.includes(f))
      if (missingConfigs.length) {
        entry += `\n# Wukong GitLog Config\n${missingConfigs.map((f) => `${f}\n`).join('')}`
      }

      fs.appendFileSync(gitignorePath, entry, 'utf8')
      console.log(`✅ ${t('init.gitignore_updated')}`)
    }
  } catch (err) {
    if (err.name !== 'ExitPromptError') {
      console.warn(`⚠️ ${t('init.gitignore_warn')} ${err.message}`)
    }
  }
}

export async function initActionWithTemp(options) {
  console.log(`\n🚀 Wukong GitLog ${t('init.title')}\n`)

  try {
    const format = await select({
      message: t('init.select_format'),
      choices: [
        { name: t('init.formats.mjs'), value: 'mjs' },
        { name: t('init.formats.js'), value: 'js' },
        { name: t('init.formats.yaml'), value: 'yaml' },
        { name: t('init.formats.json'), value: 'json' },
        { name: t('init.formats.plain'), value: 'plain' }
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
      console.error(`\n❌ ${t('init.error_exists')} (${fileName})`)
      return
    }

    let content = ''
    if (format === 'js' || format === 'mjs') content = getJsTemplate()
    else if (format === 'yaml' || format === 'plain')
      content = getYamlTemplate()
    else content = JSON.stringify(DEFAULT_CONFIG, null, 2)

    fs.writeFileSync(targetPath, content, 'utf8')
    console.log(`✅ ${t('init.success_created')} ${chalk.green(fileName)}`)

    await manageGitignore(DEFAULT_CONFIG.output.dir)
    console.log(`\n✨ ${t('init.complete')}\n`)
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(`\n👋 ${t('init.cancel')}`)
    } else {
      console.error(`\n❌ ${t('init.fail')} ${err.message}`)
    }
  }
}
