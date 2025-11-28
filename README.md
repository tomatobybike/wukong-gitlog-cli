## 📦  `wukong-gitlog-cli`

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

---

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

- `--author <name>`        Filter commits by author name
- `--email <email>`        Filter commits by author email
- `--since <date>`         Start date (e.g., 2025-01-01)
- `--until <date>`         End date
- `--limit <n>`            Limit number of commits
- `--no-merges`            Exclude merge commits
- `--json`                 Output JSON
- `--format <type>`        Output format: `text` | `excel` | `json` (default: `text`)
- `--group-by <type>`      Group commits by date: `day` | `month`
- `--overtime`              Analyze overtime culture: output counts/percentages for commits outside work hours and on non-workdays (per-person breakdown)
  - `--country <code>`       Country/region for holidays (CN|US). Default: `CN`.
  - `--work-start <hour>`    Workday start hour. Default: `9`.
  - `--work-end <hour>`      Workday end hour. Default: `18`.
  - `--lunch-start <hour>`   Lunch break start hour. Default: `12`.
  - `--lunch-end <hour>`     Lunch break end hour. Default: `14`.
- `--stats`                Include a `Stats` sheet in the Excel export
- `--gerrit-api <url>`    Optional: Gerrit REST API base URL for resolving `{{changeNumber}}` (e.g. `https://gerrit.example.com/gerrit`)
- `--gerrit-auth <token>` Optional: Authorization for Gerrit REST API (either `user:pass` for Basic or token string for Bearer)
- `--gerrit <prefix>`      Show Gerrit URL for each commit (supports templates `{{hash}}`, `{{changeId}}` and `{{changeNumber}}`; `{{changeId}}` falls back to `hash` when absent; `{{changeNumber}}` requires `--gerrit-api` and falls back to `changeId` or `hash`)
- `--out <file>`           Output file name (without path). Defaults: `commits.json` / `commits.txt` / `commits.xlsx`
- `--out-dir <dir>`      Output directory path — supports relative or absolute path, e.g., `--out-dir ../output`
- `--out-parent`         Place output in the parent directory's `output/` folder (same as `--out-dir ../output`)

> Output files are written to an `output/` directory in the current working directory.
>
> Tip: Use `--out-parent` or `--out-dir ../output` to write outputs into the parent folder's `output/` to avoid accidentally committing generated files to your repository.

### Per-period outputs
You can generate per-month and per-week outputs under `output/month/` and `output/week/` using the `--per-period-formats` option. Example:

```bash
node ./src/cli.mjs --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab
```

Want per-period Excel outputs? Use `xlsx` along with `--per-period-excel-mode` for `sheets` or `files`:

```bash
node ./src/cli.mjs --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab,xlsx --per-period-excel-mode sheets
node ./src/cli.mjs --overtime --limit 200 --format text --out commits.txt --per-period-formats xlsx --per-period-excel-mode files
```

If you'd like only per-period outputs and not the combined monthly/weekly summary files, add `--per-period-only`:

```bash
node ./src/cli.mjs --overtime --limit 200 --format text --out commits.txt --per-period-formats csv,tab,xlsx --per-period-only
```


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

## Quick demo (npm scripts)

We provided a few convenient npm scripts to quickly run common scenarios. Run them from the project root:

```bash
# show help
npm run cli:help

# simple text export (commits.txt in ./output)
npm run cli:text-demo

# Excel export with stats (commits.xlsx + commits.txt in ./output)
npm run cli:excel-demo

# JSON export (commits.json in ./output)
npm run cli:json-demo

# Gerrit text export demo
npm run cli:gerrit-demo
# Gerrit Change-Id demo (use commit Change-Id to build Gerrit URLs when present)
npm run cli:gerrit-changeid-demo
```

If you prefer to write output outside the project (e.g., a parent `output/` folder), we also provide `npm` scripts that run with `--out-parent`:

