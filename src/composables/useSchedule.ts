import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get, write } from '../api/client'
import { Status } from '../api/generated'
import { useResource } from './useResource'
import { useAction } from './useAction'
export function useSchedule() {
  const route = useRoute(),
    router = useRouter()
  const id = computed(() => String(route.params.id))
  const resource = useResource(
    (signal) => get('/api/v1/schedules/{id}', { signal, path: { id: id.value } }),
    () => (route.name === 'schedule' ? id.value : null),
  )
  const action = useAction()
  const confirm = ref<'delete' | 'reset' | null>(null)
  async function toggle() {
    await action.run(async (signal) => {
      await write('patch', '/api/v1/schedules/{id}', {
        signal,
        path: { id: id.value },
        body: { status: resource.data.value?.status === Status.active ? Status.paused : Status.active },
      })
      await resource.refresh()
    })
  }
  async function execute() {
    await action.run(async (signal) => {
      if (confirm.value === 'delete') {
        await write('delete', '/api/v1/schedules/{id}', { signal, path: { id: id.value } })
        await router.push('/schedules')
      } else {
        await write('post', '/api/v1/schedules/{id}/reset-session', { signal, path: { id: id.value } })
        await resource.refresh()
      }
      confirm.value = null
    })
  }
  return { ...resource, id, toggle, busy: action.busy, confirm, execute }
}
