/**
 * Git Capability Cache
 *
 * - CLI 生命周期内只检测一次
 * - 不使用 shell
 * - 不触发 WSL
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * @type {null | {
 *   available: boolean
 *   version: string
 *   platform: string
 *   checkedAt: number
 * }}
 */
let cache = null

/**
 * 内部：真正执行 git 检测
 */
async function detectGit() {
  const {platform} = process

  const { stdout } = await execFileAsync('git', ['--version'], {
    windowsHide: true,
    timeout: 5000,
    maxBuffer: 1024 * 1024
  })

  if (!stdout || !stdout.toLowerCase().includes('git version')) {
    throw new Error(`Unexpected git output: ${stdout}`)
  }

  return {
    available: true,
    version: stdout.trim(),
    platform,
    checkedAt: Date.now()
  }
}

/**
 * 对外 API：获取 git capability（带缓存）
 */
export async function getGitCapability() {
  if (cache) {
    return cache
  }

  try {
    cache = await detectGit()
    return cache
  } catch (err) {
    cache = {
      available: false,
      version: '',
      platform: process.platform,
      checkedAt: Date.now()
    }

    // eslint-disable-next-line no-use-before-define
    const error = new Error(buildGitNotAvailableMessage())
    error.cause = err
    throw error
  }
}

/**
 * 是否已检测（通常你不需要）
 */
export function isGitCapabilityCached() {
  return Boolean(cache)
}

/**
 * 生成跨平台提示信息
 */
function buildGitNotAvailableMessage() {
  const {platform} = process

  if (platform === 'win32') {
    return `
❌ Git 不可用，CLI 无法继续运行

请确认：
1️⃣ 已安装 Git for Windows
   https://git-scm.com/download/win

2️⃣ 安装时勾选：
   ✔ "Add Git to PATH"

3️⃣ 关闭并重新打开终端后再试
`
  }

  if (platform === 'darwin') {
    return `
❌ Git 不可用，CLI 无法继续运行

可通过以下方式安装 git：
  xcode-select --install
或
  brew install git
`
  }

  return `
❌ Git 不可用，CLI 无法继续运行

请使用系统包管理器安装 git，例如：
  apt install git
  yum install git
`
}
