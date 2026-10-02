import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ru from './locales/ru.json'

const LOCALE_KEY = 'orpheus_locale'
const browserLang = typeof navigator === 'undefined' ? '' : navigator.language.split('-')[0]
const savedLang = typeof window === 'undefined' ? null : window.localStorage.getItem(LOCALE_KEY)
const defaultLocale: 'en' | 'ru' = savedLang === 'ru' || (!savedLang && browserLang === 'ru') ? 'ru' : 'en'

export function ruPluralRule(choice: number, choicesLength: number): number {
  if (choicesLength !== 3) {
    return choice === 1 ? 0 : Math.min(1, choicesLength - 1)
  }
  const abs = Math.abs(choice)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: { en, ru },
  pluralRules: {
    ru: ruPluralRule,
  },
})
