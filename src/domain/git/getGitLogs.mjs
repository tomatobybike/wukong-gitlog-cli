/**
 * 高性能 git log + numstat 获取 commit
 */
import { $ } from 'zx'

import { createAuthorNormalizer } from '#utils/authorNormalizer.mjs'

const normalizer = createAuthorNormalizer()

export async function getGitLogsFast(opts = {}) {
  const { author, email, since, until, limit, merges } = opts

  const pretty = `${[
    '%H', // hash
    '%an', // author name
    '%ae', // email
    '%ad', // date
    '%s', // subject
    '%B' // body
  ].join('%x1f')}%x1e`

  const args = [
    'log',
    `--pretty=format:${pretty}`,
    '--date=iso-local',
    '--numstat'
  ]

  if (author) args.push(`--author=${author}`)
  if (email) args.push(`--author=${email}`)
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (merges === false) args.push(`--no-merges`)
  if (limit) args.push('-n', `${limit}`)

  const { stdout } = await $`git ${args}`.quiet()
  const raw = stdout.replace(/\r/g, '')

  const commits = []

  // 匹配每个 commit header + numstat
  const commitRegex =
    // eslint-disable-next-line no-control-regex
    /([0-9a-f]+)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([\s\S]*?)(?=(?:[0-9a-f]{7,40}\x1f)|\x1e$)/g
  let match

  for (const ns of raw.matchAll(commitRegex)) {
    const [_, hash, authorName, emailAddr, date, subject, bodyAndNumstat] = ns
    const [, changeId] =
      bodyAndNumstat.match(/Change-Id:\s*(I[0-9a-fA-F]+)/) || []

    const c = {
      hash,
      author: normalizer.getAuthor(authorName, emailAddr),
      originalAuthor: authorName,
      email: emailAddr,
      date,
      message: subject,
      body: bodyAndNumstat,
      changeId,
      added: 0,
      deleted: 0,
      changed: 0,
      files: []
    }

    // 匹配 numstat
    const numstatRegex = /^(\d+)\s+(\d+)\s+(.+)$/gm
    for (const m of bodyAndNumstat.matchAll(numstatRegex)) {
      const added = parseInt(m[1], 10) || 0
      const deleted = parseInt(m[2], 10) || 0
      const file = m[3]
      c.added += added
      c.deleted += deleted
      c.changed += added + deleted
      c.files.push({ file, added, deleted })
    }

    commits.push(c)
  }

  // 最终统一覆盖 author，保证所有 commit 都使用中文名（如存在）
  const finalMap = normalizer.getMap()
  for (const c of commits) {
    if (c.email && finalMap[c.email]) {
      c.author = finalMap[c.email]
    }
  }

  return {
    commits,
    authorMap: finalMap,
    originalMap: normalizer.getOriginalMap()
  }
}
