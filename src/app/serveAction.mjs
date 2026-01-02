import { readServeData } from '../output/data/readData.mjs'
import { startServer } from '../serve/startServer.mjs'

export async function serveAction(opts) {
  const dir = opts.outDir || 'output-wukong'

  const data = readServeData(dir)

  if (!data) {
    throw new Error(
      'No serve data found. Please run `wukong-gitlog analyze` first.'
    )
  }

  await startServer(opts.port || 3000, dir, data)
}
