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

如何使用（示例）：

生成数据并启动本地仪表盘（默认端口 3000）：

```bash
node ./src/cli.mjs --serve --overtime --limit 200 --out commits.txt
# 或
npm run cli:serve
```

指定端口：

```bash
node ./src/cli.mjs --serve --port 8080 --overtime --limit 200 --out commits.txt

```

仪表盘地址：打开 http://localhost:3000 （或自定义端口）
