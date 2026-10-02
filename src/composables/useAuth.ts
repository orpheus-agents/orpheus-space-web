import { inject, onMounted, onUnmounted, provide, ref, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { get, logout, onAccessFailure } from '../api/client'
import { AuthSessionMode, type AuthSession } from '../api/generated'

const sessionKey: InjectionKey<Readonly<ShallowRef<AuthSession | null>>> = Symbol('auth-session')
export function provideAuthSession(session: Readonly<ShallowRef<AuthSession | null>>) {
  provide(sessionKey, session)
}
export function useAuthSession() {
  const session = inject(sessionKey)
  if (!session) throw new Error('Auth session provider is missing')
  return session
}

export function useAuth() {
  const session = shallowRef<AuthSession | null>(null)
  provideAuthSession(session)
  const state = ref<'loading' | 'ready' | 'signin' | 'disabled' | 'forbidden' | 'error'>('loading')
  const pending = ref(false)
  let controller = new AbortController()
  const unsubscribe = onAccessFailure((status) => {
    state.value = status === 401 ? 'signin' : 'forbidden'
  })

  function login() {
    window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  }
  async function load() {
    controller.abort()
    controller = new AbortController()
    const signal = controller.signal
    state.value = 'loading'
    try {
      const result = await get('/api/v1/auth/session', { signal })
      if (signal.aborted) return
      session.value = result
      if (result.read_access) state.value = 'ready'
      else if (result.mode === AuthSessionMode.api_only) state.value = 'disabled'
      else {
        state.value = 'signin'
        login()
      }
    } catch {
      if (!signal.aborted && state.value === 'loading') state.value = 'error'
    }
  }
  async function signOut() {
    pending.value = true
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
  return { session, state, pending, login, load, signOut }
}
