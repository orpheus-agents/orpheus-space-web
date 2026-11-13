import { computed } from 'vue'
import { get } from '../api/client'
import { useResource } from './useResource'

export function useCatalogs() {
  const profiles = useResource((signal) => get('/api/v1/profiles', { signal }), () => 'profiles', { interval: 30_000 })
  const services = useResource((signal) => get('/api/v1/services', { signal }), () => 'services', { interval: 30_000 })
  return {
    profiles, services,
    disconnected: computed(() => profiles.disconnected.value || services.disconnected.value),
    pending: computed(() => profiles.pending.value || services.pending.value),
    refresh: () => Promise.all([profiles.refresh(), services.refresh()]),
  }
}
