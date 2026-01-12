/**
 * 确保当前目录在 git 仓库内
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getGitCapability } from './gitCapability.mjs'

const execFileAsync = promisify(execFile)

/**
 * @returns {Promise<boolean>}
 */
export async function ensureGitRepo() {
  await getGitCapability()

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 1024 * 1024
      }
    )

    if (stdout.trim() !== 'true') {
      throw new Error('Not a git repository')
    }

    return true
  } catch {
    throw new Error(
      `❌ 当前目录不是 Git 仓库\n\n请在 Git 项目根目录下运行该命令`
    )
  }
}
