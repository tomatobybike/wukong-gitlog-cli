/**
 * 获取 git user.name / user.email
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getGitCapability } from './gitCapability.mjs'

const execFileAsync = promisify(execFile)

/**
 * @returns {Promise<{ name: string, email: string }>}
 */
export async function getGitUser() {
  await getGitCapability()

  const getConfig = async (key) => {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['config', '--get', key],
        {
          windowsHide: true,
          timeout: 3000,
          maxBuffer: 1024 * 1024
        }
      )

      return stdout.trim()
    } catch {
      return ''
    }
  }

  const [name, email] = await Promise.all([
    getConfig('user.name'),
    getConfig('user.email')
  ])

  return {
    name,
    email
  }
}
