import { $ } from 'zx'


export async function getGitLogs(opts) {
  const { author, email, since, until, limit, merges } = opts

  // include subject and full body so we can extract Change-Id from commit message
  const pretty = '%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%B%x1e'

  const args = ['log', `--pretty=format:${pretty}`, '--date=iso']

  if (author) args.push(`--author=${author}`)
  if (email) args.push(`--author=${email}`)
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (merges === false) args.push(`--no-merges`)
  if (limit) args.push(`-n`, `${limit}`)

  // 使用 spread 形式传参，ZX 才会正确处理
  const { stdout } = await $`git ${args}`.quiet()

  return stdout
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

      // extract Change-Id from commit body (line like "Change-Id: Iabc123...")
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
}
