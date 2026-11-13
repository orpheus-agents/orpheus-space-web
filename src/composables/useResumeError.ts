import { useI18n } from 'vue-i18n'
import { ApiError } from '../api/client'

/** Explain catalog validation failures when resuming from a card or the list. */
export function useResumeError() {
  const { t } = useI18n()
  return (error: unknown): string | undefined => {
    if (!(error instanceof ApiError)) return
    if (error.status === 503 && error.problem?.code === 'core_unavailable') return t('catalog.resumeOffline')
    if (error.status !== 422) return
    const fields = new Set((error.problem?.details ?? []).filter((detail) => detail.path[0] === 'body').map((detail) => detail.path[1]))
    if (fields.has('template')) return t('template.resumeInvalid')
    if (fields.has('services')) return t('services.resumeInvalid')
  }
}
