/**
 * CLI 启动时检测 git 是否可用
 *
 * - 不使用 shell
 * - 不触发 WSL
 * - Windows / macOS / Linux 通用
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function ensureGitAvailable() {
  try {
    const { stdout } = await execFileAsync('git', ['--version'], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024
    })

    // 示例输出：git version 2.45.1.windows.1
    if (!stdout || !stdout.toLowerCase().includes('git version')) {
      throw new Error(`Unexpected git output: ${stdout}`)
    }

    return stdout.trim()
  } catch (err) {
    /**
     * 统一抛出人类可读错误
     */
    const { platform } = process

    let hint = ''

    if (platform === 'win32') {
      hint = `
请确认：
1️⃣ 已安装 Git for Windows
   https://git-scm.com/download/win

2️⃣ 安装时勾选：
   ✔ "Add Git to PATH"

3️⃣ 关闭并重新打开终端后再试
`
    } else if (platform === 'darwin') {
      hint = `
可通过以下方式安装 git：
  xcode-select --install
或
  brew install git
`
    } else {
      hint = `
请使用系统包管理器安装 git，例如：
  apt install git
  yum install git
`
    }

    const error = new Error(`❌ Git 不可用，CLI 无法继续运行\n\n${hint}`)

    error.cause = err
    throw error
  }
}
