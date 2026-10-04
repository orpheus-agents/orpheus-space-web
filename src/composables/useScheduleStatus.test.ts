import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AuthSessionMode, Status, type AuthSession } from '../api/generated'
import { schedule, taskID } from '../test/fixtures'
import { provideAuthSession } from './useAuth'
import { provideToasts } from './useToasts'
import { useSchedule } from './useSchedule'
import { useSchedules } from './useSchedules'

let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })

for (const view of ['card', 'list'] as const) {
  describe(`${view} resume`, () => {
    it.each([
      { status: 422, error: { code: 'validation_error', details: [{ path: ['body', 'services'], code: 'unknown_service' }] }, message: 'A selected service is unavailable. Edit the schedule’s services before resuming.' },
      { status: 503, error: { code: 'core_unavailable' }, message: 'Cannot check services while Orpheus is unavailable. Try resuming later.' },
      { status: 422, error: { code: 'validation_error', details: [{ path: ['body', 'status'], code: 'invalid' }] }, message: 'Could not load data' },
      { status: 503, error: { code: 'unavailable' }, message: 'Could not load data' },
    ])('explains $status $error.code without changing the stored status', async ({ status, error, message }) => {
      const task = schedule({ status: Status.paused })
      const fetcher = vi.fn((_url: string, options?: RequestInit) => Promise.resolve(options?.method === 'PATCH'
        ? Response.json({ error }, { status })
        : Response.json(view === 'card' ? task : { items: [task], next_cursor: null })))
      vi.stubGlobal('fetch', fetcher)
      const router = createRouter({ history: createMemoryHistory(), routes: [
        { name: 'schedules', path: '/schedules', component: { render: () => null } },
        { name: 'schedule', path: '/schedules/:id', component: { render: () => null } },
      ] })
      await router.push(view === 'card' ? `/schedules/${taskID}` : '/schedules')
      await flushPromises()
      let toggle!: () => Promise<void>
      let notifications!: ReturnType<typeof provideToasts>
      const Child = defineComponent({ setup() {
        if (view === 'card') toggle = useSchedule().toggle
        else { const state = useSchedules(); toggle = () => state.toggle(task) }
        return () => null
      } })
      wrapper = mount(defineComponent({ setup() {
        notifications = provideToasts()
        provideAuthSession(shallowRef<AuthSession>({ mode: AuthSessionMode.anonymous, authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null }), async () => true)
        return () => h(Child)
      } }), { global: { plugins: [router] } })
      await flushPromises()
      await toggle()
      expect(notifications.toasts.value.at(-1)?.message).toBe(message)
      expect(task.status).toBe(Status.paused)
      const patch = fetcher.mock.calls.find(([, options]) => options?.method === 'PATCH')
      expect(JSON.parse(patch![1]!.body as string)).toEqual({ status: Status.active })
    })
  })
}
