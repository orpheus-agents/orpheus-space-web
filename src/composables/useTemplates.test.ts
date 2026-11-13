import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { template } from '../test/fixtures'
import type { Templates } from '../api/generated'
import { useTemplate, useTemplateOptions } from './useTemplates'

let wrapper: ReturnType<typeof mount>
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const page = (names: string[], next: string | null = null): Templates => ({
  items: names.map((name, index) => template({ id: `00000000-0000-4000-8000-00000000000${index}`, name })), next_cursor: next, prev_cursor: null,
})
function within<T>(setup: () => T): T {
  let state!: T
  wrapper = mount(defineComponent({ setup() { state = setup(); return () => null } }))
  return state
}
const query = (url: string) => Object.fromEntries(new URL(url, 'http://localhost').searchParams)

it('resolves the exact stored name with inactive records and never reports a failed check as missing', async () => {
  const responses: (Templates | null)[] = [{ ...page([]), items: [template({ active: false })] }, null, page([])]
  const fetcher = vi.fn((url: string) => {
    void url
    const next = responses.shift()
    return Promise.resolve(next ? Response.json(next) : Response.json({ error: { code: 'core_unavailable' } }, { status: 503 }))
  })
  vi.stubGlobal('fetch', fetcher)
  const name = ref('')
  const state = within(() => useTemplate(name))
  await flushPromises()
  expect(state.state.value).toBe('empty')
  expect(fetcher).not.toHaveBeenCalled()
  name.value = 'fixture'
  expect(state.state.value).toBe('loading')
  await flushPromises()
  expect(query(fetcher.mock.calls[0][0])).toEqual({ name: 'fixture' })
  expect(state.state.value).toBe('inactive')
  expect(state.template.value?.description).toBe('Standard tools')
  await state.refresh()
  expect(state.state.value).toBe('inactive')
  expect(state.disconnected.value).toBe(true)
  await state.refresh()
  expect(state.state.value).toBe('missing')
  name.value = 'other'
  responses.push(null)
  await flushPromises()
  expect(state.state.value).toBe('unavailable')
  expect(state.template.value).toBeNull()
})

it('pages active templates one request at a time and keeps the cursor after a failed page', async () => {
  const pending: ((response: Response) => void)[] = []
  const fetcher = vi.fn((url: string) => {
    void url
    return new Promise<Response>((resolve) => pending.push(resolve))
  })
  vi.stubGlobal('fetch', fetcher)
  const options = within(() => useTemplateOptions())
  await flushPromises()
  expect(query(fetcher.mock.calls[0][0])).toEqual({ active: 'true' })
  expect(options.pending.value).toBe(true)
  pending.shift()!(Response.json(page(['a', 'b'], 'second')))
  await flushPromises()
  expect(options.items.value.map((item) => item.name)).toEqual(['a', 'b'])
  void options.more()
  void options.more()
  await flushPromises()
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(query(fetcher.mock.calls[1][0])).toEqual({ active: 'true', cursor: 'second' })
  pending.shift()!(Response.json({ error: { code: 'core_unavailable' } }, { status: 503 }))
  await flushPromises()
  expect(options.moreError.value).not.toBeNull()
  expect(options.next.value).toBe('second')
  expect(options.items.value).toHaveLength(2)
  void options.more()
  await flushPromises()
  expect(options.moreError.value).toBeNull()
  pending.shift()!(Response.json(page(['c'])))
  await flushPromises()
  expect(options.items.value.map((item) => item.name)).toEqual(['a', 'b', 'c'])
  expect(options.next.value).toBeNull()
  void options.more()
  expect(fetcher).toHaveBeenCalledTimes(3)
})

it('searches on the server after a pause, resets accumulated pages and cancels stale requests', async () => {
  vi.useFakeTimers()
  const signals: AbortSignal[] = []
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    signals.push(init!.signal!)
    const { name_contains: needle, cursor } = query(url)
    return Promise.resolve(Response.json(cursor ? page(['late']) : page(needle ? [`${needle}-match`] : ['a', 'b'], needle ? null : 'second')))
  })
  vi.stubGlobal('fetch', fetcher)
  const options = within(() => useTemplateOptions())
  await flushPromises()
  const more = options.more()
  options.search('  Rep ')
  expect(signals[1].aborted).toBe(true)
  expect(options.items.value).toEqual([])
  expect(options.pending.value).toBe(true)
  await more
  options.search('Rep')
  await vi.advanceTimersByTimeAsync(249)
  expect(fetcher).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  await flushPromises()
  expect(query(fetcher.mock.calls[2][0])).toEqual({ active: 'true', name_contains: 'Rep' })
  expect(options.items.value.map((item) => item.name)).toEqual(['Rep-match'])
  expect(options.next.value).toBeNull()
  options.search('')
  await vi.advanceTimersByTimeAsync(250)
  await flushPromises()
  expect(query(fetcher.mock.calls[3][0])).toEqual({ active: 'true' })
  expect(options.loaded.value).toBe(true)
})
