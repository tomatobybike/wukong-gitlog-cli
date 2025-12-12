import { $ } from 'zx'

import { createAuthorNormalizer } from './utils/authorNormalizer.mjs'

const normalizer = createAuthorNormalizer()

export async function getGitLogsSlow(opts) {
  const { author, email, since, until, limit, merges } = opts

  const pretty = '%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%B%x1e'
  const args = ['log', `--pretty=format:${pretty}`, '--date=iso-local']

  if (author) args.push(`--author=${author}`)
  if (email) args.push(`--author=${email}`)
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (merges === false) args.push(`--no-merges`)
  if (limit) args.push(`-n`, `${limit}`)

  const { stdout } = await $`git ${args}`.quiet()

  const commits = stdout
    .split('\x1e')
    .filter(Boolean)
    .map((r) => {
      const f = r.split('\x1f').map((s) => (s || '').trim())
      const hash = f[0]
      const authorName = f[1]
      const emailAddr = f[2]
      const date = f[3]
      const subject = f[4]
      const body = f[5] || ''

      const [, changeId] = body.match(/Change-Id:\s*(I[0-9a-fA-F]+)/) || []

      return {
        hash,
        author: normalizer.getAuthor(authorName, emailAddr),
        originalAuthor: authorName,
        email: emailAddr,
        date,
        message: subject,
        body,
        changeId
      }
    })

  // === 新增：为每个 commit 计算代码增量 ===
  for (const c of commits) {
    try {
      const { stdout: diffOut } =
        await $`git show --numstat --format= ${c.hash}`.quiet()
      // numstat 格式:  "12 5 path/file.js"
      const lines = diffOut
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && /^\d+\s+\d+/.test(l))

      let added = 0
      let deleted = 0

      for (const line of lines) {
        const [a, d] = line.split(/\s+/)
        added += parseInt(a, 10) || 0
        deleted += parseInt(d, 10) || 0
      }

      c.added = added
      c.deleted = deleted
      c.changed = added + deleted
    } catch (err) {
      // 避免阻塞，异常时改动量设置为0
      c.added = 0
      c.deleted = 0
      c.changed = 0
    }
  }

  return { commits, authorMap: {} }
}

export async function getGitLogsQuick(opts) {
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

  const rawCommits = stdout.split('\x1e').filter(Boolean)
  const commits = []

  for (const raw of rawCommits) {
    const block = raw.replace(/\r/g, '').trim()
    // eslint-disable-next-line no-continue
    if (!block) continue

    // header: 6 个字段用 \x1f 分隔
    const headerMatch = block.match(
      // eslint-disable-next-line no-control-regex
      /^([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([\s\S]*)$/
    )
    // eslint-disable-next-line no-continue
    if (!headerMatch) continue

    const [, hash, authorName, emailAddr, date, subject, body] = headerMatch

    const [, changeId] = body.match(/Change-Id:\s*(I[0-9a-fA-F]+)/) || []

    const c = {
      hash,
      author: normalizer.getAuthor(authorName, emailAddr),
      originalAuthor: authorName,
      email: emailAddr,
      date,
      message: subject,
      body,
      changeId,
      added: 0,
      deleted: 0,
      changed: 0,
      files: []
    }

    // 匹配所有 numstat 行
    const numstatLines = block
      .split('\n')
      .filter((l) => /^\d+\s+\d+\s+/.test(l))
    for (const line of numstatLines) {
      const [a, d, file] = line.trim().split(/\s+/)
      const added = parseInt(a, 10) || 0
      const deleted = parseInt(d, 10) || 0
      c.added += added
      c.deleted += deleted
      c.changed += added + deleted
      c.files.push({ file, added, deleted })
    }

    commits.push(c)
  }

  return {
    commits,
    authorMap: normalizer.getMap()
  }
}

/**
 * 高性能 git log + numstat 获取 commit
 */
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
  // eslint-disable-next-line no-control-regex
  const commitRegex =
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
