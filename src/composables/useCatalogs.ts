import { computed } from 'vue'
import { get } from '../api/client'
import { useResource } from './useResource'

export function useCatalogs() {
  const profiles = useResource((signal) => get('/api/v1/schedules/profiles', { signal }), () => 'profiles', { interval: 30_000 })
  const templates = useResource((signal) => get('/api/v1/schedules/templates', { signal }), () => 'templates', { interval: 30_000 })
  return {
    profiles, templates,
    disconnected: computed(() => profiles.disconnected.value || templates.disconnected.value),
    pending: computed(() => profiles.pending.value || templates.pending.value),
    refresh: () => Promise.all([profiles.refresh(), templates.refresh()]),
  }
}
