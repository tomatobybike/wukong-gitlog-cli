/**
 * @file: devLog.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-08-04 16:25
 */
import { getConfig } from '../lib/configStore.mjs'
import { logger } from './logger.mjs'

/**
 * 开发环境下输出调试信息
 * 推荐用于局部调试
 */
export function logDev(...args) {
  if (getConfig('debug')) {
    const msg = args.join(' ')
    logger.debug(msg)
  }
}
