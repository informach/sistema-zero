import { expect, test } from 'bun:test'
import { liveRequest } from '../src/lib/live/client'

test('live mutations carry the document session proof required by the Kids proxy', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
  const previousFetch = globalThis.fetch
  const proof = 'session-that-opened-this-document'
  const requests: { method: string | undefined; proof: string | null; body: unknown }[] = []
  try {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelector: (selector: string) =>
          selector === 'meta[name="sz-session"]' ? { content: proof } : null,
      },
    })
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { href: 'https://kids.test/oficinas/aulas/lesson', origin: 'https://kids.test' },
    })
    globalThis.fetch = Object.assign(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const sentProof = new Headers(init?.headers).get('x-sz-session')
        requests.push({
          method: init?.method,
          proof: sentProof,
          body: JSON.parse(String(init?.body)),
        })
        if (sentProof !== proof)
          return Response.json({ error: { code: 'SESSION_CHANGED' } }, { status: 409 })
        return Response.json({ ok: true })
      },
      { preconnect: previousFetch.preconnect },
    )
    expect(await liveRequest('/api/live/sessions/lesson/join', { deviceId: 'this-tab' })).toEqual({
      ok: true,
    })
    expect(requests).toEqual([{ method: 'POST', proof, body: { deviceId: 'this-tab' } }])
  } finally {
    globalThis.fetch = previousFetch
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation)
    else Reflect.deleteProperty(globalThis, 'location')
  }
})
