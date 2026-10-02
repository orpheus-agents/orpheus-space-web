import { afterEach, expect, it, vi } from 'vitest'
import { get, write, ApiError, onAccessFailure } from './client'
import { Status } from './generated'
afterEach(() => vi.unstubAllGlobals())
it('repeats email filters and sends cookie credentials and cancellation', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [], next_cursor: null }))
  vi.stubGlobal('fetch', fetcher)
  const signal = new AbortController().signal
  await get('/api/v1/schedules', {
    signal,
    query: { owner_email: ['a@example.com', 'b@example.com'], status: Status.paused, cursor: 'opaque' },
  })
  const [path, options] = fetcher.mock.calls[0]
  expect(new URL(path, 'http://space.test').searchParams.getAll('owner_email')).toEqual(['a@example.com', 'b@example.com'])
  expect(options).toMatchObject({ signal, credentials: 'same-origin' })
})
it('uses CSRF and idempotency headers on writes without embedding a bearer key', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 'id' }))
  vi.stubGlobal('fetch', fetcher)
  await write('post', '/api/v1/schedules', {
    signal: new AbortController().signal,
    idempotencyKey: 'key',
    body: { name: 'Test', prompt: 'Work', cron: '0 9 * * *', timezone: 'UTC' },
  })
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    headers: { 'X-Orpheus-CSRF': '1', 'Idempotency-Key': 'key', 'Content-Type': 'application/json' },
  })
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
})
it('reports access failures but keeps storage errors separate', async () => {
  const report = vi.fn(),
    unsubscribe = onAccessFailure(report)
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { code: 'unavailable', message: 'Storage' } }, { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 401 })),
  )
  await expect(get('/api/v1/auth/session', { signal: new AbortController().signal })).rejects.toBeInstanceOf(ApiError)
  expect(report).not.toHaveBeenCalled()
  await expect(get('/api/v1/auth/session', { signal: new AbortController().signal })).rejects.toMatchObject({ status: 401 })
  expect(report).toHaveBeenCalledWith(401)
  unsubscribe()
})
