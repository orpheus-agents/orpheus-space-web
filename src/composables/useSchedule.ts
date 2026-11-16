import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, get, write, isScheduleForbidden } from '../api/client'
import { Status } from '../api/generated'
import { useResource } from './useResource'
import { useAction } from './useAction'
import { useResumeError } from './useResumeError'
import { useAuthSession, useRefreshAuth } from './useAuth'
import { useToasts } from './useToasts'
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
  const session = useAuthSession()
  const { t } = useI18n()
  const { push } = useToasts()
  let runKey: string | undefined
  watch([id, () => session.value?.mode, () => session.value?.user?.subject, () => session.value?.user?.email], () => {
    runKey = undefined
  }, { flush: 'sync' })
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
  async function runNow() {
    if (!resource.data.value?.can_edit || resource.data.value.id !== id.value) return
    await action.run(async (signal) => {
      const key = runKey ??= crypto.randomUUID()
      await write('post', '/api/v1/schedules/{id}/run', { signal, path: { id: id.value }, idempotencyKey: key })
      if (runKey === key) runKey = undefined
      push(t('schedule.runAccepted'))
    }, { onError: async (error) => {
      if (error instanceof ApiError && error.problem?.code === 'schedule_busy') return t('schedule.runBusy')
      if (!(error instanceof ApiError) || error.status >= 500) return t('schedule.runUncertain')
      return onError(error)
    } })
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
  return { ...resource, id, toggle, runNow, busy: action.busy, confirm, execute }
}
