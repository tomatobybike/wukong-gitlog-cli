# 📦 `wukong-gitlog-cli`

<p align="center"> <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/logo.svg" width="200" alt="wukong-dev Logo" /> </p> <p align="center"> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/v/wukong-gitlog-cli.svg" alt="npm version"></a> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/dm/wukong-gitlog-cli.svg" alt="downloads"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/blob/master/LICENSE"><img src="https://img.shields.io/github/license/tomatobybike/wukong-gitlog-cli.svg" alt="license"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli"><img src="https://img.shields.io/github/stars/tomatobybike/wukong-gitlog-cli.svg?style=social" alt="GitHub stars"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/issues"><img src="https://img.shields.io/github/issues/tomatobybike/wukong-gitlog-cli.svg" alt="issues"></a> </p>

一个增强型的 Git 提交记录分析与导出工具。支持 **Excel / JSON / TXT** 输出、分组统计、加班文化分析、Gerrit 链接集成，并带有可视化 Web Dashboard。

## 中文 | [English](./README.md)

---

## ✨ 功能特性

- **多格式导出**：支持将 Git 记录导出为 JSON、文本或 Excel (XLSX)。
- **灵活分组**：支持按天或按月进行记录分组。
- **加班分析**：分析每日工作时长、节假日、周末加班情况，并提供累计风险评估。
- **Gerrit 集成**：支持自定义 Gerrit URL 模板（支持 `{{hash}}`、`{{changeId}}`、`{{changeNumber}}`）。
- **Web Dashboard**：内置本地可视化面板，包含图表和风险摘要。
- **去重功能**：自动根据 `Change-Id` 对提交记录进行去重。
- **作者映射**：支持 `authorAliases` 配置，将不同的邮箱/用户名合并为同一人。

---

## 📥 安装

推荐全局安装：

```bash
npm i -g wukong-gitlog-cli
# 或
yarn global add wukong-gitlog-cli

# 运行
wukong-gitlog-cli --help
```

---

## 🚀 快速开始

```bash
# 初始化配置文件
wukong-gitlog-cli init

# 执行分析并启动 Web Dashboard
wukong-gitlog-cli serve 
```

---

## 🛠 命令详解

工具采用了子命令结构，更加模块化：

### 1. `init`
初始化配置文件（支持 `.wukonggitlogrc` YAML、JS 或 JSON 格式）。
```bash
wukong-gitlog-cli init [-f, --force]
```

### 2. `analyze`
核心分析命令。获取 Git 日志并执行全面分析。
```bash
wukong-gitlog-cli analyze [options]
```

### 3. `overtime`
专注于加班文化分析。
```bash
wukong-gitlog-cli overtime [options]
```

### 4. `export`
专注于将数据导出为不同格式。
```bash
wukong-gitlog-cli export [options]
```

### 5. `journal`
生成工作日报/日志。
```bash
wukong-gitlog-cli journal [options]
```

### 6. `serve`
启动本地 Web Dashboard。在启动前会自动执行分析以确保数据最新。
```bash
wukong-gitlog-cli serve [--port <n>]
```

---

## ⚙️ 参数选项

### 全局参数
- `-l, --lang <code>`：设置语言（en, zh-CN）。
- `--debug`：开启调试模式。
- `--info`：显示环境信息（Git 版本、操作系统等）。

### Git 相关参数（适用于 `analyze`, `overtime`, `export`, `journal`）
- `--author <name>`：按作者名过滤。
- `--email <email>`：按邮箱过滤。
- `--since <date>`：起始日期（如 2025-01-01）。
- `--until <date>`：结束日期。
- `--limit <n>`：限制提交数量。
- `--no-merges`：排除 Merge 提交。
- `--path <path>`：Git 仓库路径。

### 分析相关参数
- `--work-start <hour>`：标准上班时间（默认：9）。
- `--work-end <hour>`：标准下班时间（默认：18）。
- `--overnight-cutoff <hour>`：跨天计算截止时间（默认：6）。
- `--country <code>`：节假日日历（CN, US 等）。

### 输出相关参数
- `-f, --format <type>`：输出格式（text, excel, json）。
- `--out <file>`：输出文件名。
- `--out-dir <dir>`：输出目录。
- `--stats`：在 Excel 中包含统计工作表。

---

## 📊 Web Dashboard

启动服务以查看交互式图表：

```bash
wukong-gitlog-cli serve
```
<p align="center">
  <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/web/overtime.jpg" width="400" alt="wukong-dev Logo" />
</p>

访问 `http://localhost:3000` 查看：
- 按天/月的提交分布。
- 加班趋势和高峰时段。
- **最近 30 天加班时长风险**：自动计算过去 30 天的累计加班时长，并标注风险等级（轻度、中度、严重）。

---

## 🔗 Gerrit 支持

在 Gerrit URL 中使用模板：
```bash
wukong-gitlog-cli analyze --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

若需使用数字形式的 `changeNumber`，请提供 Gerrit API 地址：
```bash
wukong-gitlog-cli analyze --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api https://gerrit.example.com/gerrit
```

---

## 🧾 作者映射 (`authorAliases`)

在配置文件中合并多个身份：

```yaml
authorAliases:
  "tomatoboy@abc.com": "汤姆"
  "tomato@xxx.com": "汤姆"
  "Tom Jacky": "汤姆"
```

---


## 📄 开源协议

MIT
