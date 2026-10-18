import { expect, test } from 'bun:test'
import { awaitWithSignal } from '@sistemazero/core/http'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'

const bounded = <T>(promise: Promise<T>) =>
  awaitWithSignal(() => promise, AbortSignal.timeout(3000))

for (const network of [false, true]) {
  test(`client withdrawal propagates through the real pipeline and fetch${network ? ' over HTTP' : ''}`, async () => {
    const entered = Promise.withResolvers<void>()
    const withdrawn = Promise.withResolvers<void>()
    const finished = Promise.withResolvers<number>()
    const controller = new AbortController()
    let upstreamCalls = 0
    const upstream = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request): Promise<Response> {
        if (new URL(request.url).pathname === '/health') return new Response('ok')
        upstreamCalls++
        request.signal.addEventListener('abort', () => withdrawn.resolve(), { once: true })
        entered.resolve()
        await withdrawn.promise
        return new Response('retired')
      },
    })
    const app = await createApplication(loadEnv({ LOG_LEVEL: 'error', SHUTDOWN_DRAIN_MS: '0' }), {
      rawConfig: {
        services: {
          work: {
            name: 'work',
            upstreamGroups: {
              default: [{ url: `http://127.0.0.1:${upstream.port}`, id: 'work-upstream' }],
            },
            timeoutMs: 10000,
            retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
          },
        },
        routes: [
          { id: 'work', methods: ['GET'], pathPattern: '/work', service: 'work', auth: 'public' },
        ],
      },
    })
    const gateway = network
      ? Bun.serve({
          hostname: '127.0.0.1',
          port: 0,
          async fetch(request): Promise<Response> {
            const response = await app.handle(request)
            finished.resolve(response.status)
            return response
          },
        })
      : undefined
    try {
      const pending = gateway
        ? fetch(`http://127.0.0.1:${gateway.port}/work`, { signal: controller.signal })
        : app.handle(new Request('http://gateway.local/work', { signal: controller.signal }))
      // Observe rejection from an aborted native fetch immediately.
      const outcome = pending.then(
        (response) => ({ response, error: undefined }),
        (error: unknown) => ({ response: undefined, error }),
      )
      await bounded(entered.promise)
      controller.abort(new DOMException('Leaving the lesson', 'AbortError'))
      const result = await bounded(outcome)
      if (network) {
        expect(result.response).toBeUndefined()
        expect(result.error).toBeInstanceOf(DOMException)
        expect(await bounded(finished.promise)).toBe(499)
      } else {
        expect(result.error).toBeUndefined()
        expect(result.response?.status).toBe(499)
      }
      await bounded(withdrawn.promise)
      expect(upstreamCalls).toBe(1)
    } finally {
      controller.abort()
      withdrawn.resolve()
      gateway?.stop(true)
      upstream.stop(true)
      await app.stop()
    }
  }, 10000)
}
