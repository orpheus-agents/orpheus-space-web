import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, get, write } from '../api/client'
import { SessionMode, Status, type CreateSchedule, type Settings } from '../api/generated'
import { useSettings } from './useSettings'
import { useAction } from './useAction'
import { useToasts } from './useToasts'
import { useAuthSession } from './useAuth'

const FIELDS = ['name', 'prompt', 'cron', 'timezone', 'status', 'model', 'owner_email', 'session_mode', 'env_from'] as const
export type Field = (typeof FIELDS)[number]

export function useScheduleEditor() {
  const route = useRoute(),
    router = useRouter()
  const { t, te } = useI18n()
  const { push } = useToasts()
  const id = typeof route.params.id === 'string' ? route.params.id : undefined
  const { timeZone } = useSettings()
  const session = useAuthSession()
  const form = reactive({
    name: '',
    prompt: '',
    cron: '0 9 * * *',
    timezone: timeZone.value,
    status: Status.active,
    model: '',
    owner_email: id ? '' : (session.value?.user?.email ?? ''),
    session_mode: SessionMode.new,
    env_from: [] as string[],
  })
  /** Server-side validation problems by field; the API names the field, the dictionary explains it. */
  const fieldErrors = reactive<Partial<Record<Field, string>>>({})
  const settings = shallowRef<Settings | null>(null),
    error = shallowRef<unknown>(null),
    loading = ref(true)
  const times = ref<string[]>([]),
    previewBusy = ref(false)
  const obsoleteNames = computed(() => form.env_from.filter((name) => !settings.value?.allowed_env_from.includes(name)))
  const extraNames = computed(() => settings.value?.allowed_env_from.filter((name) => !settings.value?.base_env_from.includes(name)) ?? [])
  const controller = new AbortController()
  let previewController: AbortController | undefined
  let attempt: { key: string; body: string } | undefined
  const action = useAction()
  for (const field of FIELDS) watch(() => form[field], () => delete fieldErrors[field], { deep: true })
  /** Maps a 422 to its fields; returns false for any other error. */
  function applyProblem(cause: unknown, fields: readonly Field[] = FIELDS): boolean {
    if (!(cause instanceof ApiError) || cause.status !== 422) return false
    let matched = false
    for (const detail of cause.problem?.details ?? []) {
      const field = fields.find((name) => detail.path[0] === 'body' && detail.path[1] === name)
      if (!field) continue
      fieldErrors[field] = te(`validation.${field}`) ? t(`validation.${field}`) : t(`validation.${detail.code}`)
      matched = true
    }
    return matched
  }
  async function load() {
    loading.value = true
    error.value = null
    try {
      const [options, task] = await Promise.all([
        get('/api/v1/schedules/settings', { signal: controller.signal }),
        id ? get('/api/v1/schedules/{id}', { signal: controller.signal, path: { id } }) : undefined,
      ])
      if (controller.signal.aborted) return
      settings.value = options
      if (task)
        Object.assign(form, {
          name: task.name,
          prompt: task.prompt,
          cron: task.cron,
          timezone: task.timezone,
          status: task.status,
          model: task.model ?? '',
          owner_email: task.owner_email ?? '',
          session_mode: task.session_mode,
          env_from: [...task.env_from],
        })
    } catch (cause) {
      if (!controller.signal.aborted) error.value = cause
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }
  async function preview() {
    previewController?.abort()
    previewController = new AbortController()
    const signal = previewController.signal
    previewBusy.value = true
    times.value = []
    delete fieldErrors.cron
    delete fieldErrors.timezone
    try {
      const result = await write('post', '/api/v1/schedules/preview', { signal, body: { cron: form.cron, timezone: form.timezone } })
      if (!signal.aborted) times.value = result.times
    } catch (cause) {
      if (!signal.aborted && !applyProblem(cause, ['cron', 'timezone'])) push(t('common.requestFailed'))
    } finally {
      if (!signal.aborted) previewBusy.value = false
    }
  }
  function invalidatePreview() {
    previewController?.abort()
    times.value = []
    previewBusy.value = false
  }
  function payload(): CreateSchedule {
    return { ...form, model: form.model.trim() || null, owner_email: form.owner_email.trim() || null, env_from: [...form.env_from] }
  }
  async function save() {
    const body = payload()
    const serialized = JSON.stringify(body)
    await action.run(
      async (signal) => {
        if (!attempt || attempt.body !== serialized) attempt = { key: crypto.randomUUID(), body: serialized }
        const task = id
          ? await write('patch', '/api/v1/schedules/{id}', { signal, path: { id }, body })
          : await write('post', '/api/v1/schedules', { signal, body, idempotencyKey: attempt.key })
        if (!signal.aborted) await router.push(`/schedules/${task.id}`)
      },
      {
        failure: 'common.saveFailed',
        // A field edited while the request ran must not be marked for the value it no longer holds.
        onError: (cause) => (JSON.stringify(payload()) === serialized && applyProblem(cause) ? t('validation.failed') : undefined),
      },
    )
  }
  onMounted(load)
  onUnmounted(() => {
    controller.abort()
    previewController?.abort()
  })
  return {
    id,
    form,
    fieldErrors,
    settings,
    extraNames,
    obsoleteNames,
    error,
    loading,
    load,
    save,
    busy: action.busy,
    preview,
    times,
    previewBusy,
    invalidatePreview,
  }
}
