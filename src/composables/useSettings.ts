import { computed, readonly, ref, watchEffect } from 'vue'

export type Theme = 'system' | 'light' | 'dark'
export const THEMES: readonly Theme[] = ['system', 'light', 'dark']
const THEME_KEY = 'orpheus_theme'
const TIMEZONE_KEY = 'orpheus_timezone'
const FALLBACK_TIME_ZONE = 'UTC'

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function browserTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return zone && isTimeZone(zone) ? zone : FALLBACK_TIME_ZONE
}

function storedTimeZone(): string {
  const stored = storage()?.getItem(TIMEZONE_KEY)
  return stored && isTimeZone(stored) ? stored : browserTimeZone()
}

function storedTheme(): Theme {
  const stored = storage()?.getItem(THEME_KEY)
  return THEMES.find((theme) => theme === stored) ?? 'system'
}

// Shared across the app: one time zone and one theme, kept in localStorage.
const timeZone = ref(storedTimeZone())
const theme = ref<Theme>(storedTheme())
const media =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const systemDark = ref(media?.matches ?? false)
media?.addEventListener('change', (event) => {
  systemDark.value = event.matches
})
const resolvedTheme = computed<'light' | 'dark'>(() => (theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value))
if (typeof document !== 'undefined') {
  // index.html sets the same attribute before the first paint; this keeps it in sync afterwards.
  watchEffect(
    () => {
      document.documentElement.dataset.theme = resolvedTheme.value
    },
    { flush: 'sync' },
  )
}

/** IANA zones for the picker: UTC first, then the browser's and the current zone, then everything else. */
export function timeZones(): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf?.('timeZone') ?? []
  return [...new Set([FALLBACK_TIME_ZONE, browserTimeZone(), timeZone.value, ...supported])]
    .filter(isTimeZone)
    .sort((a, b) => (a === FALLBACK_TIME_ZONE ? -1 : b === FALLBACK_TIME_ZONE ? 1 : a.localeCompare(b)))
}

export function formatOffset(zone: string, timestamp = Date.now()): string {
  const part = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(timestamp)
    .find(({ type }) => type === 'timeZoneName')?.value
  return part?.replace('GMT', 'UTC').replace('UTC+00:00', 'UTC') ?? zone
}

export function useSettings() {
  return {
    timeZone: readonly(timeZone),
    setTimeZone(value: string) {
      if (!isTimeZone(value)) throw new RangeError(`Unsupported time zone: ${value}`)
      timeZone.value = value
      storage()?.setItem(TIMEZONE_KEY, value)
    },
    theme: readonly(theme),
    resolvedTheme,
    setTheme(value: Theme) {
      theme.value = value
      storage()?.setItem(THEME_KEY, value)
    },
  }
}
