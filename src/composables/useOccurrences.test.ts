import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useOccurrences } from './useOccurrences'
import { provideToasts } from './useToasts'
import { occurrence, taskID, occurrenceID, timestamp } from '../test/fixtures'
let wrapper: ReturnType<typeof mount>
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
it('reads stored history first, keeps result errors separate and aborts a stale result', async () => {
  let pending: ((r: Response) => void) | undefined
  let pendingSignal: AbortSignal | undefined
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith('/result')) {
      pendingSignal = options.signal as AbortSignal
      return new Promise<Response>((resolve) => {
        pending = resolve
      })
    }
    return Promise.resolve(Response.json(url.includes('/occurrences?') ? { items: [occurrence()], next_cursor: null } : occurrence()))
  })
  vi.stubGlobal('fetch', fetcher)
  let state!: ReturnType<typeof useOccurrences>
  const Child = defineComponent({
    setup() {
      state = useOccurrences(ref(taskID))
      return () => null
    },
  })
  wrapper = mount(
    defineComponent({
      components: { Child },
      setup() {
        provideToasts()
      },
      template: '<Child />',
    }),
  )
  await flushPromises()
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/result'))).toBe(false)
  state.selected.value = occurrenceID
  await flushPromises()
  expect(state.card.data.value?.observed_at).toBe(timestamp)
  let loaded = state.loadResult()
  await flushPromises()
  pending!(Response.json({ error: { code: 'core_unavailable', message: 'Unavailable' } }, { status: 503 }))
  await loaded
  expect(state.resultError.value).toBeTruthy()
  expect(state.resultProblem.value).toBe('history.resultUnavailable')
  expect(state.card.data.value?.observed_at).toBe(timestamp)
  loaded = state.loadResult()
  await flushPromises()
  state.selected.value = null
  await flushPromises()
  expect(pendingSignal?.aborted).toBe(true)
  pending!(Response.json({ run_status: 'completed', fetched_at: timestamp, final_message: null, error: null }))
  await loaded
  expect(state.result.value).toBeNull()
  expect(state.resultProblem.value).toBeNull()
})
