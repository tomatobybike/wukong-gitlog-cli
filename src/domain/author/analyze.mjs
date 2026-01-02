import { buildAuthorChangeStats } from '#utils/buildAuthorChangeStats.mjs'

// 分析作者变更统计
export const getAuthorChangeStats = (records) => {
  return buildAuthorChangeStats(records)
}
