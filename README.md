## 📦 `wukong-gitlog-cli`

<p align="center">
  <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/logo.svg" width="200" alt="wukong-dev Logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/v/wukong-gitlog-cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/wukong-gitlog-cli"><img src="https://img.shields.io/npm/dm/wukong-gitlog-cli.svg" alt="downloads"></a>
  <a href="https://github.com/tomatobybike/wukong-gitlog-cli/blob/master/LICENSE"><img src="https://img.shields.io/github/license/tomatobybike/wukong-gitlog-cli.svg" alt="license"></a>
  <a href="https://github.com/tomatobybike/wukong-gitlog-cli"><img src="https://img.shields.io/github/stars/tomatobybike/wukong-gitlog-cli.svg?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/tomatobybike/wukong-gitlog-cli/issues"><img src="https://img.shields.io/github/issues/tomatobybike/wukong-gitlog-cli.svg" alt="issues"></a>
</p>

Advanced Git commit log exporter with Excel/JSON/TXT output, grouping, stats and CLI.

## English | [简体中文](./README.zh-CN.md)

## Features

- Export commit logs to JSON / text or Excel (XLSX)
- Group commits by date (day / month)
- Include a daily stats sheet in Excel
- Optional Gerrit links per commit (custom template or prefix)
- Small, dependency-friendly CLI using ZX and ExcelJS

---

## What's new

- `--gerrit` option to show Gerrit links in text/excel/json output
- `--out-dir` / `--out-parent` to control where output files are written (useful to avoid committing generated files)
- `npm` demo scripts for quickly running examples (`cli:text-demo`, `cli:excel-demo`, `cli:json-demo`, `cli:gerrit-demo` and parent variants)
- `src/utils` restructured with `src/utils/index.mjs` barrel to simplify imports

---

## Installation

Install globally to run with a short command (recommended for CLI consumers):

```bash
# Or install via npm when published:
npm i -g wukong-gitlog-cli

yarn global add wukong-gitlog-cli

# Then you can run the CLI globally:
wukong-gitlog-cli --help
```

---

## Usage

```bash
wukong-gitlog-cli [options]
```

Command-line options:

- `--author <name>` Filter commits by author name
- `--email <email>` Filter commits by author email
- `--since <date>` Start date (e.g., 2025-01-01)
- `--until <date>` End date
- `--limit <n>` Limit number of commits
- `--no-merges` Exclude merge commits
- `--json` Output JSON
- `--format <type>` Output format: `text` | `excel` | `json` (default: `text`)
- `--group-by <type>` Group commits by date: `day` | `month`
- `--overtime` Analyze overtime culture: output counts/percentages for commits outside work hours and on non-workdays (per-person breakdown)
  - `--country <code>` Country/region for holidays (CN|US). Default: `CN`.
  - `--work-start <hour>` Workday start hour. Default: `9`.
  - `--work-end <hour>` Workday end hour. Default: `18`.
  - `--lunch-start <hour>` Lunch break start hour. Default: `12`.
  - `--lunch-end <hour>` Lunch break end hour. Default: `14`.
- `--stats` Include a `Stats` sheet in the Excel export
- `--gerrit-api <url>` Optional: Gerrit REST API base URL for resolving `{{changeNumber}}` (e.g. `https://gerrit.example.com/gerrit`)
- `--gerrit-auth <token>` Optional: Authorization for Gerrit REST API (either `user:pass` for Basic or token string for Bearer)
- `--gerrit <prefix>` Show Gerrit URL for each commit (supports templates `{{hash}}`, `{{changeId}}` and `{{changeNumber}}`; `{{changeId}}` falls back to `hash` when absent; `{{changeNumber}}` requires `--gerrit-api` and falls back to `changeId` or `hash`)
- `--out <file>` Output file name (without path). Defaults: `commits.json` / `commits.txt` / `commits.xlsx`
- `--out-dir <dir>` Output directory path — supports relative or absolute path, e.g., `--out-dir ../output`
- `--serve` Start the local web service and view the submission statistics (data files will be generated under output/data)
- `--port <n>` Local web service port (default: 3000)
- `--serve-only` Only start the web service without exporting or analyzing data (using existing data in output/data)
- `--version` show version information

> Output files are written to an `output/` directory in the current working directory.
>
> Tip: Use `--out-parent` or `--out-dir ../output` to write outputs into the parent folder's `output/` to avoid accidentally committing generated files to your repository.

### Per-period outputs

You can generate per-month and per-week outputs under `output/month/` and `output/week/` using the `--per-period-formats` option. Example:

```bash
wukong-gitlog-cli --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab
```

Want per-period Excel outputs? Use `xlsx` along with `--per-period-excel-mode` for `sheets` or `files`:

