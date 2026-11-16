import { computed } from 'vue'
import { get } from '../api/client'
import { useResource } from './useResource'

export function useCatalogs() {
  const services = useResource((signal) => get('/api/v1/services', { signal }), () => 'services', { interval: 30_000 })
  return {
    services,
    disconnected: computed(() => services.disconnected.value),
    pending: computed(() => services.pending.value),
    refresh: () => services.refresh(),
  }
}
