import type { Problem, paths } from './generated'

type JSONGet<P> = P extends { get: { responses: { 200: { content: { 'application/json': unknown } } } } } ? P : never
type GetPath = { [P in keyof paths]: JSONGet<paths[P]> extends never ? never : P }[keyof paths]
type Operation<P extends GetPath> = paths[P]['get']
type Params<P extends GetPath> = Operation<P> extends { parameters: infer T } ? T : never
type Query<P extends GetPath> = Params<P> extends { query?: infer Q } ? Q : never
type PathParams<P extends GetPath> = Params<P> extends { path?: infer R } ? R : never
type Response<P extends GetPath> = Operation<P> extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem?: Problem['error'],
  ) {
    super(problem?.message ?? `HTTP ${status}`)
  }
}

let accessFailure: ((status: number) => void) | undefined
export function onAccessFailure(handler: (status: number) => void) {
  accessFailure = handler
  return () => {
    if (accessFailure === handler) accessFailure = undefined
  }
}

async function checkResponse(response: globalThis.Response, reportAccessFailure = true) {
  if (response.ok) return
  if (reportAccessFailure && (response.status === 401 || response.status === 403)) accessFailure?.(response.status)
  const payload: Problem | null = await response.json().catch(() => null)
  throw new ApiError(response.status, payload?.error)
}

export async function get<P extends GetPath>(
  path: P,
  options: {
    signal: AbortSignal
    query?: Query<P>
  } & (PathParams<P> extends undefined ? { path?: never } : { path: PathParams<P> }),
): Promise<Response<P>> {
  let url: string = path
  for (const [name, value] of Object.entries(options.path ?? {})) url = url.replace(`{${name}}`, encodeURIComponent(String(value)))
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(name, String(item))
    }
  }
  const response = await fetch(url + (query.size ? `?${query}` : ''), {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  })
  await checkResponse(response)
  return response.json() as Promise<Response<P>>
}

export async function logout(signal: AbortSignal) {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    signal,
    headers: { 'X-Orpheus-CSRF': '1' },
  })
  await checkResponse(response, false)
}

type WriteMethod = 'post' | 'patch' | 'delete'
type WritePath<M extends WriteMethod> = { [P in keyof paths]: paths[P][M] extends { responses: object } ? P : never }[keyof paths]
type WriteOperation<M extends WriteMethod, P extends WritePath<M>> = paths[P][M]
type Body<O> = O extends { requestBody: { content: { 'application/json': infer B } } } ? B : never
type WriteResponse<O> = O extends { responses: infer R }
  ? R extends { 201: { content: { 'application/json': infer B } } }
    ? B
    : R extends { 200: { content: { 'application/json': infer B } } }
      ? B
      : void
  : never
export async function write<M extends WriteMethod, P extends WritePath<M>>(
  method: M,
  path: P,
  options: {
    signal: AbortSignal
    body?: Body<WriteOperation<M, P>>
    path?: Record<string, string>
    idempotencyKey?: string
  },
): Promise<WriteResponse<WriteOperation<M, P>>> {
  let url: string = path
  for (const [name, value] of Object.entries(options.path ?? {})) url = url.replace(`{${name}}`, encodeURIComponent(value))
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Orpheus-CSRF': '1' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  const response = await fetch(url, {
    method: method.toUpperCase(),
    credentials: 'same-origin',
    signal: options.signal,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  await checkResponse(response)
  return (response.status === 204 ? undefined : await response.json()) as WriteResponse<WriteOperation<M, P>>
}
