import { computed, ref, shallowRef, toValue, watch, type WatchSource } from 'vue'
import { usePolling } from './usePolling'

type Options<K> = {
  interval?: number
  /** Keep the last result on screen while the next key loads instead of showing a loader. */
  keep?: (next: NonNullable<K>, previous: NonNullable<K>) => boolean
}

/** A null key suspends requests while inputs are unavailable or the route is leaving. */
export function useResource<T, K extends string | null>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: WatchSource<K>,
  { interval = 5000, keep }: Options<K> = {},
) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<unknown>(null)
  const pending = ref(true)
  const updatedAt = ref<string | null>(null)
  const stale = ref(false) // data belongs to the previous key while the next one loads
  const polling = usePolling(async (signal) => {
    if (toValue(key) === null) return
    pending.value = true
    try {
      const result = await fetcher(signal)
      if (signal.aborted) return
      data.value = result
      error.value = null
      stale.value = false
      updatedAt.value = new Date().toISOString()
    } catch (cause) {
      if (!signal.aborted) {
        error.value = cause
        if (stale.value) {
          // The kept result must not pass for the new selection: show the error instead.
          data.value = null
          updatedAt.value = null
          stale.value = false
        }
      }
      throw cause
    } finally {
      if (!signal.aborted) pending.value = false
    }
  }, interval)
  watch(
    key,
    (value, previous) => {
      if (value === null) {
        polling.cancel()
        return
      }
      stale.value = previous != null && data.value !== null && !!keep?.(value, previous)
      if (!stale.value) {
        data.value = null
        updatedAt.value = null
      }
      error.value = null
      pending.value = true
      void polling.refresh()
    },
    { flush: 'sync' },
  )
  return {
    data,
    error,
    pending,
    updatedAt,
    stale,
    disconnected: computed(() => error.value !== null),
    refresh: polling.refresh,
  }
}