```bash
# text export to parent `output/`
npm run cli:text-demo-parent

# excel export to parent `output/`
npm run cli:excel-demo-parent
```

Example text output (from `npm run cli:text-demo`):

```text
Hash       | Author             | Date                 | Message
---------------------------------------------------------------------------------------------------------------------
c5bdf9d4   | tom                | 2025-11-25           | feat: 🎸 增加output目录

ea82531   | tom                | 2025-11-25           | feat: 🎸 init

741de50   | tom                | 2025-11-25           | first commit
```

You can also analyze overtime culture with the `--overtime` flag to get overall and per-person overtime submission rates (default work window is 09:00-18:00). Example:

```bash
wukong-gitlog-cli --overtime --limit 500
```

## Overtime demo scripts (npm)

Below are helpful npm scripts added for quickly running the overtime analysis with commonly used configurations. They are already present in `package.json` and can be run from the project root.

```bash
# Run a US-focused overtime text report using 10:00-19:00 work hours and a 12:00-13:00 lunch break
npm run cli:overtime-text-us

# Run a US-focused overtime text report and write the outputs into the project parent's output folder
npm run cli:overtime-text-us-parent

# Run a US-focused overtime text report and write the output into ../output (explicit --out-dir)
npm run cli:overtime-text-us-outdir

# Run a CN-focused overtime Excel report (default 9:00-18:00 work hours and 12:00-14:00 lunch)
npm run cli:overtime-excel-cn

# Run a CN-focused overtime Excel report and write outputs to parent output folder
npm run cli:overtime-excel-cn-parent

# Run a CN-focused overtime Excel report and write outputs to ../output via --out-dir
npm run cli:overtime-excel-cn-outdir
# Per-period CSV/Tab export: write per-period files to output/month/ and output/week/
npm run cli:overtime-per-period-csv-tab
# Per-period Excel export with sheet-per-period workbook
npm run cli:overtime-per-period-xlsx-sheets
# Per-period Excel export with one file per period
npm run cli:overtime-per-period-xlsx-files
# Per-period only (no consolidated monthly/weekly files)
npm run cli:overtime-per-period-only
```

Notes:

- Output files are written into `output/` by default. Use `--out-dir` or `--out-parent` to change output location.
- If you prefer different working hours or country codes, either modify the script in `package.json` or run the CLI manually with flags (e.g. `--work-start`, `--work-end`, `--lunch-start`, `--lunch-end`, `--country`).

Formatting note:

- The text report is formatted to align columns correctly even when commit messages or author names contain mixed Chinese and English characters (uses `string-width` for display-aware padding).

Example JSON output (from `npm run cli:json-demo`):

```json
[
  {
    "hash": "c5bdf9d4f52f39bd7d580318bafc8ba4b6c129bc",
    "author": "tom",
    "email": "",
    "date": "2025-11-25 17:24:32 +0800",
    "message": "feat: 🎸 增加output目录"
  }
  /* truncated... */
]
```

Example JSON output including `changeId`/`gerrit` when `--gerrit` uses `{{changeId}}` (if present in commit):

```json
[
  {
    "hash": "Iabc...",
    "author": "tom",
    "email": "",
    "date": "2025-11-25 17:24:32 +0800",
    "message": "feat: add feature",
    "body": "feat: add feature\n\nChange-Id: Iabcd123456789",
    "changeId": "Iabcd123456789",
    "gerrit": "https://gerrit.example.com/c/project/+/Iabcd123456789"
  }
]
```

---

## Notes & Developer Info

- The CLI prints helpful messages after exporting files and writes outputs to the `output/` folder in the repo root.
- Internally `src/utils/index.mjs` acts as a barrel that re-exports helper functions located in `src/utils/`.
- If you plan to reuse the helpers in other modules, import from `./src/utils/index.mjs` explicitly.
- The Excel export uses `exceljs` and adds an ``autoFilter`` to the sheet header.

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

