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
    },
    analyze: {
      prefix: '分析', // 进度条前缀
      step_git_fetch: '正在提取 Git 提交记录...',
      step_git_done: 'Git 记录提取完成',
      step_author_stats: '正在分析作者代码贡献...',
      step_overtime_calc: '正在计算加班概况...',
      step_trends: '正在生成周/月趋势数据...',
      step_latest_mark: '正在标记每日最晚提交点...',
      step_skip_overtime: '跳过加班数据分析',
      step_output: '正在持久化分析结果...',
      step_complete: '分析任务全部完成！'
    },
    init: {
      title: '配置文件初始化',
      select_format: '请选择要生成的配置文件格式:',
      formats: {
        mjs: 'ES Module (.mjs)',
        js: 'JavaScript (灵活，支持逻辑)',
        yaml: 'YAML (推荐，带详细注释)',
        json: 'JSON (标准格式)',
        plain: 'YAML 无后缀 (.wukonggitlogrc)'
      },
      error_exists: '错误: 当前目录已存在配置文件',
      success_created: '成功生成配置:',
      gitignore_ask: '是否自动将报告目录及配置文件添加到 .gitignore?',
      gitignore_updated: '已更新 .gitignore',
      gitignore_warn: '无法更新 .gitignore:',
      complete: '初始化完成！',
      cancel: '已取消初始化',
      fail: '初始化失败:'
    },
    // 模板注释内容 (用于生成文件)
    template: {
      generated_at: '生成时间',
      author_config: '作者统计配置',
      author_include: '[数组] 只统计这些作者，留空表示全部',
      author_exclude: '[数组] 排除这些作者',
      git_config: 'Git 提取配置',
      git_merges: '[布尔] 是否包含 merge commit',
      git_limit: '[数字] 最大拉取提交数，防止大仓拉取过慢',
      period_config: '统计周期配置',
      period_group: '[枚举] 统计周期: day (天) | week (周) | month (月)',
      period_since: '[字符串] 起始日期 (YYYY-MM-DD)',
      period_until: '[字符串] 截止日期 (YYYY-MM-DD)',
      gerrit_config: 'Gerrit 链接转换 (可选)',
      worktime_config: '工作时间与加班计算配置',
      worktime_country: '[字符串] 国家代码 (CN/US)',
      worktime_start: '[数字] 工作日开始时间',
      worktime_end: '[数字] 工作日结束时间',
      worktime_lunch: '午休时间',
      worktime_cutoff: '[数字] 凌晨截止点',
      output_config: '输出与报告配置',
      output_dir: '[字符串] 报告输出目录名',
      output_formats: '[数组] 输出格式',
      output_per_period: '[布尔] 是否按周期生成单独文件',
      author_aliases: '作者别名映射'
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
    },
    analyze: {
      prefix: 'Analyze',
      step_git_fetch: 'Extracting Git commit logs...',
      step_git_done: 'Git logs extraction completed',
      step_author_stats: 'Analyzing author code contributions...',
      step_overtime_calc: 'Calculating overtime overview...',
      step_trends: 'Generating weekly/monthly trends...',
      step_latest_mark: 'Marking latest daily commits...',
      step_skip_overtime: 'Skipping overtime analysis',
      step_output: 'Persisting analysis results...',
      step_complete: 'Analysis task completed!'
    },
    init: {
      title: 'Config Initialization',
      select_format: 'Select config file format:',
      formats: {
        mjs: 'ES Module (.mjs)',
        js: 'JavaScript (Flexible, supports logic)',
        yaml: 'YAML (Recommended, with comments)',
        json: 'JSON (Standard)',
        plain: 'YAML no extension (.wukonggitlogrc)'
      },
      error_exists: 'Error: Config file already exists in current directory',
      success_created: 'Config created:',
      gitignore_ask: 'Add report dir and config to .gitignore automatically?',
      gitignore_updated: '.gitignore updated',
      gitignore_warn: 'Failed to update .gitignore:',
      complete: 'Initialization complete!',
      cancel: 'Initialization cancelled',
      fail: 'Initialization failed:'
    },
    template: {
      generated_at: 'Generated at',
      author_config: 'Author Statistics Config',
      author_include: '[Array] Include only these authors, empty for all',
      author_exclude: '[Array] Exclude these authors',
      git_config: 'Git Extraction Config',
      git_merges: '[Boolean] Include merge commits',
      git_limit: '[Number] Max commits to fetch',
      period_config: 'Period Statistics Config',
      period_group: '[Enum] Group by: day | week | month',
      period_since: '[String] Start date (YYYY-MM-DD)',
      period_until: '[String] End date (YYYY-MM-DD)',
      gerrit_config: 'Gerrit Link Conversion (Optional)',
      worktime_config: 'Worktime & Overtime Config',
      worktime_country: '[String] Country code (CN/US)',
      worktime_start: '[Number] Work start hour',
      worktime_end: '[Number] Work end hour',
      worktime_lunch: 'Lunch break',
      worktime_cutoff: '[Number] Overnight cutoff hour',
      output_config: 'Output & Report Config',
      output_dir: '[String] Report output directory',
      output_formats: '[Array] Output formats',
      output_per_period: '[Boolean] Generate separate files per period',
      author_aliases: 'Author Alias Mapping'
    }
  }
}
