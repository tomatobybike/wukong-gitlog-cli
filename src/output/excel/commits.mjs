import { exportExcel } from '../excel.mjs'

export async function outputCommitsExcel(result, config) {
  await exportExcel(result.records, null, {
    file: `${config.dir}/${config.file || 'commits.xlsx'}`,
    stats: config.stats,
    gerrit: config.gerrit
  })
}
