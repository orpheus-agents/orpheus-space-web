import { inject, onMounted, onUnmounted, provide, ref, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { get, logout, onAccessFailure } from '../api/client'
import { AuthSessionMode, type AuthSession } from '../api/generated'

type AuthContext = { session: Readonly<ShallowRef<AuthSession | null>>; refresh: () => Promise<boolean> }
const sessionKey: InjectionKey<AuthContext> = Symbol('auth-session')
export function provideAuthSession(session: AuthContext['session'], refresh: AuthContext['refresh']) {
  provide(sessionKey, { session, refresh })
}
function useAuthContext() {
  const context = inject(sessionKey)
  if (!context) throw new Error('Auth session provider is missing')
  return context
}
export function useAuthSession() { return useAuthContext().session }
export function useRefreshAuth() { return useAuthContext().refresh }

export function useAuth() {
  const session = shallowRef<AuthSession | null>(null)
  provideAuthSession(session, refresh)
  const state = ref<'loading' | 'ready' | 'signin' | 'disabled' | 'forbidden' | 'error'>('loading')
  const pending = ref(false)
  let controller = new AbortController()
  const unsubscribe = onAccessFailure((status) => {
    state.value = status === 401 ? 'signin' : 'forbidden'
  })

  function login() {
    window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  }
  async function refresh(): Promise<boolean> {
    if (pending.value) return false
    controller.abort()
    controller = new AbortController()
    const signal = controller.signal
    try {
      const result = await get('/api/v1/auth/session', { signal })
      if (signal.aborted) return false
      session.value = result
      if (result.read_access) state.value = 'ready'
      else if (result.mode === AuthSessionMode.api_only) state.value = 'disabled'
      else {
        state.value = 'signin'
        login()
      }
      return true
    } catch {
      return false
    }
  }
  async function load() {
    state.value = 'loading'
    if (!await refresh() && state.value === 'loading') state.value = 'error'
  }
  async function signOut() {
    pending.value = true
    controller.abort()
    controller = new AbortController()
    try {
      await logout(controller.signal)
      state.value = 'signin'
      session.value = null
    } finally {
      pending.value = false
    }
  }
  onMounted(load)
  onUnmounted(() => {
    controller.abort()
    unsubscribe()
  })
  return { session, state, pending, login, load, refresh, signOut }
}
