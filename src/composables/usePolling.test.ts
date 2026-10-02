import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { usePolling } from './usePolling'
import { useResource } from './useResource'
beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})
afterEach(() => vi.useRealTimers())
it('does not overlap slow requests; pauses and cancels when hidden; cleans up on unmount', async () => {
  const signals: AbortSignal[] = []
  const poll = vi.fn((signal: AbortSignal) => {
    signals.push(signal)
    return new Promise<void>(() => {})
  })
  const wrapper = mount(
    defineComponent({
      setup() {
        usePolling(poll, 1000)
        return () => null
      },
    }),
  )
  await vi.advanceTimersByTimeAsync(10_000)
  expect(poll).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'hidden', { value: true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  expect(signals[0].aborted).toBe(true)
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  expect(poll).toHaveBeenCalledTimes(2)
  wrapper.unmount()
  expect(signals[1].aborted).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
})
it('backs off failures and returns to the normal interval after success', async () => {
  const poll = vi.fn().mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error()).mockResolvedValue(undefined)
  const wrapper = mount(
    defineComponent({
      setup() {
        usePolling(poll, 1000)
        return () => null
      },
    }),
  )
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1999)
  expect(poll).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(poll).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(4000)
  expect(poll).toHaveBeenCalledTimes(3)
  await vi.advanceTimersByTimeAsync(1000)
  expect(poll).toHaveBeenCalledTimes(4)
  wrapper.unmount()
})
it('ignores late results after a filter change even if the fetcher ignores abort', async () => {
  const key = ref('old')
  const resolvers: ((value: string) => void)[] = []
  let resource!: ReturnType<typeof useResource<string, string | null>>
  const wrapper = mount(
    defineComponent({
      setup() {
        resource = useResource(() => new Promise<string>((resolve) => resolvers.push(resolve)), key)
        return () => null
      },
    }),
  )
  key.value = 'new'
  resolvers[1]('new data')
  await flushPromises()
  resolvers[0]('old data')
  await flushPromises()
  expect(resource.data.value).toBe('new data')
  expect(resource.pending.value).toBe(false)
  wrapper.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
