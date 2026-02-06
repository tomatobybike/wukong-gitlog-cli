/* eslint-disable no-shadow */
/**
 * 高性能 git log + numstat 获取 commit（无 shell / 无 WSL 版本）
 *
 * 特点：
 * - 使用 execFile 直接调用 git（不经过 shell）
 * - Windows / macOS / Linux 行为一致
 * - 避免 zx / WSL / bash 相关问题
 * - 支持大仓库（超大 stdout buffer）
 */
import dayjs from 'dayjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { createAuthorNormalizer } from '#utils/authorNormalizer.mjs'

const execFileAsync = promisify(execFile)

/**
 * 获取 git commit 列表（高性能版）
 */
export async function getGitLogsFast(opts = {}) {
  /*
 git: { merges: true, limit: undefined },
  period: { groupBy: 'month', since: '2026-12-01', until: '2026-12-06' },
  worktime: {
    country: 'CN',
    start: 9,
    end: 18,
    lunch: { start: 12, end: 14 },
    overnightCutoff: 6
  },
  output: {
    out: 'commits',
    dir: 'output-wukong',
    formats: 'text',
    perPeriod: { enabled: true, excelMode: 'sheets', formats: [] }
  },
  author: { include: [ '杨琼,王欢庆' ] },
  overtime: false,
  gerrit: { prefix: undefined, api: undefined, auth: undefined },
  serve: { port: 3000 },
  profile: {
    enabled: undefined,
    flame: true,
    traceFile: 'trace.json',
    hotThreshold: 0.8,
    diffThreshold: 0.2,
    failOnHot: false,
    diffBaseFile: 'baseline.json'
  }
  */
  const { git = {}, period = {}, author, email } = opts
  // 在运行时根据传入的 opts.authorAliases（或用户配置）创建 normalizer
  const normalizer = createAuthorNormalizer(opts.authorAliases || {})
  const { since, until } = period
  const { limit, merges } = git

  // 对于 CLI 传入的 author，只有当它是字符串时才传给 git
  // 如果是对象（包含 include/exclude），我们在前端做更精细的过滤
  const authorIsString = typeof author === 'string' && author.trim().length > 0

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
    '--numstat',
    '--all'
  ]

  if (authorIsString) args.push(`--author=${author}`)
  if (email && typeof email === 'string') args.push(`--author=${email}`)
  // if (since) args.push(`--since=${until}`)
  if (since) {
    // 传给 git 绝对的 ISO 字符串，让 Git 自己去比对时间戳
    args.push(`--since=${dayjs(since).startOf('day').toISOString()}`)
  }
  if (until) {
    // 传给 git 绝对的 ISO 字符串，让 Git 自己去比对时间戳
    args.push(`--until=${dayjs(until).endOf('day').toISOString()}`)
  }
  // if (until) args.push(`--until=${until}`)
  if (!merges) args.push(`--no-merges`)
  if (limit) args.push('-n', String(limit))



  let stdout
  try {
    /**
     * execFile 直接执行 git：
     * - 不使用 shell
     * - 不会触发 WSL / bash
     * - maxBuffer 放大，防止大仓库 stdout 溢出
     */
    const result = await execFileAsync('git', args, {
      maxBuffer: 1024 * 1024 * 200 // 200MB（Windows 大仓库友好）
    })
    stdout = result.stdout
  } catch (err) {
    /**
     * 统一错误出口，方便 CLI 层捕获
     */
    const message = err?.stderr || err?.message || 'Failed to execute git log'
    const error = new Error(message)
    error.cause = err
    throw error
  }

  /**
   * Windows 下 git 输出可能带 \r
   */
  const raw = stdout.replace(/\r/g, '')
  const commits = []

  /**
   * 匹配每个 commit header + body + numstat
   */
  const commitRegex =
    // eslint-disable-next-line no-control-regex
    /([0-9a-f]+)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([\s\S]*?)(?=(?:[0-9a-f]{7,40}\x1f)|\x1e$)/g

  // --- 关键改进 2: 引入内容指纹去重集 ---
  const fingerPrintSet = new Set()

  for (const match of raw.matchAll(commitRegex)) {
    const [_, hash, authorName, emailAddr, date, subject, bodyAndNumstat] =
      match

      // 1. 统一作者名
    const normalizedAuthor = normalizer.getAuthor(authorName, emailAddr);
    // 2. 格式化日期（消除时刻差异，只看天）
    const day = dayjs(date).format('YYYY-MM-DD');
    // 3. 清理消息内容（去空格，取第一行）
    const cleanMsg = subject.trim();

    // 生成指纹：日期 + 统一后的作者 + 消息内容
    // 这样即便 Hash 不同，分支不同，只要这三项一致，就视为同一项工作
    const fingerPrint = `${day}_${normalizedAuthor}_${cleanMsg}`;

    if (fingerPrintSet.has(fingerPrint)) continue;
    fingerPrintSet.add(fingerPrint);

    const [, changeId] =
      bodyAndNumstat.match(/Change-Id:\s*(I[0-9a-fA-F]+)/) || []

    const cherryPickMatch = bodyAndNumstat.match(
      /\(cherry picked from commit\s+([0-9a-f]{7,40})\)/i
    )

    /**
     * 解析 numstat
     */
    const commit = {
      hash,
      author: normalizer.getAuthor(authorName, emailAddr),
      originalAuthor: authorName,
      email: emailAddr,
      date,
      message: subject,
      body: bodyAndNumstat,
      changeId,

      // ✅ 新增标记
      isCherryPick: Boolean(cherryPickMatch),
      cherryPickFrom: cherryPickMatch?.[1],

      added: 0,
      deleted: 0,
      changed: 0,
      files: []
    }

    const numstatRegex = /^(\d+)\s+(\d+)\s+(.+)$/gm
    for (const m of bodyAndNumstat.matchAll(numstatRegex)) {
      const added = parseInt(m[1], 10) || 0
      const deleted = parseInt(m[2], 10) || 0
      const file = m[3]

      commit.added += added
      commit.deleted += deleted
      commit.changed += added + deleted
      commit.files.push({ file, added, deleted })
    }

    commits.push(commit)
  }

  /**
   * 最终统一覆盖 author
   * 确保同一 email 使用同一个（中文）作者名
   */
  // 应用基于邮箱的最终映射
  const finalMap = normalizer.getMap()
  for (const c of commits) {
    if (c.email && finalMap[c.email]) {
      c.author = finalMap[c.email]
    }
  }

  // 支持配置：author.include / author.exclude（可为数组或逗号分隔字符串）
  const authorCfg = opts.author
  function toList(v) {
    if (!v) return null
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean)
    return String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const include =
    authorCfg && typeof authorCfg === 'object'
      ? toList(authorCfg.include)
      : typeof authorCfg === 'string'
        ? toList(authorCfg)
        : null
  const exclude =
    authorCfg && typeof authorCfg === 'object'
      ? toList(authorCfg.exclude)
      : null

  let filteredCommits = commits

  if (include || exclude) {
    filteredCommits = commits.filter((c) => {
      const name = (c.author || c.originalAuthor || '').trim().toLowerCase()
      const mail = (c.email || '').trim().toLowerCase()

      function matches(list) {
        if (!list || !list.length) return false
        return list.some((item) => {
          const it = String(item).trim().toLowerCase()
          if (it.includes('@')) return it === mail
          return it === name
        })
      }

      if (include && include.length) {
        if (!matches(include)) return false
      }

      if (exclude && exclude.length) {
        if (matches(exclude)) return false
      }

      return true
    })
  }

  // 重新计算 authorMap / originalMap 以只包含筛选后的作者
  const presentEmails = new Set(
    filteredCommits.map((c) => c.email).filter(Boolean)
  )
  const filteredMap = {}
  for (const [email, name] of Object.entries(finalMap)) {
    if (presentEmails.has(email)) filteredMap[email] = name
  }

  const original = normalizer.getOriginalMap()
  const filteredOriginal = {}
  for (const [email, names] of Object.entries(original)) {
    if (presentEmails.has(email)) filteredOriginal[email] = names
  }

  return {
    commits: filteredCommits,
    authorMap: filteredMap,
    originalMap: filteredOriginal
  }
}

/**
 * 去重 cherry-pick commit
 *
 * 默认策略：
 * - 按 Change-Id 去重
 * - 优先保留非 cherry-pick
 * - 多个 cherry-pick 时保留 first / last
 */
export function dedupeCommits(
  commits,
  {
    by = 'changeId', // 'changeId' | 'hash'
    prefer = 'original' // 'original' | 'first' | 'last'
  } = {}
) {
  const map = new Map()

  for (const commit of commits) {
    const key = by === 'changeId' ? commit.changeId || commit.hash : commit.hash

    if (!map.has(key)) {
      map.set(key, commit)
      continue
    }

    const existing = map.get(key)

    // 优先保留非 cherry-pick
    if (prefer === 'original') {
      if (!existing.isCherryPick && commit.isCherryPick) continue
      if (existing.isCherryPick && !commit.isCherryPick) {
        map.set(key, commit)
        continue
      }
    }

    if (prefer === 'last') {
      map.set(key, commit)
    }
  }

  return Array.from(map.values())
}
