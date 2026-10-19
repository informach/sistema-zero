import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { apiGet, apiSend } from '../src/lib/api'

if (typeof document === 'undefined') GlobalRegistrator.register({ url: 'http://localhost/' })

/** API boundary with controlled responses. Native fetch/HTTP cancellation is a separate gate. */
test.each([
  'GET',
  'PATCH',
] as const)('canceled %s ignores a retained 401 without redirecting', async (method) => {
  const originalFetch = globalThis.fetch
  const remote = Promise.withResolvers<Response>()
  const controller = new AbortController()
  let receivedSignal: AbortSignal | null | undefined
  globalThis.fetch = Object.assign(
    async (_url: string | URL | Request, options?: RequestInit) => {
      receivedSignal = options?.signal
      return remote.promise
    },
    { preconnect: originalFetch.preconnect },
  )
  const originalUrl = window.location.href
  try {
    const response = (
      method === 'GET'
        ? apiGet('/draft', { signal: controller.signal })
        : apiSend('/draft', 'PATCH', { operationId: 'same-A' }, { signal: controller.signal })
    ).catch((error: unknown) => error)
    expect(receivedSignal).toBe(controller.signal)
    controller.abort(new DOMException('owner retired', 'AbortError'))
    remote.resolve(new Response(null, { status: 401 }))
    expect(await response).toBe(controller.signal.reason)
    expect(window.location.href).toBe(originalUrl)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('abort while reading response body does not adopt the parsed document', async () => {
  const originalFetch = globalThis.fetch
  const body = Promise.withResolvers<unknown>()
  const bodyStarted = Promise.withResolvers<void>()
  const controller = new AbortController()
  const response = Response.json({ ignored: true })
  response.json = () => {
    bodyStarted.resolve()
    return body.promise
  }
  globalThis.fetch = Object.assign(async () => response, { preconnect: originalFetch.preconnect })
  try {
    const result = apiGet('/draft', { signal: controller.signal }).catch((error: unknown) => error)
    await bodyStarted.promise
    controller.abort(new DOMException('obsolete body', 'AbortError'))
    body.resolve({ privateDocument: 'old owner' })
    expect(await result).toBe(controller.signal.reason)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('an already canceled API operation never calls fetch', async () => {
  const originalFetch = globalThis.fetch
  const controller = new AbortController()
  controller.abort(new DOMException('retired', 'AbortError'))
  let sent = false
  globalThis.fetch = Object.assign(
    async () => {
      sent = true
      return Response.json({})
    },
    { preconnect: originalFetch.preconnect },
  )
  try {
    expect(
      await apiGet('/draft', { signal: controller.signal }).catch((error: unknown) => error),
    ).toBe(controller.signal.reason)
    expect(
      await apiSend('/draft', 'PATCH', {}, { signal: controller.signal }).catch(
        (error: unknown) => error,
      ),
    ).toBe(controller.signal.reason)
    expect(sent).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('an ordinary uncanceled 401 retains the login redirect contract', async () => {
  const originalFetch = globalThis.fetch
  const originalUrl = window.location.href
  globalThis.fetch = Object.assign(async () => new Response(null, { status: 401 }), {
    preconnect: originalFetch.preconnect,
  })
  try {
    const rejected = await apiGet('/draft').catch((error: unknown) => error)
    expect(rejected).toEqual({ status: 401, code: 'UNAUTHORIZED', message: 'Sessão expirada.' })
    expect(window.location.pathname).toBe('/login')
  } finally {
    globalThis.fetch = originalFetch
    window.location.href = originalUrl
  }
})
