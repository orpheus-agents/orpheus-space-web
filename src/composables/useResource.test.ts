import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useResource } from './useResource'

type Result = { key: string | null }
let wrapper: ReturnType<typeof mount>
afterEach(() => wrapper?.unmount())

function setup(keep?: (next: string, previous: string) => boolean) {
  const key = ref<string | null>('a:1')
  const waiting: { resolve: (value: Result) => void; reject: (cause: unknown) => void }[] = []
  const fetcher = vi.fn(() => new Promise<Result>((resolve, reject) => waiting.push({ resolve, reject })))
  let state!: ReturnType<typeof useResource<Result, string | null>>
  wrapper = mount(
    defineComponent({
      setup() {
        state = useResource(fetcher, key, { keep })
        return () => null
      },
    }),
  )
  return {
    key,
    fetcher,
    state,
    resolve: (value: Result) => waiting.shift()?.resolve(value),
    reject: (cause: unknown) => waiting.shift()?.reject(cause),
  }
}

it('shows a loader for a new key by default', async () => {
  const { key, state, resolve } = setup()
  resolve({ key: 'a:1' })
  await flushPromises()
  expect(state.data.value).toEqual({ key: 'a:1' })
  key.value = 'a:2'
  expect(state.data.value).toBeNull()
  expect(state.pending.value).toBe(true)
  resolve({ key: 'a:2' })
  await flushPromises()
  expect(state.data.value).toEqual({ key: 'a:2' })
})

it('keeps the last result on screen while a kept key loads and clears it otherwise', async () => {
  const { key, fetcher, state, resolve } = setup((next, previous) => next.split(':')[0] === previous.split(':')[0])
  resolve({ key: 'a:1' })
  await flushPromises()
  const shown = state.data.value
  key.value = 'a:2'
  expect(state.data.value).toBe(shown)
  expect(state.pending.value).toBe(true)
  expect(state.updatedAt.value).not.toBeNull()
  resolve({ key: 'a:2' })
  await flushPromises()
  expect(state.data.value).toEqual({ key: 'a:2' })
  expect(state.pending.value).toBe(false)
  key.value = 'b:1'
  expect(state.data.value).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(3)
})

it('drops the kept result when the next request fails, but keeps it on a failed refresh', async () => {
  const { key, state, resolve, reject } = setup(() => true)
  resolve({ key: 'a:1' })
  await flushPromises()
  void state.refresh().catch(() => undefined)
  reject(new Error('refresh failed'))
  await flushPromises()
  expect(state.data.value).toEqual({ key: 'a:1' })
  expect(state.error.value).toMatchObject({ message: 'refresh failed' })
  key.value = 'a:2'
  expect(state.stale.value).toBe(true)
  expect(state.data.value).toEqual({ key: 'a:1' })
  expect(state.error.value).toBeNull()
  reject(new Error('new selection failed'))
  await flushPromises()
  expect(state.data.value).toBeNull()
  expect(state.stale.value).toBe(false)
  expect(state.error.value).toMatchObject({ message: 'new selection failed' })
})

it('suspends on a null key and resumes on the next one', async () => {
  const { key, fetcher, state, resolve } = setup(() => true)
  resolve({ key: 'a:1' })
  await flushPromises()
  key.value = null
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(state.data.value).toEqual({ key: 'a:1' })
  key.value = 'a:3'
  expect(fetcher).toHaveBeenCalledTimes(2)
})
