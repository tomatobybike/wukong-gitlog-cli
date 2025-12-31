

import { parseOptions } from '../cli/parseOptions.mjs'

export async function exportAction(rawOpts = {}) {
    const opts = parseOptions(rawOpts)
  // FIXME: remove debug log before production
  console.log('exportAction', 'opts', opts);
}
