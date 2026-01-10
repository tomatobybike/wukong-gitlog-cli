import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { renderText } from '#src/output/text.mjs'
import { writeTxtFile } from '#src/output/utils/index.mjs'

/**
 * @function handleExportCommits
 * @description 按周导出
 * @param {type}
 * @returns {type}
 */
export const handleExportCommits = async ({ opts, records, fileName }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`

  // TODO: remove debug log before production
  console.log('✅', 'opts', opts)

  try {
    const commitFileName = fileName || `commits.txt`
    writeTxtFile(baseDir, commitFileName, renderText(records))
  } catch (err) {
    console.warn(
      'handleExportCommits failed:',
      err && err.message ? err.message : err
    )
  }
}
