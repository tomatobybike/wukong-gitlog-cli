import os from 'os'
import process from 'process'

import { colors } from './colors.mjs'



export function showVersionInfo(pkg) {
  const { name, version } = pkg

  console.log(colors.title(`\n${name} v${version}\n`))
  console.log(`${colors.bold('Node.js')}: ${process.version}`)
  console.log(`${colors.bold('Platform')}: ${os.platform()} ${os.arch()}`)
}
