#!/usr/bin/env zx
import 'zx/globals';

export async function getGitLogs(opts) {
  const { author, email, since, until, limit, merges } = opts;

  const pretty = '%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e';

  const args = [
    'git',
    'log',
    `--pretty=format:${pretty}`,
    '--date=iso'
  ];

  if (author) args.push(`--author=${author}`);
  if (email) args.push(`--author=${email}`);
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (merges === false) args.push(`--no-merges`);
  if (limit) args.push(`-n`, limit);

  const cmd = args.join(' ');

  const result = await $`${cmd}`.quiet();

  return result.stdout
    .split('\x1e')
    .filter(Boolean)
    .map(r => {
      const f = r.split('\x1f');
      return {
        hash: f[0],
        author: f[1],
        email: f[2],
        date: f[3],
        message: f[4]
      };
    });
}
