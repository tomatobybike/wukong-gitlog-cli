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

  const initialPort = Number(opts.port || 3000)
  let port = initialPort
  let server = null
  const maxTries = 50 // 尝试的端口数量上限

  for (let i = 0; i < maxTries; i++) {
    try {
      server = await startServer(port, dir, data)
      break
    } catch (err) {
      // 端口被占用，尝试下一个端口；其它错误抛出
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, trying ${port + 1}...`)
        port += 1
        continue
      }
      throw err
    }
  }

  if (!server) {
    throw new Error(`Failed to start server on ports ${initialPort} - ${port}.`)
  }

  if (port !== initialPort) {
    console.log(`Port ${initialPort} occupied, server started on ${port}.`)
  }

  return server
}
