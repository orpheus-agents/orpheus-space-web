import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AuthSessionMode, Status, type AuthSession } from '../api/generated'
import { ApiError } from '../api/client'
import { provideAuthSession } from './useAuth'
import { useSchedules } from './useSchedules'

let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })

async function setup(path = '/schedules') {
  const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ items: [], next_cursor: 'next' })))
  vi.stubGlobal('fetch', fetcher)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { name: 'schedules', path: '/schedules', component: { render: () => null } },
  ] })
  await router.push(path)
  await flushPromises()
  let state!: ReturnType<typeof useSchedules>
  const Child = defineComponent({ setup() { state = useSchedules(); return () => null } })
  wrapper = mount(defineComponent({ setup() {
    provideAuthSession(shallowRef<AuthSession>({ mode: AuthSessionMode.anonymous, authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null }), async () => true)
    return () => h(Child)
  } }), { global: { plugins: [router] } })
  await flushPromises()
  const query = () => new URL(String(fetcher.mock.lastCall?.[0]), 'http://space.test').searchParams
  return { state, router, fetcher, query }
}

it.each([
  ['/schedules', Status.active, 'active'],
  ['/schedules?status=active', Status.active, 'active'],
  ['/schedules?status=paused', Status.paused, 'paused'],
  ['/schedules?status=all', 'all', null],
])('restores %s and requests the matching status', async (path, selection, expected) => {
  const { state, query } = await setup(path!)
  expect(state.status.value).toBe(selection)
  expect(query().get('status')).toBe(expected)
})

it('keeps All explicit in the URL and composes status with owners and cursor pages', async () => {
  const { state, router, query } = await setup()
  state.owners.value = 'alice@example.com, bob@example.com'
  state.status.value = 'all'
  await state.apply()
  await flushPromises()
  expect(router.currentRoute.value.query.status).toBe('all')
  expect(query().has('status')).toBe(false)
  expect(query().getAll('owner_email')).toEqual(['alice@example.com', 'bob@example.com'])
  await state.page('next')
  await flushPromises()
  expect(query().get('cursor')).toBe('next')
  expect(router.currentRoute.value.query.status).toBe('all')
  state.status.value = Status.paused
  state.unowned.value = true
  await flushPromises()
  await state.apply()
  await flushPromises()
  expect(query().get('status')).toBe('paused')
  expect(query().get('unowned')).toBe('true')
  expect(query().has('cursor')).toBe(false)
  expect(query().has('owner_email')).toBe(false)
  await router.push('/schedules?status=all')
  await flushPromises()
  router.back()
  await flushPromises()
  expect(state.status.value).toBe(Status.paused)
})

it('reports an invalid status through the existing resource error state', async () => {
  const { state, fetcher } = await setup('/schedules?status=invalid')
  expect(fetcher).not.toHaveBeenCalled()
  expect(state.error.value).toBeInstanceOf(ApiError)
})
