import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { renderAuthorMapText } from '#src/output/renderAuthorMapText.mjs'
import { getEsmJs } from '#src/output/utils/getEsmJs.mjs'
import { writeTxtFile } from '#src/output/utils/index.mjs'

/**
 * @function handleExportAuthor
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportAuthor = async ({ opts, records, fileName }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  try {
    const commitFileName = fileName || `authors.txt`
    const rawResult = renderAuthorMapText(records)
    writeTxtFile(baseDir, commitFileName, rawResult)
  } catch (err) {
    console.warn(
      'handleExportAuthor failed:',
      err && err.message ? err.message : err
    )
  }
}
