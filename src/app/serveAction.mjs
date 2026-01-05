import { readServeData } from '../output/data/readData.mjs'
import { startServer } from '../serve/startServer.mjs'
import { parseOptions } from '../cli/parseOptions.mjs'

export async function serveAction(rawOpts = {}) {
  const opts = await parseOptions(rawOpts)
  const dir = opts.output.dir || 'output-wukong'

  const data = readServeData(dir)

  if (!data) {
    throw new Error(
      'No serve data found. Please run `wukong-gitlog analyze` first.'
    )
  }

  await startServer(opts.port || 3000, dir, data)
}
