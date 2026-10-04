import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { provideToasts } from './useToasts'
import { useScheduleEditor } from './useScheduleEditor'
import { useSettings } from './useSettings'
import { profiles, templates, services, schedule } from '../test/fixtures'
import { AuthSessionMode, type Profiles, type Templates, type AuthSession, type Services } from '../api/generated'
import { provideAuthSession } from './useAuth'
import ScheduleForm from '../components/ScheduleForm.vue'
let wrapper: ReturnType<typeof mount>
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

it('locks the owner for members and never sends a modified form owner', async () => {
  const { state, session, fetcher } = await setup(false, 'alice@example.com', services(), true)
  session.value = { ...session.value, can_manage_all: false }
  await flushPromises()
  expect(wrapper.get('input[type="email"]').attributes('readonly')).toBeDefined()
  state.form.name = 'Test'
  state.form.prompt = 'Work'
  state.form.owner_email = 'forged@example.com'
  const requests: RequestInit[] = []
  fetcher.mockImplementation((_url: string, options?: RequestInit) => {
    if (options?.method) requests.push(options)
    return Promise.resolve(Response.json(schedule()))
  })
  await state.save()
  expect(JSON.parse(requests[0].body as string).owner_email).toBe('alice@example.com')
  wrapper.unmount()
  const edit = await setup(true, 'alice@example.com')
  edit.session.value = { ...edit.session.value, can_manage_all: false }
  edit.fetcher.mockImplementation((_url: string, options?: RequestInit) => {
    if (options?.method) requests.push(options)
    return Promise.resolve(Response.json(schedule()))
  })
  await edit.state.save()
  expect(JSON.parse(requests[1].body as string)).not.toHaveProperty('owner_email')
})

it('blocks a direct create route without email and sends no write', async () => {
  const { state, session, router, fetcher } = await setup()
  session.value = { ...session.value, can_manage_all: false, write_access: false }
  fetcher.mockClear()
  await state.load()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/schedules')
  expect(state.canSave.value).toBe(false)
  await state.save()
  expect(fetcher).not.toHaveBeenCalled()
})

it('blocks editing when server permissions deny it even for a cached admin session', async () => {
  const { state, fetcher, router } = await setup(true, 'admin@example.com')
  fetcher.mockImplementation(() => Promise.resolve(Response.json(schedule({ can_edit: false }))))
  await state.load()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/schedules/id')
  expect(state.canSave.value).toBe(false)
  fetcher.mockClear()
  await state.save()
  expect(fetcher).not.toHaveBeenCalled()
})

it('returns to the card with a local notification if permission is lost while editing', async () => {
  const { state, fetcher, router, notifications } = await setup(true, 'alice@example.com')
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: { code: 'schedule_forbidden' } }, { status: 403 })))
  await state.save()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/schedules/id')
  expect(state.canSave.value).toBe(false)
  expect(notifications.toasts.value.at(-1)?.message).toContain('You can only change your own schedules')
})

it('preserves a new draft and fixes the owner when an administrator loses full access', async () => {
  const { state, session, refreshAuth, fetcher, router } = await setup(false, 'alice@example.com')
  state.form.name = 'Important draft'
  state.form.prompt = 'Keep these instructions'
  state.form.owner_email = 'bob@example.com'
  refreshAuth.mockImplementation(async () => { session.value = { ...session.value, can_manage_all: false }; return true })
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: { code: 'schedule_forbidden' } }, { status: 403 })))
  await state.save()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/schedules/new')
  expect(state.canSave.value).toBe(true)
  expect(state.form).toMatchObject({ name: 'Important draft', prompt: 'Keep these instructions', owner_email: 'alice@example.com' })
  expect(state.canManageAll.value).toBe(false)
})

it('preserves the draft if the permission refresh is temporarily unavailable', async () => {
  const { state, refreshAuth, fetcher, router } = await setup(false, 'alice@example.com')
  state.form.name = 'Important draft'
  state.form.prompt = 'Keep these instructions'
  refreshAuth.mockResolvedValue(false)
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: { code: 'schedule_forbidden' } }, { status: 403 })))
  await state.save()
  expect(router.currentRoute.value.path).toBe('/schedules/new')
  expect(state.canSave.value).toBe(true)
  expect(state.form.prompt).toBe('Keep these instructions')
})

