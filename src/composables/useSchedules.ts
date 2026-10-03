import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get, write, isScheduleForbidden } from '../api/client'
import { Status, type Schedule } from '../api/generated'
import { useAction } from './useAction'
import { useResource } from './useResource'
import { useAuthSession, useRefreshAuth } from './useAuth'
export function useSchedules() {
  const route = useRoute(),
    router = useRouter()
  const session = useAuthSession()
  const refreshAuth = useRefreshAuth()
  const canCreate = computed(() => session.value?.write_access === true)
  const owners = ref(
    [route.query.owner_email]
      .flat()
      .filter((x): x is string => typeof x === 'string')
      .join(', '),
  )
  const unowned = ref(route.query.unowned === 'true')
  const status = ref(Object.values(Status).find((x) => x === route.query.status) ?? '')
  const cursor = computed(() => (typeof route.query.cursor === 'string' ? route.query.cursor : undefined))
  const resource = useResource(
    (signal) =>
      get('/api/v1/schedules', {
        signal,
        query: {
          owner_email: [route.query.owner_email].flat().filter((x): x is string => typeof x === 'string'),
          unowned: route.query.unowned === 'true' || undefined,
          status: Object.values(Status).find((x) => x === route.query.status),
          cursor: cursor.value,
          limit: 25,
        },
      }),
    () => (route.name === 'schedules' ? route.fullPath : null),
  )
  watch(unowned, (value) => {
    if (value) owners.value = ''
  })
  watch(
    () => route.query,
    (query) => {
      owners.value = [query.owner_email]
        .flat()
        .filter((x): x is string => typeof x === 'string')
        .join(', ')
      unowned.value = query.unowned === 'true'
      status.value = Object.values(Status).find((x) => x === query.status) ?? ''
    },
  )
  const action = useAction()
  async function apply() {
    await router.replace({
      query: {
        owner_email: unowned.value
          ? undefined
          : owners.value
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
        unowned: unowned.value ? 'true' : undefined,
        status: status.value || undefined,
      },
    })
  }
  async function page(next?: string) {
    await router.push({ query: { ...route.query, cursor: next } })
  }
  async function toggle(task: Schedule) {
    if (!task.can_edit) return
    await action.run(async (signal) => {
      await write('patch', '/api/v1/schedules/{id}', {
        signal,
        path: { id: task.id },
        body: { status: task.status === Status.active ? Status.paused : Status.active },
      })
      await resource.refresh()
    }, { onError: async (error) => {
      if (isScheduleForbidden(error)) await Promise.all([resource.refresh(), refreshAuth()])
      return undefined
    } })
  }
  return { ...resource, owners, unowned, status, cursor, apply, page, toggle, canCreate, busy: action.busy }
}
