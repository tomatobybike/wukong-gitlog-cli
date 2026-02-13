# 📦 `wukong-gitlog-cli`

<p align="center"> <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/logo.svg" width="200" alt="wukong-dev Logo" /> </p> <p align="center"> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/v/wukong-gitlog-cli.svg" alt="npm version"></a> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/dm/wukong-gitlog-cli.svg" alt="downloads"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/blob/master/LICENSE"><img src="https://img.shields.io/github/license/tomatobybike/wukong-gitlog-cli.svg" alt="license"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli"><img src="https://img.shields.io/github/stars/tomatobybike/wukong-gitlog-cli.svg?style=social" alt="GitHub stars"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/issues"><img src="https://img.shields.io/github/issues/tomatobybike/wukong-gitlog-cli.svg" alt="issues"></a> </p>

An enhanced Git commit log analysis and export tool. Supports **Excel / JSON / TXT** output, grouped statistics, overtime culture analysis, Gerrit link integration, and a visual Web Dashboard.

## English | [简体中文](./README.zh-CN.md)

---

## ✨ Features

- **Multi-format Export**: Export Git logs to JSON, Text, or Excel (XLSX).
- **Flexible Grouping**: Support grouping by day or month.
- **Overtime Analysis**: Analyze daily work hours, holidays, weekends, and cumulative risks.
- **Gerrit Integration**: Customizable Gerrit URL templates (`{{hash}}`, `{{changeId}}`, `{{changeNumber}}`).
- **Web Dashboard**: Interactive local dashboard with charts and risk summaries.
- **Deduplication**: Automatically deduplicate commits by `Change-Id`.
- **Author Mapping**: Support `authorAliases` to merge different emails/names into one person.

---

## 📥 Installation

Install globally (recommended):

```bash
npm i -g wukong-gitlog-cli
# or
yarn global add wukong-gitlog-cli

# Run
wukong-gitlog-cli --help
```

---

## 🚀 Quick Start

```bash
# Initialize configuration
wukong-gitlog-cli init

# Analyze and start web dashboard
wukong-gitlog-cli serve 
```

---

## 🛠 Commands

The tool is organized into several subcommands:

### 1. `init`
Initialize configuration file (`.wukonggitlogrc` in YAML, JS, or JSON format).
```bash
wukong-gitlog-cli init [-f, --force]
```

### 2. `analyze`
Core analysis command. Fetches logs and performs comprehensive analysis.
```bash
wukong-gitlog-cli analyze [options]
```

### 3. `overtime`
Focused on overtime culture analysis.
```bash
wukong-gitlog-cli overtime [options]
```

### 4. `export`
Focuses on exporting data to different formats.
```bash
wukong-gitlog-cli export [options]
```

### 5. `journal`
Generate daily journals/logs.
```bash
wukong-gitlog-cli journal [options]
```

### 6. `serve`
Start local Web Dashboard. It automatically runs analysis before starting.
```bash
wukong-gitlog-cli serve [--port <n>]
```

---

## ⚙️ Options

### Global Options
- `-l, --lang <code>`: Set language (en, zh-CN).
- `--debug`: Enable debug mode.
- `--info`: Show environment info (Git version, OS, etc.).

### Git Options (for `analyze`, `overtime`, `export`, `journal`)
- `--author <name>`: Filter by author name.
- `--email <email>`: Filter by author email.
- `--since <date>`: Start date (e.g., 2025-01-01).
- `--until <date>`: End date.
- `--limit <n>`: Limit number of commits.
- `--no-merges`: Exclude merge commits.
- `--path <path>`: Git repository path.

### Analysis Options
- `--work-start <hour>`: Standard work start hour (default: 9).
- `--work-end <hour>`: Standard work end hour (default: 18).
- `--overnight-cutoff <hour>`: Hour to cutoff for overnight work (default: 6).
- `--country <code>`: Holiday calendar (CN, US, etc.).

### Output Options
- `-f, --format <type>`: Output format (text, excel, json).
- `--out <file>`: Output filename.
- `--out-dir <dir>`: Output directory.
- `--stats`: Include statistics in Excel.

---

## 📊 Web Dashboard

Start the server to view interactive charts:

```bash
wukong-gitlog-cli serve
```

<p align="center">
  <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/web/overtime.jpg" width="400" alt="wukong-dev Logo" />
</p>


Visit `http://localhost:3000` to see:
- Commit distribution by day/month.
- Overtime trends and peak hours.
- **Recent 30-day Overtime Risk**: Automatically calculates cumulative overtime for the last 30 days and flags risks (Mild, Moderate, Severe).

---

## 🔗 Gerrit Support

Use templates in Gerrit URLs:
```bash
wukong-gitlog-cli analyze --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

To use numeric `changeNumber`, provide the Gerrit API:
```bash
wukong-gitlog-cli analyze --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api https://gerrit.example.com/gerrit
```

---

## 🧾 Author Mapping (`authorAliases`)

Merge multiple identities in configuration:

```yaml
authorAliases:
  "tomatoboy@abc.com": "tomatoboy"
  "tomato@xxx.com": "tomatoboy"
  "Tom Jacky": "tomatoboy"
```

---

## 📄 License

MIT