it('explains deletion instead of ownership when an editor URL points to a deleted schedule', async () => {
  const { state, fetcher, notifications } = await setup(true, 'alice@example.com')
  fetcher.mockImplementation(() => Promise.resolve(Response.json(schedule({ can_edit: false, deleted_at: '2026-10-03T00:00:00Z' }))))
  await state.load()
  expect(notifications.toasts.value.at(-1)?.message).toBe('This schedule has been deleted. Its history is retained.')
})
async function setup(edit = false, email: string | null = null, catalogServices: Services | null = services(), renderForm = false, catalogs: { profiles: Profiles | null; templates: Templates | null } = { profiles: profiles(), templates: templates() }) {
  const refreshAuth = vi.fn(async () => true)
  const session = shallowRef<AuthSession>({
    mode: AuthSessionMode.saml, authenticated: true, read_access: true, write_access: true, can_manage_all: true,
    user: { subject: 'operator', display_name: 'Operator', email }, expires_at: null,
  })
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith('/services')) return Promise.resolve(Response.json(catalogServices ?? { error: { code: 'core_unavailable' } }, { status: catalogServices ? 200 : 503 }))
    if (url.endsWith('/profiles') || url.endsWith('/templates')) {
      const items = url.endsWith('/profiles') ? catalogs.profiles : catalogs.templates
      return Promise.resolve(Response.json(items ?? { error: { code: 'core_unavailable' } }, { status: items ? 200 : 503 }))
    }
    return Promise.resolve(Response.json(schedule()))
  })
  vi.stubGlobal('fetch', fetcher)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schedules', component: { render: () => null } },
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
        provideAuthSession(session, refreshAuth)
      },
      template: '<Child />',
    }),
    { global: { plugins: [router] } },
  )
  await flushPromises()
  return { state, fetcher, notifications, session, router, refreshAuth }
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
    url.endsWith('/profiles') ? profiles() : url.endsWith('/templates') ? templates() : url.endsWith('/services') ? services() : schedule({ owner_email: null }),
  )))
  await edit.state.load()
  expect(edit.state.form.owner_email).toBe('')
  wrapper.unmount()
  const missing = await setup()
  expect(missing.state.form.owner_email).toBe('')
})
it('keeps unavailable selected codes removable even when the catalog is empty', async () => {
  const { state } = await setup(false, null, { items: [] }, true)
  expect(wrapper.text()).toContain('No services configured')
  expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  state.form.services = ['retired']
  await flushPromises()
  state.fieldErrors.services = 'Choose available services.'
  await flushPromises()
  expect(wrapper.text()).toContain('Unavailable service')
  expect(wrapper.get('[role="alert"]').text()).toBe('Choose available services.')
  await wrapper.get('input[type="checkbox"][value="retired"]').setValue(false)
  expect(state.form.services).toEqual([])
})
it('offers every service including Space without selecting defaults', async () => {
  const { state, session } = await setup(false, 'alice@example.com', services(), true)
  session.value = { ...session.value, can_manage_all: false }
  await flushPromises()
  expect(state.form.services).toEqual([])
  expect(wrapper.findAll('input[type="checkbox"]').map((node) => node.attributes('value'))).toEqual(['gitlab', 'orpheus-space'])
  await wrapper.get('input[type="checkbox"][value="orpheus-space"]').setValue(true)
  expect(state.form.services).toEqual(['orpheus-space'])
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
  expect(edit.state.form.services).toEqual(['gitlab'])
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

it('rejects an empty prompt before sending and clears the field error when edited', async () => {
  const { state, fetcher } = await setup()
  fetcher.mockClear()
  state.form.prompt = '  \n '
  await flushPromises()
  await state.save()
  expect(fetcher).not.toHaveBeenCalled()
  expect(state.fieldErrors.prompt).toBe('Required.')
  state.form.prompt = '# Work'
  await flushPromises()
  expect(state.fieldErrors.prompt).toBeUndefined()
})

it('prefills catalog defaults once and preserves choices and model overrides on refresh', async () => {
  const { state, fetcher } = await setup()
  expect(state.form.profile).toBe('default')
  expect(state.form.template).toBe('fixture')
  expect(state.form.model).toBe('')
  state.form.profile = 'research'
  state.form.model = 'explicit-model'
  await state.catalogs.refresh()
  expect(state.form.profile).toBe('research')
  expect(state.form.model).toBe('explicit-model')
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: { code: 'core_unavailable' } }, { status: 503 })))
  await state.catalogs.refresh()
  expect(state.catalogs.disconnected.value).toBe(true)
  expect(state.form.profile).toBe('research')
  expect(state.form.template).toBe('fixture')
})

it('requires an explicit choice when a catalog has no default, without inventing a fallback', async () => {
  const choices = profiles()
  choices.items.forEach((item) => item.is_default = false)
  const { state, fetcher } = await setup(false, null, services(), false, { profiles: choices, templates: templates() })
  expect(state.form.profile).toBe('')
  expect(state.form.template).toBe('fixture')
  state.form.prompt = 'Work'
  fetcher.mockClear()
  await state.save()
  expect(fetcher).not.toHaveBeenCalled()
  expect(state.fieldErrors.profile).toBe('Choose an available profile.')
})

