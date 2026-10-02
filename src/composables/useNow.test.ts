import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useNow } from './useNow'

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
it('shares one timer and visibility listener across subscribers until the last one unmounts', async () => {
  const listen = vi.spyOn(document, 'addEventListener')
  const unlisten = vi.spyOn(document, 'removeEventListener')
  const clock = defineComponent({
    setup() {
      const now = useNow()
      return () => h('time', String(now.value))
    },
  })
  const wrappers = Array.from({ length: 200 }, () => mount(clock))
  await flushPromises()
  expect(vi.getTimerCount()).toBe(1)
  expect(listen.mock.calls.filter(([name]) => name === 'visibilitychange')).toHaveLength(1)
  const initial = wrappers[0].text()
  wrappers.slice(0, -1).forEach((wrapper) => wrapper.unmount())
  await vi.advanceTimersByTimeAsync(10_000)
  expect(wrappers.at(-1)!.text()).not.toBe(initial)
  Object.defineProperty(document, 'hidden', { value: true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  expect(vi.getTimerCount()).toBe(0)
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
  expect(vi.getTimerCount()).toBe(1)
  wrappers.at(-1)!.unmount()
  expect(vi.getTimerCount()).toBe(0)
  expect(unlisten.mock.calls.filter(([name]) => name === 'visibilitychange')).toHaveLength(1)
  const remounted = mount(clock)
  await flushPromises()
  expect(vi.getTimerCount()).toBe(1)
  remounted.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
