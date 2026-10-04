import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get, write, isScheduleForbidden } from '../api/client'
import { Status } from '../api/generated'
import { useResource } from './useResource'
import { useAction } from './useAction'
import { useResumeError } from './useResumeError'
import { useRefreshAuth } from './useAuth'
export function useSchedule() {
  const route = useRoute(),
    router = useRouter()
  const id = computed(() => String(route.params.id))
  const resource = useResource(
    (signal) => get('/api/v1/schedules/{id}', { signal, path: { id: id.value } }),
    () => (route.name === 'schedule' ? id.value : null),
  )
  const action = useAction()
  const resumeError = useResumeError()
  const refreshAuth = useRefreshAuth()
  const confirm = ref<'delete' | 'reset' | null>(null)
  watch(() => resource.data.value?.can_edit, (canEdit) => { if (!canEdit) confirm.value = null })
  async function onError(error: unknown) {
    if (isScheduleForbidden(error)) {
      confirm.value = null
      await Promise.all([resource.refresh(), refreshAuth()])
    }
    return resumeError(error)
  }
  async function toggle() {
    if (!resource.data.value?.can_edit) return
    await action.run(async (signal) => {
      await write('patch', '/api/v1/schedules/{id}', {
        signal,
        path: { id: id.value },
        body: { status: resource.data.value?.status === Status.active ? Status.paused : Status.active },
      })
      await resource.refresh()
    }, { onError })
  }
  async function execute() {
    if (!resource.data.value?.can_edit || !confirm.value) return
    await action.run(async (signal) => {
      if (confirm.value === 'delete') {
        await write('delete', '/api/v1/schedules/{id}', { signal, path: { id: id.value } })
        await router.push('/schedules')
      } else {
        await write('post', '/api/v1/schedules/{id}/reset-session', { signal, path: { id: id.value } })
        await resource.refresh()
      }
      confirm.value = null
    }, { onError })
  }
  return { ...resource, id, toggle, busy: action.busy, confirm, execute }
}
