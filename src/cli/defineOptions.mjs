/**
 * @file: defineOptions.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:30
 */
import { getPackage } from '../utils/getPackage.mjs'

export function defineOptions(program) {
  const pkg = getPackage()
  program
    .name('wukong-gitlog')
    .version(pkg.version, '-v')
    .description('Advanced Git commit log exporter.')
    .option('--author <name>', '指定 author 名')
    .option('--email <email>', '指定 email')
    .option('--since <date>', '起始日期')
    .option('--until <date>', '结束日期')
    .option('--limit <n>', '限制数量', parseInt)
    .option('--no-merges', '不包含 merge commit')

    .option('--group-by <type>', '按日期分组: day | month | week')
    .option('--format <type>', '输出格式: text | excel | json', 'text')
    .option('--json', '输出 JSON')

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

    .option('--overtime')

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
      '--serve',
      '启动本地 web 服务，查看提交统计（将在 output-wukong/data 下生成数据文件）'
    )
    .option(
      '--port <n>',
      '本地 web 服务端口（默认 3000）',
      (v) => parseInt(v, 10),
      3000
    )
    .option('--debug', 'enable debug logs')
    .option(
      '--serve-only',
      '仅启动 web 服务，不导出或分析数据（使用 output-wukong/data 中已有的数据）'
    )

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
