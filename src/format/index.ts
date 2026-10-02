export function formatRelativeTime(timestamp: string, now: number, locale: string) {
  const seconds = (Date.parse(timestamp) - now) / 1000
  const [scale, unit]: [number, Intl.RelativeTimeFormatUnit] =
    Math.abs(seconds) < 60
      ? [1, 'second']
      : Math.abs(seconds) < 3600
        ? [60, 'minute']
        : Math.abs(seconds) < 86400
          ? [3600, 'hour']
          : [86400, 'day']
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(seconds / scale), unit)
}
export function formatDate(timestamp: string, locale: string, timeZone?: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(timestamp))
}
export function formatDuration(seconds: number, locale: string) {
  const part = (value: number, unit: 'hour' | 'minute' | 'second') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  const whole = Math.round(seconds)
  if (whole < 60) return part(whole, 'second')
  const hours = Math.floor(whole / 3600),
    minutes = Math.floor((whole % 3600) / 60)
  if (hours === 0) return part(minutes, 'minute')
  return minutes ? `${part(hours, 'hour')} ${part(minutes, 'minute')}` : part(hours, 'hour')
}
