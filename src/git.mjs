import { $ } from 'zx'

export async function getGitLogs(opts) {
  const { author, email, since, until, limit, merges } = opts

  const pretty = '%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%B%x1e'
  const args = ['log', `--pretty=format:${pretty}`, '--date=iso']

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
        author: authorName,
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
      const { stdout: diffOut } = await $`git show --numstat --format= ${c.hash}`.quiet()
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

  return commits
}
