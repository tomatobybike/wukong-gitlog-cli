import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { renderText } from '#src/output/text.mjs'
import { writeJsonFile } from '#src/output/utils/index.mjs'

/**
 * @function handleExportCommitsJson
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportCommitsJson = async ({
  opts,
  records,
  fileName,
  groups
}) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  try {
    const commitFileName = fileName || `commits.json`
    writeJsonFile(baseDir, commitFileName, groups || records)
  } catch (err) {
    console.warn(
      'handleExportCommitsJson failed:',
      err && err.message ? err.message : err
    )
  }
}
