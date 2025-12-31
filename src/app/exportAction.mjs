
/**
 * @file: exportAction.mjs
 * @description:
 * @author: King Monkey
 * @created: 2025-12-31 17:27
 */

import { parseOptions } from '../cli/parseOptions.mjs'

export async function exportAction(rawOpts = {}) {
  // TODO: remove debug log before production
  console.log('✅', 'rawOpts', rawOpts);
    const opts = await parseOptions(rawOpts)
  // FIXME: remove debug log before production
  console.log('exportAction', 'opts', opts);
}
