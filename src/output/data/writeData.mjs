import { writeJson } from '../utils/writeFile.mjs'
import { outFile } from '../utils/outputPath.mjs'
import pkg from '../../../package.json' assert { type: 'json' }

export function writeServeData(result, config) {
  const baseDir = `${config.dir}/data`

  const files = {}

  files.commits = write(
    baseDir,
    'commits.json',
    result.records
  )

  files.authorMap = write(
    baseDir,
    'authorMap.json',
    result.authorMap
  )

  if (result.overtime) {
    files.overtime = write(
      baseDir,
      'overtime.json',
      result.overtime
    )
  }

  if (result.overtimeByMonth) {
    files.overtimeByMonth = write(
      baseDir,
      'overtime.month.json',
      result.overtimeByMonth
    )
  }

  if (result.overtimeByWeek) {
    files.overtimeByWeek = write(
      baseDir,
      'overtime.week.json',
      result.overtimeByWeek
    )
  }

  writeSchema(baseDir, files)
}

/* ---------------- helpers ---------------- */

function write(dir, name, data) {
  writeJson(outFile(dir, name), data)
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
