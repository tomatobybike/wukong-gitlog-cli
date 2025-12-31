import { loadRcConfig } from '../infra/configStore.mjs'

export function parseOptions(cliOpts) {
  const rc = loadRcConfig()

  return {
    ...rc,

    // CLI 强覆盖
    ...cliOpts,

    // 深层合并（示意）
    worktime: {
      ...rc.worktime,
      ...cliOpts.worktime
    },

    output: {
      ...rc.output,
      ...cliOpts.output
    }
  }
}
