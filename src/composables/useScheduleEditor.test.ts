import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { provideToasts } from './useToasts'
import { useScheduleEditor } from './useScheduleEditor'
import { useSettings } from './useSettings'
import { schedule } from '../test/fixtures'
let wrapper: ReturnType<typeof mount>
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
async function setup(edit = false) {
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      Response.json(
        url.endsWith('/settings') ? { base_env_from: ['A'], allowed_env_from: ['A', 'B'], browser_auth: 'anonymous' } : schedule(),
      ),
    ),
  )
  vi.stubGlobal('fetch', fetcher)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schedules/new', component: { render: () => null } },
      { path: '/schedules/:id/edit', component: { render: () => null } },
      { path: '/schedules/:id', component: { render: () => null } },
    ],
  })
  await router.push(edit ? '/schedules/id/edit' : '/schedules/new')
  await flushPromises()
  let state!: ReturnType<typeof useScheduleEditor>
  let notifications!: ReturnType<typeof provideToasts>
  const Child = defineComponent({
    setup() {
      state = useScheduleEditor()
      return () => null
    },
  })
  wrapper = mount(
    defineComponent({
      components: { Child },
      setup() {
        notifications = provideToasts()
      },
      template: '<Child />',
    }),
    { global: { plugins: [router] } },
  )
  await flushPromises()
  return { state, fetcher, notifications }
}
it('uses UI timezone once for creation and preserves the stored timezone when editing', async () => {
  useSettings().setTimeZone('Asia/Tokyo')
  const first = await setup()
  expect(first.state.form.timezone).toBe('Asia/Tokyo')
  useSettings().setTimeZone('UTC')
  expect(first.state.form.timezone).toBe('Asia/Tokyo')
  wrapper.unmount()
  const edit = await setup(true)
  expect(edit.state.form.timezone).toBe('Europe/Moscow')
  expect(edit.state.extraNames.value).toEqual(['B'])
})
it('reuses the create key after failure and replaces it only for changed input', async () => {
  const { state, fetcher } = await setup()
  state.form.name = 'New'
  state.form.prompt = 'Work'
  const requests: RequestInit[] = []
  fetcher.mockImplementation((_url: string, options?: RequestInit) => {
    requests.push(options!)
    return Promise.resolve(Response.json({ error: { code: 'storage_unavailable' } }, { status: 503 }))
  })
  await state.save()
  await state.save()
  state.form.prompt = 'Different'
  await state.save()
  const key = (i: number) => (requests[i].headers as Record<string, string>)['Idempotency-Key']
  expect(key(0)).toBe(key(1))
  expect(key(2)).not.toBe(key(1))
})
it('maps 422 details to fields, clears them on edit and keeps other errors generic', async () => {
  const { state, fetcher, notifications } = await setup()
  state.form.name = 'New'
  state.form.prompt = 'Work'
  state.form.cron = '0 9 * *'
  state.form.owner_email = 'nobody'
  fetcher.mockImplementation(() =>
    Promise.resolve(
      Response.json(
        {
          error: {
            code: 'validation_error',
            message: 'Request validation failed.',
            phase: null,
            details: [
              { path: ['body', 'cron'], code: 'invalid_value' },
              { path: ['body', 'owner_email'], code: 'invalid_value' },
              { path: ['body', 'prompt'], code: 'required' },
              { path: ['query', 'limit'], code: 'invalid_value' },
            ],
          },
        },
        { status: 422 },
      ),
    ),
  )
  await state.save()
  expect(state.fieldErrors.cron).toBe('Check the cron expression: five fields, minute, hour, day, month, weekday.')
  expect(state.fieldErrors.owner_email).toBe('Enter a valid email address or leave the field empty.')
  expect(state.fieldErrors.prompt).toBe('Required.')
  expect(state.fieldErrors.timezone).toBeUndefined()
  state.form.cron = '0 9 * * *'
  await flushPromises()
  expect(state.fieldErrors.cron).toBeUndefined()
  expect(state.fieldErrors.owner_email).toBeDefined()
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: { code: 'storage_unavailable' } }, { status: 503 })))
  await state.save()
  expect(state.fieldErrors.cron).toBeUndefined()
  await state.preview()
  expect(state.fieldErrors.cron).toBeUndefined()
  expect(notifications.toasts.value.at(-1)?.message).toBe('Could not load data')
  fetcher.mockImplementation(() =>
    Promise.resolve(Response.json({ error: { code: 'validation_error', message: '', phase: null, details: [{ path: ['body', 'timezone'], code: 'invalid_value' }] } }, { status: 422 })),
  )
  await state.preview()
  expect(state.fieldErrors.cron).toBeUndefined()
  expect(state.fieldErrors.timezone).toBe('Unknown time zone.')
})
it('does not mark a field for a validation response that arrived after the field changed', async () => {
  const { state, fetcher } = await setup()
  state.form.name = 'New'
  state.form.prompt = 'Work'
  state.form.cron = '0 9 * *'
  let respond!: (response: Response) => void
  fetcher.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve
      }),
  )
  const saving = state.save()
  await flushPromises()
  state.form.cron = '0 9 * * *'
  await flushPromises()
  respond(
    Response.json(
      { error: { code: 'validation_error', message: '', phase: null, details: [{ path: ['body', 'cron'], code: 'invalid_value' }] } },
      { status: 422 },
    ),
  )
  await saving
  expect(state.fieldErrors.cron).toBeUndefined()
})
