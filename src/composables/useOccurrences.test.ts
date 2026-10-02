import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useOccurrences } from './useOccurrences'
import { occurrence, taskID, occurrenceID, timestamp } from '../test/fixtures'
let wrapper: ReturnType<typeof mount>
function setup() {
  let state!: ReturnType<typeof useOccurrences>
  wrapper = mount(defineComponent({
    setup() {
      state = useOccurrences(ref(taskID))
      return () => null
    },
  }))
  return state
}
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
it('loads results on opening, keeps result errors separate and aborts on close', async () => {
  let pending: ((r: Response) => void) | undefined
  let pendingSignal: AbortSignal | undefined
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith('/result')) {
      pendingSignal = options.signal as AbortSignal
      return new Promise<Response>((resolve) => { pending = resolve })
    }
    return Promise.resolve(Response.json(url.includes('/occurrences?') ? { items: [occurrence()], next_cursor: null } : occurrence()))
  })
  vi.stubGlobal('fetch', fetcher)
  const state = setup()
  await flushPromises()
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/result'))).toBe(false)
  state.selected.value = occurrenceID
  await flushPromises()
  expect(state.card.data.value?.observed_at).toBe(timestamp)
  expect(state.resultPending.value).toBe(true)
  expect(pending).toBeDefined()
  pending!(Response.json({ error: { code: 'core_unavailable', message: 'Unavailable' } }, { status: 503 }))
  await flushPromises()
  expect(state.resultError.value).toBeTruthy()
  expect(state.resultProblem.value).toBe('history.resultUnavailable')
  expect(state.card.data.value?.observed_at).toBe(timestamp)
  const loaded = state.refresh()
  await flushPromises()
  state.selected.value = null
  await flushPromises()
  expect(pendingSignal?.aborted).toBe(true)
  pending!(Response.json({ run_status: 'completed', fetched_at: timestamp, final_message: null, error: null }))
  await loaded
  expect(state.result.value).toBeNull()
  expect(state.active.value).toBe(false)
})
it('refreshes both sections and waits for a core run before requesting its result', async () => {
  let run = occurrence({ run_id: null, run_status: null })
  const fetcher = vi.fn((url: string) => Promise.resolve(Response.json(
    url.endsWith('/result') ? { run_status: 'completed', fetched_at: timestamp, final_message: null, error: null }
      : url.includes('/occurrences?') ? { items: [run], next_cursor: null } : run,
  )))
  vi.stubGlobal('fetch', fetcher)
  const state = setup()
  state.selected.value = occurrenceID
  await flushPromises()
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/result'))).toBe(false)
  run = occurrence()
  await state.refresh()
  await flushPromises()
  expect(state.result.value?.fetched_at).toBe(timestamp)
  fetcher.mockClear()
  await state.refresh()
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/result'))).toHaveLength(1)
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith(occurrenceID))).toHaveLength(1)
})
it('does not expose the previous result while a different occurrence loads', async () => {
  let finish: ((r: Response) => void) | undefined
  const otherID = '33333333-3333-4333-8333-333333333333'
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith(otherID)) return new Promise<Response>((resolve) => { finish = resolve })
    return Promise.resolve(Response.json(url.endsWith('/result')
      ? { run_status: 'completed', fetched_at: timestamp, final_message: null, error: null }
      : url.includes('/occurrences?') ? { items: [occurrence()], next_cursor: null } : occurrence()))
  }))
  const state = setup()
  state.selected.value = occurrenceID
  await flushPromises()
  expect(state.active.value).toBe(true)
  state.selected.value = otherID
  await flushPromises()
  expect(state.active.value).toBe(false)
  expect(state.card.data.value).toBeNull()
  finish!(Response.json(occurrence({ id: otherID, run_id: null })))
  await flushPromises()
  expect(state.active.value).toBe(false)
})