it('recovers initially unavailable catalogs independently without overwriting edits', async () => {
  const { state, fetcher } = await setup(false, null, services(), false, { profiles: null, templates: templates() })
  expect(state.loading.value).toBe(false)
  expect(state.error.value).toBeNull()
  expect(state.form.profile).toBe('')
  expect(state.form.template).toBe('fixture')
  state.form.template = 'reports:v2'
  fetcher.mockImplementation((url: string) => Promise.resolve(Response.json(url.endsWith('/profiles') ? profiles() : url.endsWith('/services') ? services() : templates())))
  await state.catalogs.refresh()
  expect(state.form.profile).toBe('default')
  expect(state.form.template).toBe('reports:v2')
})

it('edits stored selections offline and sends only changed selections', async () => {
  const { state, fetcher } = await setup(true, null, services(), false, { profiles: null, templates: null })
  expect(state.form.profile).toBe('default')
  expect(state.form.template).toBe('fixture')
  const bodies: Record<string, unknown>[] = []
  fetcher.mockImplementation((_url: string, request?: RequestInit) => {
    bodies.push(JSON.parse(request!.body as string))
    return Promise.resolve(Response.json(schedule()))
  })
  state.form.prompt = 'Updated'
  await state.save()
  expect(bodies[0]).not.toHaveProperty('profile')
  expect(bodies[0]).not.toHaveProperty('template')
  state.form.profile = 'research'
  state.form.model = 'explicit-model'
  await state.save()
  expect(bodies[1]).toMatchObject({ profile: 'research', model: 'explicit-model' })
  expect(bodies[1]).not.toHaveProperty('template')
})

it('shows profile/template validation at the corresponding field', async () => {
  const { state, fetcher } = await setup()
  state.form.prompt = 'Work'
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: {
    code: 'validation_error', message: '', phase: null,
    details: ['profile', 'template'].map((field) => ({ path: ['body', field], code: 'invalid_value' })),
  } }, { status: 422 })))
  await state.save()
  expect(state.fieldErrors.profile).toBe('Choose an available profile.')
  expect(state.fieldErrors.template).toBe('Choose an available sandbox template.')
})

it('preserves selected services through offline edits and maps service errors without dropping the draft', async () => {
  const { state, fetcher, notifications } = await setup(true, 'alice@example.com', null, true)
  expect(state.form.services).toEqual(['gitlab'])
  expect(wrapper.get<HTMLInputElement>('input[value="gitlab"]').element.checked).toBe(true)
  const bodies: Record<string, unknown>[] = []
  fetcher.mockImplementation((_url: string, options?: RequestInit) => {
    if (options?.method) bodies.push(JSON.parse(options.body as string))
    return Promise.resolve(Response.json({ error: { code: 'core_unavailable' } }, { status: 503 }))
  })
  state.form.name = 'Keep this draft'
  await state.save()
  expect(bodies[0]).toMatchObject({ name: 'Keep this draft', services: ['gitlab'] })
  expect(bodies[0]).not.toHaveProperty('env_from')
  expect(state.form.services).toEqual(['gitlab'])
  expect(notifications.toasts.value.at(-1)?.message).toContain('Could not save')
  fetcher.mockImplementation(() => Promise.resolve(Response.json({ error: {
    code: 'validation_error', details: [{ path: ['body', 'services'], code: 'invalid_value' }],
  } }, { status: 422 })))
  await state.save()
  await flushPromises()
  expect(wrapper.get('[role=alert]').text()).toBe('Choose available services or remove unavailable ones.')
  expect(state.form.name).toBe('Keep this draft')
  await wrapper.get('input[value="gitlab"]').setValue(false)
  expect(state.form.services).toEqual([])
  expect(state.fieldErrors.services).toBeUndefined()
})

it('keeps the create idempotency key across catalog refreshes and service reordering', async () => {
  const { state, fetcher } = await setup()
  state.form.name = 'New'
  state.form.prompt = 'Work'
  state.form.services = ['orpheus-space', 'gitlab']
  const requests: RequestInit[] = []
  fetcher.mockImplementation((_url: string, options?: RequestInit) => {
    if (options?.method) requests.push(options)
    return Promise.resolve(Response.json({ error: { code: 'core_unavailable' } }, { status: 503 }))
  })
  await state.save()
  await state.catalogs.refresh()
  state.form.services = ['gitlab', 'orpheus-space']
  await state.save()
  expect(requests[0].body).toBe(requests[1].body)
  expect((requests[0].headers as Record<string, string>)['Idempotency-Key']).toBe((requests[1].headers as Record<string, string>)['Idempotency-Key'])
  expect(state.form.services).toEqual(['gitlab', 'orpheus-space'])
})

it('keeps stored services available to undo an offline removal without losing the draft', async () => {
  const { state } = await setup(true, 'alice@example.com', null, true)
  state.form.name = 'Unsaved title'
  const input = () => wrapper.get<HTMLInputElement>('input[value="gitlab"]')
  await input().setValue(false)
  expect(state.form.services).toEqual([])
  expect(input().element.checked).toBe(false)
  await input().setValue(true)
  expect(state.form.services).toEqual(['gitlab'])
  expect(state.form.name).toBe('Unsaved title')
})
