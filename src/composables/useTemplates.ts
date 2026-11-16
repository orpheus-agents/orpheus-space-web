import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { get } from '../api/client'
import type { Template } from '../api/generated'
import { useResource } from './useResource'
import { useCatalogOptions } from './useCatalogOptions'

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

/** Available templates, searched and paginated by the server. */
export function useTemplateOptions() {
  return useCatalogOptions((signal, name_contains, cursor) => get('/api/v1/templates', { signal, query: { active: true, name_contains: name_contains || undefined, cursor } }))
}
