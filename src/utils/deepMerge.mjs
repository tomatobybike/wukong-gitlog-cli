export function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // eslint-disable-next-line no-param-reassign
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      // eslint-disable-next-line no-param-reassign
      target[key] = source[key];
    }
  }
  return target;
}
