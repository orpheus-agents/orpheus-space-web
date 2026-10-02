/** Five-field cron, as Space validates it: minute, hour, day of month, month, weekday (0 = Sunday). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type Plan =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekdays'; hour: number; minute: number }
  | { kind: 'weekly'; days: Weekday[]; hour: number; minute: number }
  | { kind: 'monthly'; day: number; hour: number; minute: number }
  | { kind: 'hourly'; every: number; minute: number }
  | { kind: 'minutes'; every: number }
  | { kind: 'custom'; expression: string }
export type Kind = Plan['kind']
export const KINDS: Kind[] = ['daily', 'weekdays', 'weekly', 'monthly', 'hourly', 'minutes', 'custom']
/** Monday first, as the week is shown; values are cron weekdays. */
export const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
export const HOUR_STEPS = [1, 2, 3, 4, 6, 8, 12]
export const MINUTE_STEPS = [1, 5, 10, 15, 20, 30]

function integer(field: string, min: number, max: number): number | null {
  if (!/^\d{1,2}$/.test(field)) return null
  const value = Number(field)
  return value >= min && value <= max ? value : null
}
function step(field: string, max: number): number | null {
  if (field === '*') return 1
  const match = /^\*\/(\d{1,2})$/.exec(field)
  return match ? integer(match[1], 1, max) : null
}

/** Recognizes the expressions the builder writes; anything else stays custom. */
export function parse(expression: string): Plan {
  const custom: Plan = { kind: 'custom', expression }
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5 || fields[2] === undefined) return custom
  const [m, h, dom, month, dow] = fields as [string, string, string, string, string]
  if (month !== '*') return custom
  if (m.startsWith('*')) {
    const every = step(m, 59)
    return every === null || !MINUTE_STEPS.includes(every) || h !== '*' || dom !== '*' || dow !== '*' ? custom : { kind: 'minutes', every }
  }
  const minute = integer(m, 0, 59)
  if (minute === null) return custom
  if (dom === '*' && dow === '*' && /^\*(\/\d{1,2})?$/.test(h)) {
    const every = step(h, 23)
    return every === null || !HOUR_STEPS.includes(every) ? custom : { kind: 'hourly', every, minute }
  }
  const hour = integer(h, 0, 23)
  if (hour === null) return custom
  if (dom === '*' && dow === '*') return { kind: 'daily', hour, minute }
  if (dom === '*' && dow === '1-5') return { kind: 'weekdays', hour, minute }
  if (dom === '*' && /^\d(,\d)*$/.test(dow)) {
    const days = [...new Set(dow.split(',').map(Number))].filter((day): day is Weekday => day >= 0 && day <= 6)
    if (days.length !== dow.split(',').length) return custom
    return { kind: 'weekly', days: WEEK.filter((day) => days.includes(day)), hour, minute }
  }
  if (dow === '*') {
    const day = integer(dom, 1, 31)
    return day === null ? custom : { kind: 'monthly', day, hour, minute }
  }
  return custom
}

/** The expression for a plan, or null while the plan is incomplete (a week without days). */
export function build(plan: Plan): string | null {
  switch (plan.kind) {
    case 'daily':
      return `${plan.minute} ${plan.hour} * * *`
    case 'weekdays':
      return `${plan.minute} ${plan.hour} * * 1-5`
    case 'weekly':
      return plan.days.length ? `${plan.minute} ${plan.hour} * * ${WEEK.filter((day) => plan.days.includes(day)).join(',')}` : null
    case 'monthly':
      return `${plan.minute} ${plan.hour} ${plan.day} * *`
    case 'hourly':
      return `${plan.minute} ${plan.every === 1 ? '*' : `*/${plan.every}`} * * *`
    case 'minutes':
      return plan.every === 1 ? '* * * * *' : `*/${plan.every} * * * *`
    case 'custom':
      return plan.expression
  }
}

/** Switches the kind, carrying the time of day and the previous expression over. */
export function convert(plan: Plan, kind: Kind, expression: string): Plan {
  const hour = 'hour' in plan ? plan.hour : 9
  const minute = 'minute' in plan ? plan.minute : 0
  switch (kind) {
    case 'daily':
    case 'weekdays':
      return { kind, hour, minute }
    case 'weekly':
      return { kind, days: plan.kind === 'weekly' ? plan.days : [1, 2, 3, 4, 5], hour, minute }
    case 'monthly':
      return { kind, day: plan.kind === 'monthly' ? plan.day : 1, hour, minute }
    case 'hourly':
      return { kind, every: plan.kind === 'hourly' ? plan.every : 1, minute }
    case 'minutes':
      return { kind, every: plan.kind === 'minutes' ? plan.every : 15 }
    case 'custom':
      return { kind, expression }
  }
}

export function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const hour = integer(match[1], 0, 23),
    minute = integer(match[2], 0, 59)
  return hour === null || minute === null ? null : { hour, minute }
}

let describers: Promise<(expression: string, locale: string) => string> | undefined
/** A sentence for the expression in the UI language, or an empty string when cronstrue cannot read it. */
export function describe(expression: string, locale: string) {
  // The core bundle carries English; other UI languages register their locale.
  describers ??= Promise.all([import('cronstrue'), import('cronstrue/locales/ru')]).then(
    ([{ default: cronstrue }]) =>
      (value: string, lang: string) => {
        try {
          return cronstrue.toString(value, { locale: lang, use24HourTimeFormat: true, throwExceptionOnParseError: true })
        } catch {
          return ''
        }
      },
  )
  return describers.then((describer) => describer(expression, locale))
}
