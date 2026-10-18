import { spyOn } from 'bun:test'
import assert from 'node:assert/strict'
import { pythonZappyFixture } from './zappy-python'

// Native Fetch realm: the UI suite uses HappyDOM Response, which Bun.serve cannot send.
const nativeFetch = globalThis.fetch
const fixture = await pythonZappyFixture('pro')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: (request) => fixture.routes.studioZappyMessage.POST(request),
})
const url = `http://127.0.0.1:${server.port}/api/studio/zappy/messages`
const send = (signal?: AbortSignal) =>
  nativeFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...fixture.input, clientMessageId: crypto.randomUUID() }),
    signal: signal ?? AbortSignal.timeout(3000),
  })

async function withinDeadline<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('HTTP cancellation deadline exceeded')), 3000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const reservation = Promise.withResolvers<void>()
let modelRequests = 0
const modelStarted = Promise.withResolvers<void>()
const modelAborted = Promise.withResolvers<void>()
const modelFetch = Object.assign(
  async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    modelRequests++
    assert.ok(String(_url).startsWith('https://openrouter.ai/'))
    const signal = init?.signal
    assert.ok(signal)
    modelStarted.resolve()
    return new Promise<Response>((_resolve, reject) => {
      const abort = () => {
        modelAborted.resolve()
        reject(signal.reason)
      }
      if (signal.aborted) abort()
      else signal.addEventListener('abort', abort, { once: true })
    })
  },
  { preconnect: nativeFetch.preconnect },
)
const model = spyOn(globalThis, 'fetch').mockImplementation(modelFetch)

try {
  fixture.state.allowed = false
  const denied = await send()
  assert.equal(denied.status, 409)
  await denied.body?.cancel()
  assert.equal(fixture.state.reservations, 0)
  assert.equal(modelRequests, 0)

  fixture.state.allowed = true
  fixture.state.reservationStatus = 429
  fixture.state.onReservation = () => reservation.promise
  const response = await send()
  assert.equal(response.status, 200)
  assert.equal(fixture.state.policies, 2)
  assert.equal(response.headers.get('cache-control'), 'private, no-store, no-transform')
  const reader = response.body?.getReader()
  assert.ok(reader)
  const prefix = await reader.read()
  assert.equal(new TextDecoder().decode(prefix.value), '{"transportVersion":1,')
  let completed = false
  const remainder = (async () => {
    const chunks = [new TextDecoder().decode(prefix.value)]
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      chunks.push(new TextDecoder().decode(chunk.value))
    }
    completed = true
    return JSON.parse(chunks.join(''))
  })()
  await Promise.resolve()
  assert.equal(completed, false)
  assert.equal(modelRequests, 0)
  reservation.resolve()
  const data = await remainder
  assert.equal(data.transportVersion, 1)
  assert.equal(data.status, 429)
  assert.equal(data.body.error.code, 'RATE_LIMITED')

  fixture.state.reservationStatus = 200
  fixture.state.onReservation = async () => {}
  const controller = new AbortController()
  const cancelledResponse = await send(controller.signal)
  const cancelledReader = cancelledResponse.body?.getReader()
  assert.ok(cancelledReader)
  assert.equal(
    new TextDecoder().decode((await cancelledReader.read()).value),
    '{"transportVersion":1,',
  )
  await withinDeadline(modelStarted.promise)
  controller.abort()
  await withinDeadline(modelAborted.promise)
  assert.equal(modelRequests, 1)
  assert.equal(fixture.state.freeAccess, 0)
  assert.equal(fixture.state.knowledge, 0)
  // The upstream rejects after the connection closes; an attempted late write
  // must not become an unhandled rejection or restart inference.
  await cancelledReader.cancel().catch((error: unknown) => {
    assert.ok(error instanceof Error && error.name === 'AbortError')
  })
  console.log(JSON.stringify({ verified: true }))
} finally {
  reservation.resolve()
  model.mockRestore()
  await server.stop(true)
}
