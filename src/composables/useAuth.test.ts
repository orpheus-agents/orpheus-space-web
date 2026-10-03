import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useAuth } from './useAuth'
import { AuthSessionMode, type AuthSession } from '../api/generated'

let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
const member: AuthSession = {
  mode: AuthSessionMode.saml, authenticated: true, read_access: true, write_access: true, can_manage_all: false,
  user: { subject: 'alice', display_name: 'Alice', email: 'alice@example.com' }, expires_at: null,
}
async function setup() {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ ...member, can_manage_all: true }))
  vi.stubGlobal('fetch', fetcher)
  let auth!: ReturnType<typeof useAuth>
  const states: string[] = []
  wrapper = mount(defineComponent({ setup() {
    auth = useAuth()
    watch(auth.state, (state) => states.push(state), { flush: 'sync' })
    return () => null
  } }))
  await flushPromises()
  return { auth, fetcher, states }
}

it('quietly refreshes permissions without unmounting the active screen and preserves them on 503', async () => {
  const { auth, fetcher, states } = await setup()
  expect(auth.state.value).toBe('ready')
  fetcher.mockResolvedValueOnce(Response.json(member))
  expect(await auth.refresh()).toBe(true)
  expect(auth.session.value?.can_manage_all).toBe(false)
  expect(states).toEqual(['ready'])
  fetcher.mockResolvedValueOnce(Response.json({ error: { code: 'storage_unavailable' } }, { status: 503 }))
  expect(await auth.refresh()).toBe(false)
  expect(auth.state.value).toBe('ready')
  expect(auth.session.value).toEqual(member)
})

it('does not restore the session from a refresh that completes after logout', async () => {
  const { auth, fetcher } = await setup()
  let respond!: (response: Response) => void
  fetcher.mockImplementationOnce(() => new Promise<Response>((resolve) => { respond = resolve }))
  const refreshing = auth.refresh()
  fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }))
  await auth.signOut()
  respond(Response.json(member))
  expect(await refreshing).toBe(false)
  expect(auth.session.value).toBeNull()
  expect(auth.state.value).toBe('signin')
})
