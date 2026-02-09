/**
 * @file: defineOptions.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:30
 */
import { t } from '../i18n/index.mjs'
import { getPackage } from '../utils/getPackage.mjs'

// 辅助函数：统一 Int 解析
const toInt = (v, def) => (v ? parseInt(v, 10) : def)
const toFloat = (v) => parseFloat(v)

export function defineOptions(program) {
  const pkg = getPackage()
  program
    .name('wukong-gitlog')
    .version(pkg.version, '-v')
    .description('Advanced Git commit log exporter.')
    .option(
      '--author <name>',
      '指定 author,注意如果用户Git的user.name和user.email不规范,例如配置过不同的邮箱和name，应该通过--author-aliases 进行别名映射，并且不传递 --author 参数，以免过滤掉不规范的提交记录'
    )
    .option('--email <email>', '指定 email')
    .option('--since <date>', '起始日期')
    .option('--until <date>', '结束日期')
    .option('--limit <n>', '限制数量', parseInt)
    .option('--no-merges', '不包含 merge commit')
    .option('--numstat', '显示每次提交中更改的文件以及增删的行数统计')

    .option('--group-by <type>', '按日期分组: day | month | week | all ')
    .option('--format <type>', '输出格式: text | excel | json', 'text')

    .option('--stats', '输出每日统计数据')
    .option(
      '--gerrit <prefix>',
      '显示 Gerrit 地址，支持在 prefix 中使用 {{hash}} 占位符'
    )
    .option(
      '--gerrit-api <url>',
      '可选：Gerrit REST API 基础地址，用于解析 changeNumber，例如 `https://gerrit.example.com`'
    )
    .option(
      '--gerrit-auth <tokenOrUserPass>',
      '可选：Gerrit API 授权，格式为 `user:pass` 或 `TOKEN`（表示 Bearer token）'
    )

    .option('--overtime', '启用加班文化分析')

    .option('--country <code>', '节假日国家：CN 或 US，默认为 CN')
    .option(
      '--work-start <hour>',
      '上班开始小时，默认 9',
      (v) => parseInt(v, 10),
      9
    )
    .option(
      '--work-end <hour>',
      '下班小时，默认 18',
      (v) => parseInt(v, 10),
      18
    )
    .option(
      '--lunch-start <hour>',
      '午休开始小时，默认 12',
      (v) => parseInt(v, 10),
      12
    )
    .option(
      '--lunch-end <hour>',
      '午休结束小时，默认 14',
      (v) => parseInt(v, 10),
      14
    )
    .option(
      '--overnight-cutoff <hour>',
      '次日凌晨归并窗口（小时），默认 6',
      (v) => parseInt(v, 10),
      6
    )

    .option('--out <file>', '输出文件名（不含路径）')
    .option(
      '--out-dir <dir>',
      '自定义输出目录，支持相对路径或绝对路径，例如 `--out-dir ../output-wukong`'
    )
    .option(
      '--out-parent',
      '将输出目录放到当前工程的父目录的 `output-wukong/`（等同于 `--out-dir ../output-wukong`）'
    )
    .option(
      '--per-period-formats <formats>',
      '每个周期单独输出的格式，逗号分隔：text,csv,tab,xlsx。默认为空（不输出 CSV/Tab/XLSX）',
      ''
    )
    .option(
      '--per-period-excel-mode <mode>',
      'per-period Excel 模式：sheets|files（默认：sheets）',
      'sheets'
    )
    .option(
      '--per-period-only',
      '仅输出 per-period（month/week）文件，不输出合并的 monthly/weekly 汇总文件'
    )
    .option(
      '--port <n>',
      '本地 web 服务端口（默认 3000）',
      (v) => parseInt(v, 10),
      3000
    )
    .option('--debug', 'enable debug logs')

    .option('--profile', '输出性能分析 JSON')
    .option('--verbose', '显示详细性能日志')
    .option('--flame', '显示 flame-like 日志')
    .option('--trace <file>', '生成 Chrome Trace')
    .option('--hot-threshold <n>', 'HOT 比例阈值', parseFloat)
    .option('--fail-on-hot', 'HOT 时 CI 失败')
    .option('--diff-base <file>', '基线 profile.json')
    .option('--diff-threshold <n>', '回归阈值', parseFloat)

    .option('--version', 'show version information')
}


/**
 * 1. 基础程序信息（全局通用）
 */
export function setupBaseProgram(program) {
  const pkg = getPackage()
  program
    .name('wukong-gitlog')
    .version(pkg.version, '-v')
    .description(t('cli.desc'))
    .option('-l, --lang <type>', t('options.lang')) // 放在这里，让所有命令都能看到 help
    .option('--debug', t('options.debug'))
}

/**
 * 2. Git 数据源过滤参数 (Analyze, Export, Journal, Overtime 通用)
 */
export function addGitSourceOptions(cmd) {
  return cmd
    .option('--author <name>', t('options.author'))
    .option('--email <email>', t('options.email'))
    .option('--since <date>', t('options.since'))
    .option('--until <date>', t('options.until'))
    .option('--limit <n>', t('options.limit'), toInt)
    .option('--no-merges', t('options.no_merges'))
    .option('--numstat', t('options.numstat'))
    .option('--gerrit <prefix>', t('options.gerrit_prefix'))
    .option('--gerrit-api <url>', t('options.gerrit_api'))
    .option('--gerrit-auth <token>', t('options.gerrit_auth'))
}

/**
 * 3. 核心算法与统计参数 (Analyze, Overtime 通用)
 */
export function addAnalysisOptions(cmd) {
  return cmd
    .option('--country <code>', t('options.country'), 'CN')
    .option('--work-start <hour>', t('options.work_start'), toInt, 9)
    .option('--work-end <hour>', t('options.work_end'), toInt, 18)
    .option('--lunch-start <hour>', t('options.lunch_start'), toInt, 12)
    .option('--lunch-end <hour>', t('options.lunch_end'), toInt, 14)
    .option('--overnight-cutoff <hour>', t('options.overnight_cutoff'), toInt, 6)
    .option('--group-by <type>', t('options.group_by'), 'day') // 默认 day
    .option('--stats', t('options.stats'))
    .option('--overtime', t('options.overtime_mode'))
}

/**
 * 4. 文件导出与格式参数 (Export, Journal, Analyze)
 */
export function addOutputOptions(cmd) {
  return cmd
    .option('--format <type>', t('options.format'), 'text')
    .option('--out <file>', t('options.out_file'))
    .option('--out-dir <dir>', t('options.out_dir'))
    .option('--out-parent', t('options.out_parent'))
    .option('--per-period-formats <formats>', t('options.per_period_formats'), '')
    .option('--per-period-excel-mode <mode>', t('options.per_period_mode'), 'sheets')
    .option('--per-period-only', t('options.per_period_only'))
}

/**
 * 5. Web 服务专用参数
 */
export function addServeOptions(cmd) {
  return cmd
    .option('--port <n>', t('options.port'), toInt, 3000)
}

/**
 * 6. 性能追踪与调试 (通常用于 analyze)
 */
export function addPerformanceOptions(cmd) {
  return cmd
    .option('--profile', t('options.profile'))
    .option('--verbose', t('options.verbose'))
    .option('--flame', t('options.flame'))
    .option('--trace <file>', t('options.trace'))
    .option('--hot-threshold <n>', t('options.hot_threshold'), toFloat)
    .option('--fail-on-hot', t('options.fail_on_hot'))
    .option('--diff-base <file>', t('options.diff_base'))
    .option('--diff-threshold <n>', t('options.diff_threshold'), toFloat)
}
