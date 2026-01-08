import path from 'path'

import { EXPORT_DIR } from '#src/constants/index.mjs'
import { writeJsonFile, writeTxtFile } from '#src/output/utils/index.mjs'
import { logger } from '#utils/logger.mjs'

/**
 * @handleExport
 * @description
 * @param {type} param - suffix: json,txt,csv
 * @returns {type}
 */
export const handleExport = ({
  fileName,
  suffix,
  opts,
  result,
  msg = '已导出'
}) => {
  const config = { dir: opts.output.dir || path.resolve('output-wukong') }
  const baseDir = `${config.dir}/${EXPORT_DIR}`
  if (suffix === 'json') {
    writeJsonFile(baseDir, fileName, result)
  } else {
    writeTxtFile(baseDir, fileName, result)
  }

  const file = `${baseDir}/${fileName}`
  logger.success(`${fileName}`, file, msg)
}

export const handleExportOvertimeMain = ({
  fileName,
  suffix = 'json',
  opts,
  result
}) => {
  handleExport({
    fileName,
    suffix,
    opts,
    result,
    msg: 'overtime JSON 已导出'
  })
}

export const handleExportOvertimeTxt = ({
  fileName,
  suffix = 'txt',
  opts,
  result
}) => {
  handleExport({
    fileName,
    suffix,
    opts,
    result,
    msg: '已导出(Overtime text)'
  })
}

export const handleExportOvertimeTabTxt = ({
  fileName,
  suffix = 'txt',
  opts,
  result
}) => {
  handleExport({
    fileName,
    suffix,
    opts,
    result,
    msg: '已导出(Overtime table (tabs))'
  })
}

export const handleExportOvertimeCsv = ({
  fileName,
  suffix = 'csv',
  opts,
  result
}) => {
  handleExport({
    fileName,
    suffix,
    opts,
    result,
    msg: '已导出(Overtime CSV )'
  })
}
