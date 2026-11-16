import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { get } from '../api/client'
import type { Profile } from '../api/generated'
import { useResource } from './useResource'
import { useCatalogOptions } from './useCatalogOptions'

/** What is known about a stored profile reference. A failed or pending check is never reported as missing. */
export type ProfileState = 'empty' | 'loading' | 'unavailable' | 'active' | 'inactive' | 'accountInactive' | 'missing'

/** Resolves one reference by its exact stored name, active or not, independently of any page of options. */
export function useProfile(name: MaybeRefOrGetter<string>) {
  const resource = useResource(
    (signal) => get('/api/v1/profiles', { signal, query: { name: toValue(name) } }),
    () => toValue(name) || null,
    { interval: 30_000 },
  )
  const profile = computed<Profile | null>(() => (toValue(name) ? (resource.data.value?.items[0] ?? null) : null))
  const state = computed<ProfileState>(() => {
    if (!toValue(name)) return 'empty'
    if (resource.data.value) return !profile.value ? 'missing' : !profile.value.active ? 'inactive' : !profile.value.account_active ? 'accountInactive' : 'active'
    return resource.error.value ? 'unavailable' : 'loading'
  })
  return {
    profile,
    state,
    disconnected: computed(() => !!toValue(name) && resource.disconnected.value),
    pending: computed(() => !!toValue(name) && resource.pending.value),
    refresh: resource.refresh,
  }
}

/** Available profiles, searched and paginated by the server. */
export function useProfileOptions() {
  return useCatalogOptions((signal, name_contains, cursor) => get('/api/v1/profiles', { signal, query: { available: true, name_contains: name_contains || undefined, cursor } }))
}
