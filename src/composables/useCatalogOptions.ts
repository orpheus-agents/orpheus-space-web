import { onMounted, onUnmounted, ref, shallowRef } from 'vue'

const SEARCH_DELAY = 250

/** Search a remote catalog and append pages without mixing different queries. */
export function useCatalogOptions<T>(request: (signal: AbortSignal, query: string, cursor?: string) => Promise<{ items: T[]; next_cursor: string | null }>) {
  const items = shallowRef<T[]>([])
  const next = ref<string | null>(null)
  const loaded = ref(false)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = shallowRef<unknown>(null)
  const moreError = shallowRef<unknown>(null)
  let query = ''
  let controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined


  /** Drops the accumulated pages and cancels every request made for them. */
  function reset() {
    clearTimeout(timer)
    controller.abort()
    controller = new AbortController()
    items.value = []
    next.value = null
    loaded.value = false
    loadingMore.value = false
    error.value = null
    moreError.value = null
    pending.value = true
  }
  /** Restarts from the first page of the current search. */
  async function reload() {
    reset()
    const { signal } = controller
    try {
      const page = await request(signal, query)
      if (signal.aborted) return
      items.value = page.items
      next.value = page.next_cursor
      loaded.value = true
    } catch (cause) {
      if (!signal.aborted) error.value = cause
    } finally {
      if (!signal.aborted) pending.value = false
    }
  }
  /** Appends the next page. One page loads at a time; a failure keeps the cursor for another attempt. */
  async function more() {
    if (!next.value || loadingMore.value || pending.value) return
    const { signal } = controller
    loadingMore.value = true
    moreError.value = null
    try {
      const page = await request(signal, query, next.value)
      if (signal.aborted) return
      items.value = [...items.value, ...page.items]
      next.value = page.next_cursor
    } catch (cause) {
      if (!signal.aborted) moreError.value = cause
    } finally {
      if (!signal.aborted) loadingMore.value = false
    }
  }
  function search(value: string) {
    const trimmed = value.trim()
    if (trimmed === query) return
    query = trimmed
    reset()
    timer = setTimeout(() => void reload(), SEARCH_DELAY)
  }
  onMounted(reload)
  onUnmounted(() => {
    clearTimeout(timer)
    controller.abort()
  })
  return { items, next, loaded, pending, loadingMore, error, moreError, reload, more, search }
}
