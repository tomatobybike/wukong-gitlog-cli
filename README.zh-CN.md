# 📦 `wukong-gitlog-cli`

<p align="center"> <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/logo.svg" width="200" alt="wukong-dev Logo" /> </p> <p align="center"> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/v/wukong-gitlog-cli.svg" alt="npm version"></a> <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/dm/wukong-gitlog-cli.svg" alt="downloads"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/blob/master/LICENSE"><img src="https://img.shields.io/github/license/tomatobybike/wukong-gitlog-cli.svg" alt="license"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli"><img src="https://img.shields.io/github/stars/tomatobybike/wukong-gitlog-cli.svg?style=social" alt="GitHub stars"></a> <a href="https://github.com/tomatobybike/wukong-gitlog-cli/issues"><img src="https://img.shields.io/github/issues/tomatobybike/wukong-gitlog-cli.svg" alt="issues"></a> </p>

一个增强型的 Git 提交记录导出工具，支持 **Excel / JSON / TXT** 输出、分组统计、加班文化分析、Gerrit 链接支持，并带有可视化 Web Dashboard。

## 中文 | [English](./README.md)

---

## ✨ 功能特性

- 导出 Git 提交记录到 **JSON / 文本 / Excel (XLSX)**

- 支持按日期分组（按 **天** / **月**）

- Excel 导出可包含每日统计表

- 支持 Gerrit 链接（支持模板 `{{hash}}`、`{{changeId}}`、`{{changeNumber}}`）

- 提供加班文化分析（每日工作时段、节假日、周末等）

- 自带本地 Web Dashboard，可显示柱状图、折线图、饼图

- 小而精简的 CLI，依赖极少，基于 ZX + ExcelJS

---

## 🆕 更新内容

- 新增 `--gerrit` 支持，自定义 Gerrit URL 模板

- 新增 `--out-dir` / `--out-parent` 控制输出目录

- 新增多种 `npm` demo 脚本，便于测试和演示

- `src/utils` 结构优化，使用 barrel 导出

---

## 📥 安装

全局安装（推荐）：

```bash
npm i -g wukong-gitlog-cli
# 或
yarn global add wukong-gitlog-cli

# 全局运行
wukong-gitlog-cli --help
```

---

## 🚀 使用方法

```bash
wukong-gitlog-cli --overtime  --serve --port 5555
```

```bash
wukong-gitlog-cli [options]
```

### 初始化配置（init）

生成带模板或带注释的配置文件，支持以下格式：

- `.wukonggitlogrc`（YAML 内容，无扩展名）
- `.wukonggitlogrc.yml` / `.wukonggitlogrc.yaml`
- `.wukonggitlogrc.js` / `.wukonggitlogrc.mjs`（ES Module，支持逻辑）
- `.wukonggitlogrc.json`

命令：

```bash
wukong-gitlog-cli init
```

在交互式生成时会询问是否将 `output` 目录与配置文件名自动加入 `.gitignore`（推荐）。

### 常用参数

| 参数                 | 描述                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `--author <name>`    | 按作者过滤                                                         |
| `--email <email>`    | 按邮箱过滤                                                         |
| `--since <date>`     | 起始日期（如 2025-01-01）                                          |
| `--until <date>`     | 结束日期                                                           |
| `--limit <n>`        | 限制提交数量                                                       |
| `--no-merges`        | 排除 merge 提交                                                    |
| `--json`             | 输出 JSON                                                          |
| `--format <type>`    | 输出格式： text / excel / json（默认 text）                        |
| `--group-by <type>`  | 分组： day / month                                                 |
| `--overtime`         | 启用加班文化分析                                                   |
| `--country <code>`   | 假期：CN 或 US（默认 CN）                                          |
| `--stats`            | Excel 中包含统计 sheet                                             |
| `--gerrit <prefix>`  | Gerrit URL 模板                                                    |
| `--gerrit-api <url>` | Gerrit API 地址（用于 changeNumber）                               |
| `--out <file>`       | 输出文件名                                                         |
| `--out-dir <dir>`    | 输出目录                                                           |
| `--out-parent`       | 输出到父目录的 `output/`                                           |
| `--serve`            | 启动本地 Web 服务查看提交统计（会生成 output/data 下的数据）       |
| `--port <n>`         | Web 服务端口（默认 3000）                                          |
| `--serve-only`       | 仅启动 Web 服务，不导出或分析数据（使用现有 output/data）          |
| `--version`          | 显示版本号                                                         |

