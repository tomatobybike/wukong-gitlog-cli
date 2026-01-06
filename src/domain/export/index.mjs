import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { writeJsonFile } from '#src/output/utils/index.mjs'
import { logger } from '#utils/logger.mjs'

export const handleExportOvertimeMain = ({ name, opts, result }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`
  writeJsonFile(baseDir, `${name}.json`, result)
  logger.success(`overtime JSON 已导出 `, name)
}