```bash
wukong-gitlog-cli --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab,xlsx --per-period-excel-mode sheets
wukong-gitlog-cli --overtime --limit 200 --format text --out commits.txt --per-period-formats xlsx --per-period-excel-mode files
```

If you'd like only per-period outputs and not the combined monthly/weekly summary files, add `--per-period-only`:

```bash
wukong-gitlog-cli --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab,xlsx --per-period-only
```

### Serve a local dashboard

You can start a small static web dashboard to visualize commit statistics and charts. It will export raw commits and analyzed stats into `output/data/` as `commits.mjs` and `overtime-stats.mjs`, and start a local web server serving `web/` and `output/data/`:

```bash
# Start the server on the default port (3000)
wukong-gitlog-cli --serve --overtime --limit 200 --out commits.txt

# Start server only (use existing output/data)
wukong-gitlog-cli --serve-only

# Custom port
wukong-gitlog-cli --serve --port 8080 --overtime --limit 200 --out commits.txt
```

Open `http://localhost:3000` to view the dashboard.

<p align="center">
  <img src="https://raw.githubusercontent.com/tomatobybike/wukong-gitlog-cli/main/images/web/overtime.jpg" width="400" alt="wukong-dev Logo" />
</p>

---

## Gerrit support

Use the `--gerrit` option to include a Gerrit link for each commit. You can provide a template containing `{{hash}}` to place the full commit hash into the URL, for example:

```bash
wukong-gitlog-cli --gerrit "https://gerrit.example.com/c/project/+/{{hash}}" --limit 5 --format text
```

If `{{hash}}` is not present, the CLI will append the commit hash to the prefix with a `/` separator.

You can also use `{{changeId}}` in the template to reference Gerrit change id. The tool will try to extract a `Change-Id: I...` value from the commit body and replace `{{changeId}}` with it. If it can't find a `Change-Id`, the CLI will fall back to using the commit `hash`.

The Gerrit link will show up in:

- The text output if `--format text` (as a new `Gerrit` column)
- The Excel export as a `Gerrit` column if `--format excel`
- JSON output will include a `gerrit` field for each record when `--gerrit` is used
- JSON output will include a `gerrit` field for each record when `--gerrit` is used
- When `--gerrit` uses `{{changeId}}`, the CLI will try to extract `Change-Id:` from the commit body and include `changeId` and `body` in the JSON record. If no `Change-Id` is present, the CLI falls back to `hash` when forming the Gerrit URL.

Note: `--out <file>` is the filename only and the directory used to store that file depends on:

- The default directory `./output/` in the current working directory
- `--out-dir <dir>` to override the target folder (relative or absolute)
- `--out-parent` to write to the parent repository folder `../output/` (same as `--out-dir ../output`)

For example:

```bash
# using globally installed CLI
wukong-gitlog-cli --out parent.json --out-parent
wukong-gitlog-cli --out demo.txt --out-dir ../temp
```

---

## Examples

Export as text, grouped by month, with Gerrit links:

```bash
wukong-gitlog-cli --format text --group-by month --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

// Resolve numeric change ID using Gerrit API (if available)
wukong-gitlog-cli --format text --group-by month --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api <GERRIT_API_BASE_URL>

If your Gerrit requires authentication (HTTP Basic or token), use `--gerrit-auth`:

```bash
# HTTP Basic: username:password
wukong-gitlog-cli --format text --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api <GERRIT_API_BASE_URL> --gerrit-auth "username:password"

# Token (Bearer)
wukong-gitlog-cli --format text --gerrit "https://gerrit.example.com/c/project/+/{{changeNumber}}" --gerrit-api <GERRIT_API_BASE_URL> --gerrit-auth "MYTOKEN"
```

Export to Excel with stats and Gerrit URLs:

```bash
wukong-gitlog-cli --format excel --stats --gerrit "https://gerrit.example.com/c/project/+/{{hash}}"
```

Export raw JSON:

```bash
wukong-gitlog-cli --json --out commits.json
```

Export text to a custom directory (parent output folder):

```bash
wukong-gitlog-cli --out-dir ../output --format text --limit 5 --out custom1.txt
```

---

```bash
wukong-gitlog-cli --overtime --limit 500
```

## Notes & Developer Info

- The CLI prints helpful messages after exporting files and writes outputs to the `output/` folder in the repo root.
- Internally `src/utils/index.mjs` acts as a barrel that re-exports helper functions located in `src/utils/`.
- If you plan to reuse the helpers in other modules, import from `./src/utils/index.mjs` explicitly.
- The Excel export uses `exceljs` and adds an `autoFilter` to the sheet header.

Suggested `.gitignore` snippet (to avoid accidentally committing generated files):

```gitignore
# ignore commit exports
output/
custom-output/
```

---

## Contributing

PRs are welcome — add tests and keep changes modular. If you add new CLI flags or new fields in commit records, please update this README accordingly.

---

## License

MIT
