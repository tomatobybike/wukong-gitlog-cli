import { buildAuthorChangeStats } from './stats.mjs'

export function renderAuthorChangesJson(records) {
  return buildAuthorChangeStats(records)
}
