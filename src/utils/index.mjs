import dayjs from 'dayjs'

export const getCurrentTimestampSecond = () => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}
