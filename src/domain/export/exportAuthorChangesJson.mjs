import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { renderAuthorChangesJson } from '#src/output/json.mjs'
import { writeJsonFile } from '#src/output/utils/index.mjs'

/**
 * @function handleExportAuthorChangesJson
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportAuthorChangesJson = async ({
  opts,
  records,
  fileName
}) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  try {
    const commitFileName = fileName || `author-changes.json`
    const rawResult = renderAuthorChangesJson(records)
    writeJsonFile(baseDir, commitFileName, rawResult)
  } catch (err) {
    console.warn(
      'handleExportAuthorChangesJson failed:',
      err && err.message ? err.message : err
    )
  }
}
