import { createI18n } from 'vue-i18n'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'
import { ruPluralRule } from '../i18n'

export function createTestI18n(locale: 'en' | 'ru' = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, ru },
    pluralRules: {
      ru: ruPluralRule,
    },
  })
}
