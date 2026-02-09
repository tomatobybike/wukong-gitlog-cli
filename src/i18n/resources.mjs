/**
 * @file: resources.mjs
 * @description: 国际化资源字典
 */
export const resources = {
  zh: {
    cli: {
      desc: '悟空 Gitlog：高级 Git 提交记录分析与导出工具'
    },
    cmds: {
      init: '在当前目录初始化配置文件模板',
      analyze: '分析 Git 提交记录（核心功能）',
      overtime: '分析加班文化',
      export: '导出记录 (Excel / CSV / JSON)',
      journal: '生成每日日报',
      serve: '启动本地 Web 预览服务'
    },
    options: {
      // 全局
      lang: '指定语言 (zh/en)',
      debug: '启用调试日志',

      // Git 过滤相关
      author: '指定 author (建议配合别名映射使用)',
      email: '指定 email',
      since: '起始日期 (YYYY-MM-DD)',
      until: '结束日期 (YYYY-MM-DD)',
      limit: '限制解析的提交数量',
      no_merges: '不包含 merge commit',
      numstat: '统计增删行数 (涉及文件变更统计)',
      gerrit_prefix: 'Gerrit 地址前缀 (支持 {{hash}} 占位符)',
      gerrit_api: 'Gerrit REST API 基础地址',
      gerrit_auth: 'Gerrit API 授权 (user:pass 或 Token)',

      // 分析与加班相关
      country: '节假日国家 (CN/US)',
      work_start: '上班开始小时 (默认 9)',
      work_end: '下班小时 (默认 18)',
      lunch_start: '午休开始小时 (默认 12)',
      lunch_end: '午休结束小时 (默认 14)',
      overnight_cutoff: '次日凌晨归并窗口小时 (默认 6)',
      overtime_mode: '启用加班文化分析模式',
      group_by: '分组维度: day | month | week | all',
      stats: '输出每日统计数据',

      // 输出与导出
      format: '输出格式: text | excel | json',
      out_file: '输出文件名（不含路径）',
      out_dir: '自定义输出目录',
      out_parent: '输出到父目录 output-wukong/',
      per_period_formats: '周期性独立输出格式 (text,csv,xlsx)',
      per_period_mode: '周期性 Excel 模式 (sheets|files)',
      per_period_only: '仅输出周期性文件，不合并汇总',

      // Web 服务
      port: '本地 Web 服务端口',

      // 性能与调试
      profile: '输出性能分析 JSON',
      verbose: '显示详细性能日志',
      flame: '显示火焰图风格日志',
      trace: '生成 Chrome Trace 文件',
      hot_threshold: 'HOT 比例阈值',
      fail_on_hot: '当触及 HOT 阈值时 CI 报错',
      diff_base: '基线 profile.json 路径',
      diff_threshold: '性能回归阈值',

      // Init
      force: '强制覆盖已存在的配置文件（慎用）'
    }
  },
  en: {
    cli: {
      desc: 'Wukong Gitlog: Advanced Git commit log exporter & analyzer.'
    },
    cmds: {
      init: 'Initialize config template in current directory',
      analyze: 'Analyze git commits (Core)',
      overtime: 'Analyze overtime culture',
      export: 'Export records (Excel / CSV / JSON)',
      journal: 'Generate daily journal',
      serve: 'Start local web preview server'
    },
    options: {
      lang: 'Specify language (zh/en)',
      debug: 'Enable debug logs',

      author: 'Specify author name (alias mapping recommended)',
      email: 'Specify email',
      since: 'Start date (YYYY-MM-DD)',
      until: 'End date (YYYY-MM-DD)',
      limit: 'Limit number of commits',
      no_merges: 'Exclude merge commits',
      numstat: 'Show changed files and line stats',
      gerrit_prefix: 'Gerrit URL prefix (supports {{hash}})',
      gerrit_api: 'Gerrit REST API base URL',
      gerrit_auth: 'Gerrit API Auth (user:pass or Token)',

      country: 'Holiday country code (CN/US)',
      work_start: 'Work start hour (default 9)',
      work_end: 'Work end hour (default 18)',
      lunch_start: 'Lunch start hour (default 12)',
      lunch_end: 'Lunch end hour (default 14)',
      overnight_cutoff: 'Overnight cutoff hour (default 6)',
      overtime_mode: 'Enable overtime analysis mode',
      group_by: 'Group by: day | month | week | all',
      stats: 'Output daily statistics',

      format: 'Output format: text | excel | json',
      out_file: 'Output filename (no path)',
      out_dir: 'Custom output directory',
      out_parent: 'Output to parent dir output-wukong/',
      per_period_formats: 'Per-period formats (text,csv,xlsx)',
      per_period_mode: 'Per-period Excel mode (sheets|files)',
      per_period_only: 'Output per-period files only',

      port: 'Local web server port',

      profile: 'Output performance profile JSON',
      verbose: 'Show verbose performance logs',
      flame: 'Show flame-like logs',
      trace: 'Generate Chrome Trace file',
      hot_threshold: 'HOT ratio threshold',
      fail_on_hot: 'Fail CI on hot threshold',
      diff_base: 'Baseline profile.json path',
      diff_threshold: 'Regression threshold',

      force: 'Force overwrite existing config'
    }
  }
}
