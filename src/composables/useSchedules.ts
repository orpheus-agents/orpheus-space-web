import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { ApiError, get } from '../api/client'
import { Status } from '../api/generated'
import { useResource } from './useResource'
import { useAuthSession } from './useAuth'

function selectedStatus(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (value === undefined) return Status.active
  if (value === 'all') return 'all'
  return Object.values(Status).find((item) => item === value) ?? null
}
export function useSchedules() {
  const route = useRoute(),
    router = useRouter()
  const session = useAuthSession()
  const canCreate = computed(() => session.value?.write_access === true)
  const owners = ref(
    [route.query.owner_email]
      .flat()
      .filter((x): x is string => typeof x === 'string')
      .join(', '),
  )
  const unowned = ref(route.query.unowned === 'true')
  const status = ref(selectedStatus(route.query.status))
  const cursor = computed(() => (typeof route.query.cursor === 'string' ? route.query.cursor : undefined))
  const resource = useResource(
    (signal) => {
      const selected = selectedStatus(route.query.status)
      if (selected === null) throw new ApiError(422)
      return get('/api/v1/schedules', {
        signal,
        query: {
          owner_email: [route.query.owner_email].flat().filter((x): x is string => typeof x === 'string'),
          unowned: route.query.unowned === 'true' || undefined,
          status: selected === 'all' ? undefined : selected,
          cursor: cursor.value,
          limit: 25,
        },
      })
    },
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
      status.value = selectedStatus(query.status)
    },
  )
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
        status: status.value,
      },
    })
  }
  async function page(next?: string) {
    await router.push({ query: { ...route.query, cursor: next } })
  }
  return { ...resource, owners, unowned, status, cursor, apply, page, canCreate }
}
