/**
 * @file: index.mjs
 * @description:启动前环境检查
 * @author: King Monkey
 * @created: 2026-01-13 01:16
 */
import { ensureGitRepo } from '#src/domain/git/ensureGitRepo.mjs'
import { getGitFeatures } from '#src/domain/git/getGitFeatures.mjs'
import { getGitUser } from '#src/domain/git/getGitUser.mjs'
import { getRepoRoot } from '#src/domain/git/getRepoRoot.mjs'
import { getGitCapability } from '#src/domain/git/gitCapability.mjs'

/**
 * CLI 启动阶段 Git 运行环境预检（Preflight）
 *
 * @returns {Promise<{
 *   git: {
 *     version: string
 *     platform: string
 *   },
 *   repo: {
 *     root: string
 *   },
 *   user: {
 *     name: string
 *     email: string
 *   },
 *   features: {
 *     numstat: boolean
 *     dateIsoLocal: boolean
 *   },
 *   meta: {
 *     checkedAt: number
 *   }
 * }>}
 */
export const runGitPreflight = async () => {
  // 1️⃣ git 可执行能力（带全局 cache）
  // CLI 启动即检测（一次）
  const gitCapability = await getGitCapability()

  // 2️⃣ 必须在 git repo 内
  await ensureGitRepo()

  // 3️⃣ 并行获取上下文信息
  const [root, user, features] = await Promise.all([
    getRepoRoot(),
    getGitUser(),
    getGitFeatures()
  ])

  const result = {
    git: {
      version: gitCapability.version,
      platform: gitCapability.platform
    },

    repo: {
      root
    },

    user: {
      name: user.name,
      email: user.email
    },

    features,

    meta: {
      checkedAt: gitCapability.checkedAt
    }
  }

  // 可选：打印
  console.log(`✔ Git detected: ${result.git.version}`)
  console.log(`✔ platform: ${result.git.platform}`)

  console.log('root', result.repo.root)
  console.log('user', result.user.name)
  console.log('email', result.user.email)
  console.log('features', result.features)
  console.log(`-`.repeat(50), '\n')

  return result
}
