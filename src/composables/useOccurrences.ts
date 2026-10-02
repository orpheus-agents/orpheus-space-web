import { computed, onUnmounted, ref, shallowRef, watch, type Ref } from 'vue'
import { ApiError, get } from '../api/client'
import type { OccurrenceResult } from '../api/generated'
import { useResource } from './useResource'
export function useOccurrences(id: Ref<string>) {
  const cursor = ref<string | undefined>()
  const selected = ref<string | null>(null)
  const history = useResource(
    (signal) => get('/api/v1/schedules/{id}/occurrences', { signal, path: { id: id.value }, query: { cursor: cursor.value, limit: 20 } }),
    () => `${id.value}:${cursor.value ?? ''}`,
  )
  const card = useResource(
    (signal) =>
      get('/api/v1/schedules/{id}/occurrences/{occurrence_id}', { signal, path: { id: id.value, occurrence_id: selected.value! } }),
    () => (selected.value ? `${id.value}:${selected.value}` : null),
  )
  const result = shallowRef<OccurrenceResult | null>(null),
    resultError = shallowRef<unknown>(null),
    resultPending = ref(false)
  let controller: AbortController | undefined
  function clearResult() {
    controller?.abort()
    result.value = null
    resultError.value = null
    resultPending.value = false
  }
  watch(selected, clearResult)
  watch(id, () => {
    cursor.value = undefined
    selected.value = null
    clearResult()
  })
  onUnmounted(() => controller?.abort())
  // The result block owns its loading and error state; the card and history stay usable throughout.
  async function loadResult() {
    if (!selected.value) return
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    resultPending.value = true
    resultError.value = null
    try {
      const data = await get('/api/v1/schedules/{id}/occurrences/{occurrence_id}/result', {
        signal,
        path: { id: id.value, occurrence_id: selected.value! },
      })
      if (!signal.aborted) result.value = data
    } catch (error) {
      if (!signal.aborted) resultError.value = error
    } finally {
      if (!signal.aborted) resultPending.value = false
    }
  }
  /** The message for a failed result request, by the API's problem code. */
  const resultProblem = computed(() => {
    const error = resultError.value
    if (error === null) return null
    const code = error instanceof ApiError ? error.problem?.code : undefined
    return code === 'core_unavailable' ? 'history.resultUnavailable' : code === 'run_result_not_found' ? 'history.resultGone' : code === 'run_not_started' ? 'history.resultNotStarted' : 'history.resultError'
  })
  return {
    history,
    card,
    cursor,
    selected,
    result,
    resultError,
    resultProblem,
    resultPending,
    loadResult,
    active: computed(() => card.data.value?.run_id != null),
  }
}
