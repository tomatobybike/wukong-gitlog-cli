/**
 * @file: parseOptions.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:24
 */
import { resolveBool, resolveValue } from '#src/utils/resolve.mjs'

import { loadRcConfig } from '../infra/configStore.mjs'

/**
 * 深度合并辅助函数 (如果你的项目里没引入 lodash，可以直接用这个)
 */
function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

export async function parseOptions(cliOpts) {
  // 1. 加载“底座”配置（此时已包含：出厂默认 + RC文件）
  // 确保拿到 baseConfig
  const baseConfig = await loadRcConfig()

  const overtime = resolveBool(cliOpts.overtime, baseConfig?.overtime, false)

  const country = resolveValue(
    cliOpts.country,
    baseConfig?.worktime?.country,
    'CN'
  )

  // 2. 将扁平的 CLI 参数映射为嵌套结构 (与 RC 结构对齐)
  // 注意：只有当 CLI 确实传了值时，才映射到对象里，否则保持 undefined
  const mappedCli = {
    author: cliOpts.author,
    email: cliOpts.email,
    git: {
      merges: cliOpts.merges,
      limit: cliOpts.limit
    },
    period: {
      groupBy: cliOpts.groupBy,
      since: cliOpts.since,
      until: cliOpts.until
    },
    overtime,
    gerrit: {
      prefix: cliOpts.gerrit,
      api: cliOpts.gerritApi,
      auth: cliOpts.gerritAuth
    },
    worktime: {
      country,
      start: cliOpts.workStart,
      end: cliOpts.workEnd,
      overnightCutoff: cliOpts.overnightCutoff,
      // 只有当传了任何一个午休参数时才生成 lunch 对象
      lunch:
        cliOpts.lunchStart || cliOpts.lunchEnd
          ? {
              start: cliOpts.lunchStart,
              end: cliOpts.lunchEnd
            }
          : undefined
    },
    output: {
      out: cliOpts.out, // export 导出文件名
      dir: cliOpts.outParent ? '../output-wukong' : cliOpts.outDir,
      formats: cliOpts.format ? cliOpts.format : undefined,
      perPeriod: {
        // formats: cliOpts.perPeriodFormats?.split(','),
        formats: String(cliOpts.perPeriodFormats || '')
          .split(',')
          .map((s) =>
            String(s || '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean),
        excelMode: cliOpts.perPeriodExcelMode,
        only: cliOpts.perPeriodOnly
      }
    },
    serve: {
      port: cliOpts.port
    },
    profile: {
      enabled: cliOpts.profile,
      flame: cliOpts.flame || true,
      traceFile: cliOpts.traceFile || 'trace.json',
      hotThreshold: cliOpts.hotThreshold || 0.8,
      diffThreshold: cliOpts.diffThreshold || 0.2,
      failOnHot: cliOpts.failOnHot || false,
      diffBaseFile: cliOpts.diffBaseFile || 'baseline.json'
      /*
      enabled: true,
      flame: true,
      traceFile: 'trace.json',
      hotThreshold: 0.8,
      failOnHot: true,
      diffBaseFile: 'baseline.json',
      diffThreshold: 0.2
      */
    }
  }

  // 3. 终极合并：用映射后的 CLI 配置 覆盖 底座配置
  const finalConfig = deepMerge(baseConfig, mappedCli)

  // 4. 最后做一点“路径标准化”或“格式转换”
  // 例如：如果 format 选了 json，自动勾选 cliOpts.json
  if (cliOpts.json) {
    finalConfig.output.formats = Array.from(
      new Set([...finalConfig.output.formats, 'json'])
    )
  }

  return finalConfig
}
