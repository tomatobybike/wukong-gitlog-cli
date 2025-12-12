import { Chalk } from 'chalk'
import { performance } from 'perf_hooks'

import { exitWithTime } from './exitWithTime.mjs'
import { costTimer } from './timer.mjs'

export const handleSuccess = ({ message = 'Done', startTime, spinner }) => {
  spinner.succeed(message)

  // 如果需要退出，可以调用 exitWithTime
  exitWithTime(startTime, 0)
}
