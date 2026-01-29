import path from 'path'

import { EXPORT_DIR_PROFILE } from '#src/constants/index.mjs'
import { outFile } from '#src/output/utils/outputPath.mjs'

export const getProfileDirFile = (fileName, opts) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR_PROFILE}`
  const filePath = outFile(baseDir, fileName)

  return filePath
}
