import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { renderChangedLinesText } from '#src/output/text.mjs'
import { writeTxtFile } from '#src/output/utils/index.mjs'

/**
 * @function handleExportAuthorChanges
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportAuthorChanges = async ({ opts, records, fileName }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  try {
    const commitFileName = fileName || `author-changes.txt`
    const rawResult = renderChangedLinesText(records)
    writeTxtFile(baseDir, commitFileName, rawResult)
  } catch (err) {
    console.warn(
      'handleExportAuthorChanges failed:',
      err && err.message ? err.message : err
    )
  }
}
