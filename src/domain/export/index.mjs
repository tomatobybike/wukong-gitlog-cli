import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { writeJsonFile ,writeTxtFile} from '#src/output/utils/index.mjs'
import { logger } from '#utils/logger.mjs'

export const handleExportOvertimeMain = ({ name, opts, result }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`
  const fileName = `${name}.json`

  writeJsonFile(baseDir, fileName, result)
  const file = `${baseDir}/${fileName}`
  logger.success(`overtime JSON 已导出 `, file)
}

export const handleExportOvertimeTxt = ({ name = 'commits', opts, result }) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`
  const fileName = `overtime_${name}.txt`
  writeTxtFile(baseDir, fileName, result)
  const file = `${baseDir}/${fileName}`
  logger.success(`${fileName}  已导出 `, file)
}

export const handleExportOvertimeTabTxt = ({
  name = 'commits',
  opts,
  result
}) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`
  const fileName = `overtime_${name}.tab.txt`
  writeTxtFile(baseDir, fileName, result)
  const file = `${baseDir}/${fileName}`
  logger.success(`${fileName}  已导出 `, file)
}
