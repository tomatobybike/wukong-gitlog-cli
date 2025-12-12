export function parseOptions(opts) {
  return {
    startHour: opts.workStart ?? 9,
    endHour: opts.workEnd ?? 18,
    lunchStart: opts.lunchStart ?? 12,
    lunchEnd: opts.lunchEnd ?? 14,
    country: opts.country ?? 'CN'
  };
}
