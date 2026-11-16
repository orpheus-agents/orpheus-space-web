import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AuthSessionMode, Status, type AuthSession } from '../api/generated'
import { occurrence, schedule, taskID } from '../test/fixtures'
import { provideAuthSession } from './useAuth'
import { provideToasts } from './useToasts'
import { useSchedule } from './useSchedule'

let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })

async function setup(canEdit = true) {
  const task = schedule({ status: Status.paused, can_edit: canEdit })
  const post = vi.fn(() => Promise.resolve(Response.json(occurrence(), { status: 202 })))
  const fetcher = vi.fn((url: string, options?: RequestInit) => options?.method === 'POST'
    ? post()
    : Promise.resolve(Response.json({ ...task, id: url.split('/').pop() })))
  vi.stubGlobal('fetch', fetcher)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { name: 'schedule', path: '/schedules/:id', component: { render: () => null } },
  ] })
  await router.push(`/schedules/${taskID}`)
  await flushPromises()
  const session = shallowRef<AuthSession>({ mode: AuthSessionMode.saml, authenticated: true, read_access: true, write_access: true, can_manage_all: false, user: { subject: 'alice', display_name: 'Alice', email: 'alice@example.com' }, expires_at: null })
  const refreshAuth = vi.fn(async () => true)
  let state!: ReturnType<typeof useSchedule>
  let notifications!: ReturnType<typeof provideToasts>
  const Child = defineComponent({ setup() { state = useSchedule(); return () => null } })
  wrapper = mount(defineComponent({ setup() {
    notifications = provideToasts()
    provideAuthSession(session, refreshAuth)
    return () => h(Child)
  } }), { global: { plugins: [router] } })
  await flushPromises()
  const requests = () => fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')
  const keys = () => requests().map(([, options]) => (options!.headers as Record<string, string>)['Idempotency-Key'])
  return { state, task, session, post, router, requests, keys, notifications, refreshAuth }
}

it('runs a paused schedule without patching it and reuses the key until acceptance', async () => {
  const { state, post, keys, requests, notifications } = await setup()
  post.mockRejectedValueOnce(new TypeError('Network error'))
  await state.runNow()
  expect(notifications.toasts.value.at(-1)?.message).toContain('Retry in this card')
  await state.runNow()
  expect(keys()).toHaveLength(2)
  expect(keys()[0]).toBe(keys()[1])
  expect(notifications.toasts.value.at(-1)?.message).toBe('Run accepted')
  await state.runNow()
  expect(keys()[2]).not.toBe(keys()[1])
  expect(state.data.value?.status).toBe(Status.paused)
  expect(requests()[0]![0]).toBe(`/api/v1/schedules/${taskID}/run`)
  expect(requests().every(([, options]) => options?.body === undefined)).toBe(true)
})

it('blocks a second click while the request is in flight', async () => {
  const { state, post, requests } = await setup()
  let resolve!: (response: Response) => void
  post.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
  const first = state.runNow()
  expect(state.busy.value).toBe(true)
  await state.runNow()
  expect(requests()).toHaveLength(1)
  resolve(Response.json(occurrence(), { status: 202 }))
  await first
  expect(state.busy.value).toBe(false)
})

it.each([409, 503])('retains the key after HTTP %i and explains the error', async (status) => {
  const { state, post, keys, notifications } = await setup()
  post.mockResolvedValueOnce(Response.json({ error: { code: status === 409 ? 'schedule_busy' : 'storage_unavailable' } }, { status }))
  await state.runNow()
  expect(notifications.toasts.value.at(-1)?.message).toContain(status === 409 ? 'previous run has not finished' : 'Could not confirm the run')
  await state.runNow()
  expect(keys()[0]).toBe(keys()[1])
})

it('uses current permissions and refreshes them after a denial', async () => {
  const { state, task, post, refreshAuth } = await setup()
  task.can_edit = false
  post.mockResolvedValueOnce(Response.json({ error: { code: 'schedule_forbidden' } }, { status: 403 }))
  await state.runNow()
  expect(refreshAuth).toHaveBeenCalledOnce()
  expect(state.data.value?.can_edit).toBe(false)
  await state.runNow()
  expect(post).toHaveBeenCalledOnce()
})

it('never submits a read-only schedule', async () => {
  const { state, post } = await setup(false)
  await state.runNow()
  expect(post).not.toHaveBeenCalled()
})

it('resets an unresolved attempt on schedule or user changes', async () => {
  const { state, post, router, keys, session } = await setup()
  post.mockRejectedValue(new TypeError('Network error'))
  await state.runNow()
  await router.push('/schedules/33333333-3333-4333-8333-333333333333')
  await flushPromises()
  await state.runNow()
  session.value = { ...session.value, user: { subject: 'bob', display_name: 'Bob', email: 'bob@example.com' } }
  await flushPromises()
  await state.runNow()
  expect(new Set(keys()).size).toBe(3)
})
