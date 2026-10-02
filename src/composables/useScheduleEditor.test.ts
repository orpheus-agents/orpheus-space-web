import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { provideToasts } from './useToasts'
import { useScheduleEditor } from './useScheduleEditor'
import { useSettings } from './useSettings'
import { schedule } from '../test/fixtures'
import { AuthSessionMode, SettingsBrowser_auth, type AuthSession, type Settings } from '../api/generated'
import { provideAuthSession } from './useAuth'
import ScheduleForm from '../components/ScheduleForm.vue'
let wrapper: ReturnType<typeof mount>
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
async function setup(edit = false, email: string | null = null, settings: Partial<Settings> = {}, renderForm = false) {
  const session = shallowRef<AuthSession>({
    mode: AuthSessionMode.saml, authenticated: true, read_access: true, write_access: true,
    user: { subject: 'operator', display_name: 'Operator', email }, expires_at: null,
  })
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      Response.json(
        url.endsWith('/settings') ? { base_env_from: ['A'], allowed_env_from: ['A', 'B'], browser_auth: SettingsBrowser_auth.anonymous, ...settings } : schedule(),
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
      return () => renderForm ? h(ScheduleForm, { editor: state }) : null
    },
  })
  wrapper = mount(
    defineComponent({
      components: { Child },
      setup() {
        notifications = provideToasts()
        provideAuthSession(session)
      },
      template: '<Child />',
    }),
    { global: { plugins: [router] } },
  )
  await flushPromises()
  return { state, fetcher, notifications, session }
}
it('prefills the owner once for new schedules, leaving edits and cleared values alone', async () => {
  const first = await setup(false, 'operator@example.com')
  expect(first.state.form.owner_email).toBe('operator@example.com')
  first.state.form.owner_email = ''
  first.session.value = { ...first.session.value, user: { subject: 'operator', display_name: 'Operator', email: 'changed@example.com' } }
  await first.state.load()
  expect(first.state.form.owner_email).toBe('')
  wrapper.unmount()
  const edit = await setup(true, 'operator@example.com')
  expect(edit.state.form.owner_email).toBe('alice@example.com')
  edit.fetcher.mockImplementation((url: string) => Promise.resolve(Response.json(
    url.endsWith('/settings') ? { base_env_from: [], allowed_env_from: [], browser_auth: SettingsBrowser_auth.saml } : schedule({ owner_email: null }),
  )))
  await edit.state.load()
  expect(edit.state.form.owner_email).toBe('')
  wrapper.unmount()
  const missing = await setup()
  expect(missing.state.form.owner_email).toBe('')
})
it.each([
  { base_env_from: [], allowed_env_from: [] },
  { base_env_from: ['A'], allowed_env_from: ['A'] },
])('hides extra ENV when there are no additional options: %j', async (settings) => {
  const { state } = await setup(false, null, settings, true)
  expect(wrapper.findAll('legend').some((node) => node.text() === 'Additional ENV names')).toBe(false)
  expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  state.form.env_from = ['RETIRED']
  await flushPromises()
  state.fieldErrors.env_from = 'Choose allowed variables.'
  await flushPromises()
  expect(wrapper.find('input[type="checkbox"][value="RETIRED"]').exists()).toBe(true)
  expect(wrapper.get('[role="alert"]').text()).toBe('Choose allowed variables.')
  await wrapper.get('input[type="checkbox"][value="RETIRED"]').setValue(false)
  expect(state.form.env_from).toEqual([])
})
it('offers only non-base ENV names as additional choices', async () => {
  const { state } = await setup(false, null, {}, true)
  expect(wrapper.findAll('input[type="checkbox"]').map((node) => node.attributes('value'))).toEqual(['B'])
  await wrapper.get('input[type="checkbox"][value="B"]').setValue(true)
  expect(state.form.env_from).toEqual(['B'])
})
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
