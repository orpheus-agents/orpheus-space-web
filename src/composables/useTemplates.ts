import { computed, onMounted, onUnmounted, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { get } from '../api/client'
import type { Template } from '../api/generated'
import { useResource } from './useResource'

/** What is known about a stored template reference. A failed or pending check is never reported as missing. */
export type TemplateState = 'empty' | 'loading' | 'unavailable' | 'active' | 'inactive' | 'missing'

/** Resolves one reference by its exact stored name, active or not, independently of any page of options. */
export function useTemplate(name: MaybeRefOrGetter<string>) {
  const resource = useResource(
    (signal) => get('/api/v1/templates', { signal, query: { name: toValue(name) } }),
    () => toValue(name) || null,
    { interval: 30_000 },
  )
  const template = computed<Template | null>(() => (toValue(name) ? (resource.data.value?.items[0] ?? null) : null))
  const state = computed<TemplateState>(() => {
    if (!toValue(name)) return 'empty'
    if (resource.data.value) return !template.value ? 'missing' : template.value.active ? 'active' : 'inactive'
    return resource.error.value ? 'unavailable' : 'loading'
  })
  return {
    template,
    state,
    disconnected: computed(() => !!toValue(name) && resource.disconnected.value),
    pending: computed(() => !!toValue(name) && resource.pending.value),
    refresh: resource.refresh,
  }
}

const SEARCH_DELAY = 250

/** Active templates matching a server-side search, one page at a time. */
export function useTemplateOptions() {
  const items = shallowRef<Template[]>([])
  const next = ref<string | null>(null)
  const loaded = ref(false)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = shallowRef<unknown>(null)
  const moreError = shallowRef<unknown>(null)
  let query = ''
  let controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const request = (signal: AbortSignal, cursor?: string) =>
    get('/api/v1/templates', { signal, query: { active: true, name_contains: query || undefined, cursor } })

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
      const page = await request(signal)
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
      const page = await request(signal, next.value)
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
