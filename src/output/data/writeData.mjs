import fs from 'fs'
import path from 'path'

import { getEsmJs } from '../utils/getEsmJs.mjs'
import { outFile } from '../utils/outputPath.mjs'
import { writeJson, writeText } from '../utils/writeFile.mjs'

const pkg = JSON.parse(
  fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8')
)

/* ---------------- helpers ---------------- */

function writeJsonFile(dir, name, data) {
  writeJson(outFile(dir, name), data)
  return name
}

function writeTxtFile(dir, name, data) {
  writeText(outFile(dir, name), data)
  return name
}

function writeSchema(dir, files) {
  const schema = {
    schemaVersion: '1.0.0',
    tool: {
      name: pkg.name,
      version: pkg.version
    },
    generatedAt: new Date().toISOString(),
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

  writeJson(outFile(dir, 'data.schema.json'), schema)
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

  files.commits = writeTxtFile(baseDir, 'commits.mjs', getEsmJs(result.commits))

  files.authorMap = writeTxtFile(
    baseDir,
    'authorMap.mjs',
    getEsmJs(result.authorMap)
  )

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

  writeSchema(baseDir, files)
}
