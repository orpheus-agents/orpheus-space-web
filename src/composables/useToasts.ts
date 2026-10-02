import { inject, onUnmounted, provide, readonly, ref, type InjectionKey } from 'vue'

type Toast = { id: number; message: string }
const key: InjectionKey<ReturnType<typeof provideToasts>> = Symbol('toasts')
export function provideToasts() {
  const toasts = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 0
  function dismiss(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }
  function push(message: string) {
    const id = ++nextId
    toasts.value.push({ id, message })
    timers.set(
      id,
      setTimeout(() => dismiss(id), 6000),
    )
  }
  const api = { toasts: readonly(toasts), push, dismiss }
  provide(key, api)
  onUnmounted(() => {
    timers.forEach(clearTimeout)
    timers.clear()
  })
  return api
}
export function useToasts() {
  const api = inject(key)
  if (!api) throw new Error('Toast provider is missing')
  return api
}
