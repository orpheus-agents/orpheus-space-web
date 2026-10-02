import { createI18n } from 'vue-i18n'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from './locales/en.json'
import ru from './locales/ru.json'
import { ruPluralRule } from './index'
import { OccurrenceState, SessionMode, Status } from '../api/generated'
import { ERROR_CODES, RUN_STATUSES } from '../occurrence/outcome'
import { KINDS } from '../cron'

const SRC_DIR = resolve(__dirname, '..')

type AnyMessage = string | { [key: string]: AnyMessage }

function collectKeys(obj: AnyMessage, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix]
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    keys.push(...collectKeys(v, full))
  }
  return keys
}

function collectKeyValues(obj: AnyMessage, prefix = ''): Array<{ key: string; value: string }> {
  if (typeof obj === 'string') return prefix ? [{ key: prefix, value: obj }] : []
  const entries: Array<{ key: string; value: string }> = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    entries.push(...collectKeyValues(v, full))
  }
  return entries
}

const T_CALL_RE = /(?:\$t|\bt)\(\s*['"`]([\w.]+)['"`]/g

function collectUsedKeys(dir: string): Set<string> {
  const keys = new Set<string>()

  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'generated' && entry.name !== 'locales') {
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (!/\.(vue|ts)$/.test(entry.name)) continue
      if (entry.name === 'i18n.test.ts') continue
      const src = readFileSync(full, 'utf8')
      for (const m of src.matchAll(T_CALL_RE)) {
        keys.add(m[1])
      }
    }
  }

  walk(dir)
  return keys
}

describe('i18n completeness', () => {
  const enKeys = new Set(collectKeys(en))
  const ruKeys = new Set(collectKeys(ru))

  it('all en keys exist in ru', () => {
    const missing = [...enKeys].filter((k) => !ruKeys.has(k))
    expect(missing, `Keys in en but missing in ru: ${missing.join(', ')}`).toHaveLength(0)
  })

  it('all ru keys exist in en', () => {
    const missing = [...ruKeys].filter((k) => !enKeys.has(k))
    expect(missing, `Keys in ru but missing in en: ${missing.join(', ')}`).toHaveLength(0)
  })
})

describe('i18n @ escape', () => {
  it('messages containing @ compile to literal @ in both locales', () => {
    const enAt = collectKeyValues(en).filter(({ value }) => value.includes('@'))
    const ruAt = collectKeyValues(ru).filter(({ value }) => value.includes('@'))
    for (const locale of ['en', 'ru'] as const) {
      const i18n = createI18n({ legacy: false, locale, messages: { en, ru } })
      const list = locale === 'en' ? enAt : ruAt
      for (const { key } of list) {
        expect(i18n.global.t(key), `${locale}:${key}`).toContain('@')
      }
    }
  })
})

describe('i18n key coverage', () => {
  const enKeys = new Set(collectKeys(en))
  const usedKeys = collectUsedKeys(SRC_DIR)

  it('all keys referenced from source code exist in en.json', () => {
    const missing = [...usedKeys].filter((k) => !enKeys.has(k))
    expect(missing, `Keys used in source but missing in en.json: ${missing.join(', ')}`).toHaveLength(0)
  })
})

describe('i18n dictionary coverage', () => {
  // Templates build these keys from API values, so the static scan above cannot see them.
  const enKeys = new Set(collectKeys(en))
  const groups: [string, readonly string[]][] = [
    ['status', Object.values(Status)],
    ['sessionMode', Object.values(SessionMode)],
    ['occurrence', Object.values(OccurrenceState)],
    ['runStatus', RUN_STATUSES],
    ['errorCode', ERROR_CODES],
    ['cron.kind', KINDS],
  ]
  for (const [prefix, values] of groups) {
    it(`translates every ${prefix} value and nothing else`, () => {
      const expected = values.map((value) => `${prefix}.${value}`)
      const missing = expected.filter((key) => !enKeys.has(key))
      expect(missing, `Missing: ${missing.join(', ')}`).toHaveLength(0)
      const extra = [...enKeys].filter((key) => key.startsWith(`${prefix}.`) && !expected.includes(key))
      expect(extra, `Stale: ${extra.join(', ')}`).toHaveLength(0)
    })
  }
})

describe('russian pluralization', () => {
  it('ruPluralRule returns correct index for sample numbers', () => {
    expect(ruPluralRule(1, 3)).toBe(0)
    expect(ruPluralRule(2, 3)).toBe(1)
    expect(ruPluralRule(5, 3)).toBe(2)
    expect(ruPluralRule(21, 3)).toBe(0)
    expect(ruPluralRule(11, 3)).toBe(2)
  })
})

describe('no hardcoded user-visible strings in components', () => {
  const HUMAN_ATTRS = ['title', 'placeholder', 'aria-label', 'aria-description', 'alt']
  // Files that are pure SVG/icon hosts or generated, or where alt="" is intentional.
  const ALLOWLIST_PATHS = new Set<string>([])
  // Stable, non-translatable literal substrings that are OK inside templates.
  // These usually look like punctuation, separators, or brand-neutral abbreviations.
  const ALLOWED_TEXT_RE = /^(?:[\s\d\W_]+|i)$/

  function scanTemplateText(src: string): string[] {
    const tplMatch = src.match(/<template>([\s\S]*?)<\/template>/m)
    if (!tplMatch) return []
    const stripped = tplMatch[1].replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    const found: string[] = []
    for (const m of stripped.matchAll(/>([^<>]+)</g)) {
      const text = m[1].trim()
      if (!text) continue
      if (!/[A-Za-zА-Яа-я]/.test(text)) continue
      if (ALLOWED_TEXT_RE.test(text)) continue
      found.push(text)
    }
    return found
  }

  function scanTemplateAttrs(src: string): string[] {
    const tplMatch = src.match(/<template>([\s\S]*?)<\/template>/m)
    if (!tplMatch) return []
    const found: string[] = []
    const tpl = tplMatch[1].replace(/<!--[\s\S]*?-->/g, ' ')
    for (const attr of HUMAN_ATTRS) {
      const re = new RegExp(`(?<![\\w:@])${attr}\\s*=\\s*"([^"]*)"`, 'g')
      for (const m of tpl.matchAll(re)) {
        const value = m[1].trim()
        if (!value) continue
        if (!/[A-Za-zА-Яа-я]/.test(value)) continue
        found.push(`${attr}="${value}"`)
      }
    }
    return found
  }

  function walkVueFiles(dir: string, into: string[]) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'locales') {
        walkVueFiles(full, into)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.vue')) {
        into.push(full)
      }
    }
  }

  const files: string[] = []
  walkVueFiles(SRC_DIR, files)

  for (const file of files) {
    if (ALLOWLIST_PATHS.has(file)) continue
    it(`${file.slice(SRC_DIR.length + 1)} has no hardcoded strings`, () => {
      const src = readFileSync(file, 'utf8')
      const textHits = scanTemplateText(src)
      const attrHits = scanTemplateAttrs(src)
      const all = [...textHits, ...attrHits]
      expect(all, `Hardcoded literals found in ${file}: ${all.join(' | ')}`).toHaveLength(0)
    })
  }
})
