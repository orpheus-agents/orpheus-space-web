import { computed, ref, watch, type Ref } from 'vue'
import { ApiError, get } from '../api/client'
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
  const active = computed(() => selected.value !== null && card.data.value?.id === selected.value && card.data.value.run_id !== null)
  const resultResource = useResource(
    (signal) => get('/api/v1/schedules/{id}/occurrences/{occurrence_id}/result', {
      signal, path: { id: id.value, occurrence_id: selected.value! },
    }),
    () => active.value ? `${id.value}:${selected.value}` : null,
  )
  watch(id, () => {
    cursor.value = undefined
    selected.value = null
  }, { flush: 'sync' })
  async function refresh() {
    await Promise.all([card.refresh(), resultResource.refresh()])
  }
  /** The message for a failed result request, by the API's problem code. */
  const resultProblem = computed(() => {
    const error = resultResource.error.value
    if (error === null) return null
    const code = error instanceof ApiError ? error.problem?.code : undefined
    return code === 'core_unavailable' ? 'history.resultUnavailable' : code === 'run_result_not_found' ? 'history.resultGone' : code === 'run_not_started' ? 'history.resultNotStarted' : 'history.resultError'
  })
  return {
    history,
    card,
    cursor,
    selected,
    result: resultResource.data,
    resultError: resultResource.error,
    resultProblem,
    resultPending: resultResource.pending,
    refresh,
    active,
  }
}
