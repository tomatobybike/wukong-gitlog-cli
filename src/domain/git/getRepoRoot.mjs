/**
 * 获取 git 仓库根目录
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getGitCapability } from './gitCapability.mjs'

const execFileAsync = promisify(execFile)

/**
 * @returns {Promise<string>} 仓库根路径
 */
export async function getRepoRoot() {
  await getGitCapability()

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 1024 * 1024
      }
    )

    return stdout.trim()
  } catch {
    throw new Error(`❌ 无法获取 Git 仓库根目录`)
  }
}