---

## 📊 分时段（按周/月）输出

```bash
wukong-gitlog-cli --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab
```

如需导出 Excel：

```bash
wukong-gitlog-cli --per-period-formats xlsx --per-period-excel-mode sheets
```

仅导出分时段文件：

```bash
wukong-gitlog-cli --per-period-only
```

---

## 📈 启动本地 Dashboard

分析结果会导出为：

- `output/data/commits.mjs`

- `output/data/overtime-stats.mjs`

启动服务器：

```bash
wukong-gitlog-cli --overtime  --serve --port 5555 --limit 200
```

浏览器访问：

```arduino
http://localhost:3000
```


<p align="center">
  <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/web/overtime.jpg" width="400" alt="wukong-dev Logo" />
</p>
---

## 🔗 Gerrit 支持

示例：

```bash
wukong-gitlog-cli --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

若想使用 Gerrit 数字 Change Number：

```bash
wukong-gitlog-cli --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api https://gerrit.example.com/gerrit
```

支持 Basic 和 Bearer Token：

```bash
--gerrit-auth "user:password"
--gerrit-auth "MYTOKEN"
```

---

## 📚 示例指令

导出文本（按月分组）：

```bash
wukong-gitlog-cli --format text --group-by month
```

导出 Excel + Gerrit：

```bash
wukong-gitlog-cli --format excel --stats --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

导出 JSON：

```bash
wukong-gitlog-cli --json --out commits.json
```

自定义输出目录：

```bash
wukong-gitlog-cli --out-dir ../output --format text --limit 5 --out demo.txt
```

---

## ⚙️ 开发说明

- 所有输出文件默认存放于 `output/`

- 内部 `src/utils/index.mjs` 为 utils 汇总入口

- Excel 使用 exceljs，并自动添加 `autoFilter`

推荐 `.gitignore`：

```gitignore
output/
custom-output/
```

---

## 🧾 作者别名映射（`authorAliases`）

有时同一人会在不同电脑或工具上使用不同的邮箱或名字提交（例如邮箱和显示名不一致）。你可以在配置文件中使用 `authorAliases` 将多个邮箱或原始姓名映射为同一个规范化作者名，以便统计和 Web 展示时合并这些记录。

示例（YAML）:

```yaml
authorAliases:
  "tomatoboybybike@gmail.com": "tomatoboy"
  "tomatojacky@126.com": "tomatoboy"
  "Tom Jacky": "tomatoboy"
```

示例（JS）:

```javascript
export default {
  authorAliases: {
    'tomatoboybybike@gmail.com': 'tomatoboy',
    'tomatojacky@126.com': 'tomatoboy',
    'Tom Jacky': 'tomatoboy'
  }
}
```

说明：
- key 可以是邮箱（包含 `@`）或作者原始显示名（不包含 `@`）；value 为你希望在统计和展示中使用的规范化名字。
- 配置生效后，运行 `analyze` / `overtime` / `export` 或重启 `serve`，生成的 `output/data` 将使用规范化的作者名。

作者过滤（`author.include` / `author.exclude`）:
- 你可以在配置中使用 `author.include` 或 `author.exclude` 来进一步控制要统计或排除的作者。
- 支持数组或逗号分隔的字符串。匹配会同时支持邮箱精确匹配（包含 `@`）或作者的规范化/原始姓名（不区分大小写）。

示例：

```yaml
author:
  include: ["tomatoboy", "alice@example.com"]
  exclude: "bot@example.com"
```


---

## 🤝 贡献指南

欢迎 PR！
如果添加新参数或输出字段，请记得同步更新 README。

---

## 📄 License

MIT

---
