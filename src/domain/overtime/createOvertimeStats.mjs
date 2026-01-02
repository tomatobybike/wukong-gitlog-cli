import { analyzeOvertime } from './overtime.mjs';

export function createOvertimeStats(defaultConfig = {}) {
  return function getOvertimeStats(records, overrides) {
    const config = overrides
      ? { ...defaultConfig, ...overrides }
      : defaultConfig;

    return analyzeOvertime(records, config);
  };
}
