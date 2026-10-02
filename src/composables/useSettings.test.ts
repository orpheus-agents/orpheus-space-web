import { describe, expect, it } from 'vitest'
import { formatOffset, isTimeZone, timeZones, useSettings } from './useSettings'

describe('useSettings', () => {
  it('keeps a valid time zone and rejects an unknown one', () => {
    const settings = useSettings()
    settings.setTimeZone('Asia/Tokyo')
    expect(settings.timeZone.value).toBe('Asia/Tokyo')
    expect(localStorage.getItem('orpheus_timezone')).toBe('Asia/Tokyo')
    expect(() => settings.setTimeZone('Mars/Olympus')).toThrow(RangeError)
    expect(settings.timeZone.value).toBe('Asia/Tokyo')
    expect(isTimeZone('Europe/Moscow')).toBe(true)
    expect(isTimeZone('nowhere')).toBe(false)
  })
  it('lists UTC first and includes the current zone', () => {
    useSettings().setTimeZone('Europe/Moscow')
    const zones = timeZones()
    expect(zones[0]).toBe('UTC')
    expect(zones).toContain('Europe/Moscow')
    expect(new Set(zones).size).toBe(zones.length)
  })
  it('formats offsets as UTC±hh:mm', () => {
    expect(formatOffset('Asia/Tokyo', Date.UTC(2026, 0, 1))).toBe('UTC+09:00')
    expect(formatOffset('UTC', Date.UTC(2026, 0, 1))).toBe('UTC')
  })
  it('applies the resolved theme to the document and remembers the choice', () => {
    const settings = useSettings()
    settings.setTheme('dark')
    expect(settings.resolvedTheme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('orpheus_theme')).toBe('dark')
    settings.setTheme('system') // jsdom has no matchMedia, so the system theme resolves to light
    expect(settings.resolvedTheme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
