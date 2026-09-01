import dayjs from 'dayjs'
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const DATE_FORMAT = 'YYYY-MM-DD'
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
function isIsoDateTimeLike(value) {
  return typeof value === 'string' && ISO_DATETIME_RE.test(value.trim())
}
function formatDateTime(value, format = DATETIME_FORMAT) {
  if (value === null || value === void 0 || value === '') return '\u2014'
  const d = dayjs(value)
  return d.isValid() ? d.format(format) : String(value)
}
function formatDate(value, format = DATE_FORMAT) {
  return formatDateTime(value, format)
}
/** 对话时间：当天只显示时分，跨天显示月-日 时分 */
function formatChatTime(value) {
  if (value === null || value === void 0 || value === '') return ''
  const raw = typeof value === 'string' ? value.replace(' ', 'T') : value
  const d = dayjs(raw)
  if (!d.isValid()) return String(value)
  return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('MM-DD HH:mm')
}
function normalizeDateTimes(input) {
  if (input === null || input === void 0) return input
  if (typeof input === 'string') {
    return isIsoDateTimeLike(input) ? formatDateTime(input) : input
  }
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i += 1) {
      input[i] = normalizeDateTimes(input[i])
    }
    return input
  }
  if (typeof input === 'object') {
    const obj = input
    for (const key of Object.keys(obj)) {
      const value = obj[key]
      if (isIsoDateTimeLike(value)) {
        obj[key] = formatDateTime(value)
      } else if (value && typeof value === 'object') {
        normalizeDateTimes(value)
      }
    }
  }
  return input
}
export {
  DATETIME_FORMAT,
  DATE_FORMAT,
  formatChatTime,
  formatDate,
  formatDateTime,
  isIsoDateTimeLike,
  normalizeDateTimes,
}
