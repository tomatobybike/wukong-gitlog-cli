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
export function startServer({ port = 3000, outputDir, data,lang }) {
  // 解析包根目录，确保 web 资源在全局安装后也能找到
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // 动态寻找根目录
  const pkgRoot = findPkgRoot(__dirname)

  const webRoot = path.resolve(pkgRoot, 'web')
  const dataRoot = outputDir
    ? path.resolve(outputDir)
    : path.resolve(process.cwd(), 'output-wukong')

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

        // 👇 只对 index.html 注入
        if (pathname === '/index.html') {
          // FIXME: remove debug log before production
          console.log('❌', 'lang', lang);
          let html = fs.readFileSync(fileLocal, 'utf8')

          html = html.replace(
            `window.__LANG__ = '__LANG__'`,
            `window.__LANG__ = "${lang}"`
          )

          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
          return
        }

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
      // 监听到的真实端口（当 port 为 0 或系统分配端口时很重要）
      const bound = server.address()
      const actualPort = bound && bound.port ? bound.port : port
      const url = `http://localhost:${actualPort}`
      console.log(chalk.green(`Server started at ${url}`))
      console.log(chalk.green(`Serving web/ and output-wukong/data/`))

      // ====== 自动打开浏览器 ======
      openBrowser(url)
      resolve(server)
    })
  })
}

export default startServer
