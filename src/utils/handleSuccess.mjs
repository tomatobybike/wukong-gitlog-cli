import { Chalk } from 'chalk'
import { performance } from 'perf_hooks'

import { exitWithTime } from './exitWithTime.mjs'
import { costTimer } from './timer.mjs'

export const handleSuccess = ({ message = 'Done', spinner }) => {
  spinner.succeed(message)
}
