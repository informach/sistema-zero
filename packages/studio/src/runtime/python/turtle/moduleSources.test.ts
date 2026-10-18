import { afterEach, expect, spyOn, test } from 'bun:test'
import { TURTLE_MODULE_FILES } from './contract'
import { loadTurtleModuleSources } from './moduleSources'

function gate<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const base = new URL('https://runtime.test/approved/runtime/')
let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
})

function requests() {
  const started = gate<void>()
  const calls: { url: string; signal: AbortSignal; response: ReturnType<typeof gate<Response>> }[] =
    []
  const request = spyOn(globalThis, 'fetch')
  restore = () => request.mockRestore()
  request.mockImplementation(
    Object.assign(
      (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
        expect(init?.credentials).toBe('omit')
        expect(init?.redirect).toBe('error')
        expect(init?.referrerPolicy).toBe('no-referrer')
        expect(init?.signal).toBeInstanceOf(AbortSignal)
        const response = gate<Response>()
        calls.push({ url: String(url), signal: init!.signal!, response })
        if (calls.length === TURTLE_MODULE_FILES.length) started.resolve()
        // Deliberately ignores abort: the owner must still settle and retire late responses.
        return response.promise
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  return { calls, started: started.promise }
}

test('starts only the four closed sources concurrently and preserves names despite reverse completion', async () => {
  const { calls, started } = requests()
  const result = loadTurtleModuleSources(base)
  await started
  expect(calls.map((call) => call.url)).toEqual(
    TURTLE_MODULE_FILES.map((name) => new URL(`turtle/${name}`, base).href),
  )
  for (const [index, call] of [...calls.entries()].reverse())
    call.response.resolve(new Response(`source ${index}`))
  const sources = await result
  expect([...sources.keys()]).toEqual([...TURTLE_MODULE_FILES])
  for (const [index, name] of TURTLE_MODULE_FILES.entries())
    expect(sources.get(name)).toEqual(new TextEncoder().encode(`source ${index}`))
  expect(calls.every((call) => !call.signal.aborted)).toBe(true)
})

test('a failed response rejects the whole batch, aborts siblings and cancels a late response', async () => {
  const { calls, started } = requests()
  const failure = loadTurtleModuleSources(base).then(
    () => {
      throw new Error('partial batch accepted')
    },
    (error: unknown) => error,
  )
  await started
  calls[0]!.response.resolve(new Response('', { status: 404 }))
  expect(await failure).toBeInstanceOf(Error)
  expect(calls.every((call) => call.signal.aborted)).toBe(true)
  const cancelled = gate<void>()
  calls[1]!.response.resolve(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled.resolve()
        },
      }),
    ),
  )
  await cancelled.promise
})

test('owner withdrawal settles non-cooperative requests with the original reason', async () => {
  const { calls, started } = requests()
  const owner = new AbortController()
  const failure = loadTurtleModuleSources(base, owner.signal).catch((error: unknown) => error)
  await started
  const reason = new Error('project replaced')
  owner.abort(reason)
  expect(await failure).toBe(reason)
  expect(calls.every((call) => call.signal.aborted && call.signal.reason === reason)).toBe(true)
})

test('an already withdrawn owner starts no requests', async () => {
  const { calls } = requests()
  const owner = new AbortController()
  owner.abort(new Error('closed'))
  await expect(loadTurtleModuleSources(base, owner.signal)).rejects.toThrow('closed')
  expect(calls).toHaveLength(0)
})

test('source byte limits are streamed and cancel the batch instead of accepting oversized content', async () => {
  const { calls, started } = requests()
  const failure = loadTurtleModuleSources(base).catch((error: unknown) => error)
  await started
  calls[0]!.response.resolve(new Response(new Uint8Array(1024 * 1024 + 1)))
  expect(String(await failure)).toContain('limite')
  expect(calls.every((call) => call.signal.aborted)).toBe(true)
})

for (const invalid of ['http', 'size'] as const)
  test(`known ${invalid} failure aborts siblings without waiting for body cancellation ACK`, async () => {
    const { calls, started } = requests()
    const owner = new AbortController()
    const failure = loadTurtleModuleSources(base, owner.signal).catch((error: unknown) => error)
    const cancelling = gate<void>()
    try {
      await started
      calls[0]!.response.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(stream) {
              if (invalid === 'size') stream.enqueue(new Uint8Array(1024 * 1024 + 1))
            },
            cancel() {
              cancelling.resolve()
              return new Promise<void>(() => {})
            },
          }),
          { status: invalid === 'http' ? 404 : 200 },
        ),
      )
      await cancelling.promise
      // Drain scheduled ownership continuations without releasing the cancellation ACK.
      for (let index = 0; index < 64; index++) await Promise.resolve()
      expect(calls.every((call) => call.signal.aborted)).toBe(true)
      expect(String(await failure)).toContain(invalid === 'http' ? 'obter' : 'limite')
    } finally {
      owner.abort(new Error('test owner retired'))
      await failure
    }
  })
