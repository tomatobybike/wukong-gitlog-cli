import chalk from 'chalk'
import { exec } from 'child_process'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.map', 'application/json; charset=utf-8']
])

// --------------------------------
// 打开浏览器（跨平台）
// --------------------------------
function openBrowser(url) {
  const { platform } = process

  let cmd
  if (platform === 'win32') {
    cmd = `start "" "${url}"`
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`
  } else {
    cmd = `xdg-open "${url}"`
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(chalk.yellow(`Failed to auto-open browser: ${err.message}`))
    }
  })
}

// 辅助函数：向上寻找包含 package.json 的根目录
function findPkgRoot(currentDir) {
  if (fs.existsSync(path.join(currentDir, 'package.json'))) {
    return currentDir
  }
  const parentDir = path.resolve(currentDir, '..')
  if (parentDir === currentDir) return currentDir // 已到系统根目录
  return findPkgRoot(parentDir)
}

// eslint-disable-next-line default-param-last
export function startServer(port = 3000, outputDir) {
  // 解析包根目录，确保 web 资源在全局安装后也能找到
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // 动态寻找根目录
  const pkgRoot = findPkgRoot(__dirname)

  // FIXME: remove debug log before production
  console.log('✅', 'pkgRoot', pkgRoot)
  const webRoot = path.resolve(pkgRoot, 'web')
  const dataRoot = outputDir
    ? path.resolve(outputDir)
    : path.resolve(process.cwd(), 'output-wukong')

  // TODO: remove debug log before production
  console.log('✅', 'outputDir', outputDir)
  // warn if web directory or data directory doesn't exist
  if (!fs.existsSync(webRoot)) {
    console.warn(
      chalk.yellow(
        `Warning: web/ directory not found at ${webRoot}. Server will still run but no UI will be available.`
      )
    )
  }
  if (!fs.existsSync(dataRoot)) {
    console.warn(
      chalk.yellow(
        `Warning: output data directory not found at ${dataRoot}. Server will still run but data endpoints (/data/) may 404.`
      )
    )
  }

  const server = http.createServer((req, res) => {
    try {
      // Normalize URL path
      const u = new URL(req.url, `http://localhost`)
      let pathname = decodeURIComponent(u.pathname)

      // Serve data files under /data/* mapped to dataRoot/data/*
      if (pathname.startsWith('/data/')) {
        const relative = pathname.replace(/^\/data\//, '')
        const fileLocal = path.join(dataRoot, 'data', relative)
        if (fs.existsSync(fileLocal) && fs.statSync(fileLocal).isFile()) {
          const ext = path.extname(fileLocal).toLowerCase()
          res.setHeader(
            'Content-Type',
            mime.get(ext) || 'application/octet-stream'
          )
          res.setHeader('Access-Control-Allow-Origin', '*')
          const stream = fs.createReadStream(fileLocal)
          stream.pipe(res)
          return
        }
      }

      // Resolve web assets
      if (pathname === '/') pathname = '/index.html'
      const fileLocal = path.join(webRoot, pathname)
      if (fs.existsSync(fileLocal) && fs.statSync(fileLocal).isFile()) {
        const ext = path.extname(fileLocal).toLowerCase()
        res.setHeader(
          'Content-Type',
          mime.get(ext) || 'application/octet-stream'
        )
        const stream = fs.createReadStream(fileLocal)
        stream.pipe(res)
        return
      }

      // file not found
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Not Found')
    } catch (err) {
      res.statusCode = 500
      res.end('Server error')
    }
  })

  return new Promise((resolve, reject) => {
    server.on('error', (err) => reject(err))
    server.listen(port, () => {
      const url = `http://localhost:${port}`
      console.log(chalk.green(`Server started at ${url}`))
      console.log(chalk.green(`Serving web/ and output-wukong/data/`))

      // ====== 自动打开浏览器 ======
      openBrowser(url)
      resolve(server)
    })
  })
}

export default startServer
