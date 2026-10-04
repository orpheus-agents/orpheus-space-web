import { useI18n } from 'vue-i18n'
import { ApiError } from '../api/client'

/** Explain catalog validation failures when resuming from a card or the list. */
export function useResumeError() {
  const { t } = useI18n()
  return (error: unknown): string | undefined => {
    if (!(error instanceof ApiError)) return
    if (error.status === 503 && error.problem?.code === 'core_unavailable') return t('services.resumeOffline')
    if (error.status === 422 && error.problem?.details?.some((detail) => detail.path[0] === 'body' && detail.path[1] === 'services')) return t('services.resumeInvalid')
  }
}
