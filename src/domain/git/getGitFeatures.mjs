/**
 * 检测 git 功能支持情况
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getGitCapability } from './gitCapability.mjs'

const execFileAsync = promisify(execFile)

/**
 * @returns {Promise<{
 *   numstat: boolean
 *   dateIsoLocal: boolean
 * }>}
 */
export async function getGitFeatures() {
  await getGitCapability()

  const features = {
    numstat: false,
    dateIsoLocal: false
  }

  /**
   * --numstat 是很早就支持的
   * 实际跑一次最靠谱
   */
  try {
    await execFileAsync(
      'git',
      ['log', '--numstat', '-1'],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 1024 * 1024
      }
    )
    features.numstat = true
  } catch { /* empty */ }

  /**
   * --date=iso-local 是相对较新的格式
   */
  try {
    await execFileAsync(
      'git',
      ['log', '--date=iso-local', '-1'],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 1024 * 1024
      }
    )
    features.dateIsoLocal = true
  } catch { /* empty */ }

  return features
}
