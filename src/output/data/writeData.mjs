import fs from 'fs'

import { outputExcelDayReport } from '#src/output/excel/outputExcelDayReport.mjs'
import { outputTxtDayReport } from '#src/output/text/outputTxtDayReport.mjs'

import { getEsmJs } from '../utils/getEsmJs.mjs'
import { writeJsonFile, writeTxtFile } from '../utils/index.mjs'
import {getCurrentTimestampSecond} from "#utils/index.mjs";

const pkg = JSON.parse(
  fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8')
)

function writeSchema(dir, files) {
  const schema = {
    schemaVersion: '1.0.0',
    tool: {
      name: pkg.name,
      version: pkg.version
    },
    generatedAt: getCurrentTimestampSecond(),
    data: {
      commits: { file: files.commits, required: true },
      authorMap: { file: files.authorMap, required: true },
      overtime: { file: files.overtime, required: false },
      overtimeByMonth: {
        file: files.overtimeByMonth,
        required: false
      },
      overtimeByWeek: {
        file: files.overtimeByWeek,
        required: false
      }
    }
  }

  writeJsonFile(dir, 'data.schema.json', schema)
}

export function writeServeData(result, config) {
  const baseDir = `${config.dir}/data`

  const files = {}

  files.commits = writeJsonFile(baseDir, 'commits.json', result.commits)

  files.authorMap = writeJsonFile(baseDir, 'authorMap.json', result.authorMap)

  if (result.overtime) {
    files.overtime = writeJsonFile(baseDir, 'overtime.json', result.overtime)
  }

  if (result.overtimeByMonth) {
    files.overtimeByMonth = writeJsonFile(
      baseDir,
      'overtime.month.json',
      result.overtimeByMonth
    )
  }

  if (result.overtimeByWeek) {
    files.overtimeByWeek = writeJsonFile(
      baseDir,
      'overtime.week.json',
      result.overtimeByWeek
    )
  }

  writeSchema(baseDir, files)
}

export function writeServeDataMjs(result, config) {
  const baseDir = `${config.dir}/data`

  const files = {}

  files.config = writeTxtFile(
    baseDir,
    'config.mjs',
    getEsmJs(config.worktimeOptions)
  )

  // 保存 CLI 运行时的 period（since/until/groupBy 等），供前端展示采样范围
  files.options = writeTxtFile(
    baseDir,
    'options.mjs',
    getEsmJs({ period: config.period || {} })
  )

  files.commits = writeTxtFile(baseDir, 'commits.mjs', getEsmJs(result.commits))

  files.authorMap = writeTxtFile(
    baseDir,
    'authorMap.mjs',
    getEsmJs(result.authorMap)
  )

  if (result.authorChanges) {
    files.authorChanges = writeTxtFile(
      baseDir,
      'author.changes.mjs',
      getEsmJs(result.authorChanges)
    )
  }

  if (result.overtime) {
    files.overtime = writeTxtFile(
      baseDir,
      'overtime.mjs',
      getEsmJs(result.overtime)
    )
  }

  if (result.overtimeByMonth) {
    files.overtimeByMonth = writeTxtFile(
      baseDir,
      'overtime.month.mjs',
      getEsmJs(result.overtimeByMonth)
    )
  }

  if (result.overtimeByWeek) {
    files.overtimeByWeek = writeTxtFile(
      baseDir,
      'overtime.week.mjs',
      getEsmJs(result.overtimeByWeek)
    )
  }
  if (result.overtimeLatestCommitByDay) {
    files.overtimeLatestCommitByDay = writeTxtFile(
      baseDir,
      'overtime.latest.commit.day.mjs',
      getEsmJs(result.overtimeLatestCommitByDay)
    )
  }

  writeSchema(baseDir, files)
}

// 输出 日报 数据excel
export async function writeDayReportData({ dayReports = [], conf = {} }) {
  await outputExcelDayReport({ dayReports, conf })
  await outputTxtDayReport({ dayReports, conf })
}
