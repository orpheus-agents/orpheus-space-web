import { onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, isScheduleForbidden } from '../api/client'
import { useToasts } from './useToasts'

type Options = {
  /** Toast key for failures other than conflicts; loads and saves read differently. */
  failure?: string
  /** Returns the toast for an error it handled itself, or nothing to fall back to the defaults. */
  onError?: (error: unknown) => string | undefined | Promise<string | undefined>
}

export function useAction() {
  const busy = ref(false)
  const controller = new AbortController()
  const { t } = useI18n()
  const { push } = useToasts()
  onUnmounted(() => controller.abort())
  async function run<T>(action: (signal: AbortSignal) => Promise<T>, options: Options = {}): Promise<T | undefined> {
    if (busy.value) return
    busy.value = true
    const timer = setTimeout(() => push(t('common.working')), 1500)
    try {
      return await action(controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) {
        const conflict = error instanceof ApiError && error.status === 409
        const message = await options.onError?.(error)
        // An error handler may navigate away and unmount this composable before the toast.
        push(message ?? (isScheduleForbidden(error) ? t('schedule.forbidden') : conflict ? t('common.conflict') : t(options.failure ?? 'common.requestFailed')))
      }
    } finally {
      clearTimeout(timer)
      busy.value = false
    }
  }
  return { busy, run }
}
