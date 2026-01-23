// eslint-disable-next-line no-promise-executor-return
export const wait = (time) => new Promise((res) => setTimeout(res, time))
