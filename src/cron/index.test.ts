import { describe, expect, it } from 'vitest'
import { build, convert, describe as describeCron, formatTime, parse, parseTime, type Plan } from './index'

describe('cron plans', () => {
  const cases: [string, Plan][] = [
    ['0 9 * * *', { kind: 'daily', hour: 9, minute: 0 }],
    ['30 18 * * 1-5', { kind: 'weekdays', hour: 18, minute: 30 }],
    ['0 9 * * 1,3,5', { kind: 'weekly', days: [1, 3, 5], hour: 9, minute: 0 }],
    ['15 7 * * 0', { kind: 'weekly', days: [0], hour: 7, minute: 15 }],
    ['30 3 1 * *', { kind: 'monthly', day: 1, hour: 3, minute: 30 }],
    ['0 23 31 * *', { kind: 'monthly', day: 31, hour: 23, minute: 0 }],
    ['5 * * * *', { kind: 'hourly', every: 1, minute: 5 }],
    ['0 */2 * * *', { kind: 'hourly', every: 2, minute: 0 }],
    ['* * * * *', { kind: 'minutes', every: 1 }],
    ['*/15 * * * *', { kind: 'minutes', every: 15 }],
  ]
  it.each(cases)('parses and rebuilds %s', (expression, plan) => {
    expect(parse(expression)).toEqual(plan)
    expect(build(plan)).toBe(expression)
  })
  it('sorts weekdays Monday first when building', () => {
    expect(build({ kind: 'weekly', days: [0, 5, 1], hour: 9, minute: 0 })).toBe('0 9 * * 1,5,0')
    expect(parse('0 9 * * 5,1,0')).toEqual({ kind: 'weekly', days: [1, 5, 0], hour: 9, minute: 0 })
  })
  it('keeps unknown or invalid expressions custom without throwing', () => {
    for (const expression of ['0 9 * *', '0 9 1 1 *', '0 9 * * 7', '0 9 * * mon', '60 9 * * *', '0 25 * * *', '*/0 * * * *', '*/7 * * * *', '0 */5 * * *', '0 9 L * *', '0 9 * * 1,1', '', 'a b c d e']) {
      expect(parse(expression)).toEqual({ kind: 'custom', expression })
      expect(build({ kind: 'custom', expression })).toBe(expression)
    }
  })
  it('refuses to build a week without days', () => {
    expect(build({ kind: 'weekly', days: [], hour: 9, minute: 0 })).toBeNull()
  })
  it('carries the time over when switching kinds', () => {
    const weekdays = convert({ kind: 'daily', hour: 7, minute: 45 }, 'weekdays', '')
    expect(weekdays).toEqual({ kind: 'weekdays', hour: 7, minute: 45 })
    expect(convert(weekdays, 'weekly', '')).toEqual({ kind: 'weekly', days: [1, 2, 3, 4, 5], hour: 7, minute: 45 })
    expect(convert(weekdays, 'monthly', '')).toEqual({ kind: 'monthly', day: 1, hour: 7, minute: 45 })
    expect(convert(weekdays, 'hourly', '')).toEqual({ kind: 'hourly', every: 1, minute: 45 })
    expect(convert(weekdays, 'minutes', '')).toEqual({ kind: 'minutes', every: 15 })
    expect(convert(weekdays, 'custom', '45 7 * * 1-5')).toEqual({ kind: 'custom', expression: '45 7 * * 1-5' })
    expect(convert({ kind: 'minutes', every: 5 }, 'daily', '')).toEqual({ kind: 'daily', hour: 9, minute: 0 })
  })
  it('formats and parses times', () => {
    expect(formatTime(7, 5)).toBe('07:05')
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 })
    expect(parseTime('23:59:30')).toEqual({ hour: 23, minute: 59 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('')).toBeNull()
  })
  it('describes expressions in both languages and stays silent on bad input', async () => {
    expect(await describeCron('0 9 * * 1-5', 'ru')).toBe('В 09:00, с понедельника по пятницу')
    expect(await describeCron('0 9 * * 1-5', 'en')).toBe('At 09:00, Monday through Friday')
    expect(await describeCron('*/15 * * * *', 'en')).toBe('Every 15 minutes')
    expect(await describeCron('0 9 * *', 'en')).toBe('')
  })
})
