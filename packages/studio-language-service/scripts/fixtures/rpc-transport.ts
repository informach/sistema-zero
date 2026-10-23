import { DurableObject } from 'cloudflare:workers'
import { checkPythonLanguageHealth, PythonLanguageCommand } from '../../src/language-transport'

export class Probe extends DurableObject {
  #command: PythonLanguageCommand | undefined
  #pending: Promise<unknown> | undefined
  #release: (() => void) | undefined
  #count = 0
  #destroyed = false
  #completed = false
  #closingEntered = false
  #bodyCancelEntered = false
  health(token: string) {
    return checkPythonLanguageHealth(token, async (request) => {
      if (request.method !== 'GET' || request.url !== 'http://language/healthz')
        throw new Error('Unexpected health request')
      return Response.json(
        { ready: true },
        { status: request.headers.get('authorization') === `Bearer ${'a'.repeat(64)}` ? 200 : 401 },
      )
    })
  }
  create(
    body: ReadableStream<Uint8Array> | null,
    hold: boolean,
    pendingBody = false,
    configure = false,
  ) {
    this.#command = new PythonLanguageCommand({
      body,
      token: 'a'.repeat(64),
      target: configure ? 'configure' : 'command',
      send: async (request) => {
        this.#count++
        const body = await request.text()
        if (pendingBody) {
          const gate = new Promise<void>((done) => {
            this.#release = done
          })
          return new Response(
            new ReadableStream({
              pull() {},
              cancel: async () => {
                this.#bodyCancelEntered = true
                await gate
              },
            }),
          )
        }
        if (hold)
          await new Promise<void>((done) => {
            this.#release = done
          })
        if (this.#destroyed) throw new Error('Container recreated after destroy')
        return Response.json({
          body,
          route: request.url,
          authorized: request.headers.get('authorization') === `Bearer ${'a'.repeat(64)}`,
        })
      },
      retain: (promise) => {
        this.#pending = promise.finally(() => {
          this.#completed = true
        })
        this.ctx.waitUntil(this.#pending)
      },
    })
    return this.#command
  }
  inspect() {
    return {
      count: this.#count,
      entered: !!this.#release,
      completed: this.#completed,
      destroyed: this.#destroyed,
      closingEntered: this.#closingEntered,
      bodyCancelEntered: this.#bodyCancelEntered,
    }
  }
  release() {
    this.#release?.()
  }
  async close() {
    await this.#command?.cancel()
    this.#closingEntered = true
    await this.#pending
    this.#destroyed = true
    return this.inspect()
  }
}
export default {
  async fetch(request: Request, env: { PROBE: DurableObjectNamespace<Probe> }) {
    const url = new URL(request.url),
      mode = url.pathname.slice(1),
      key = url.searchParams.get('key') ?? mode
    const stub = env.PROBE.getByName(key)
    if (mode === 'health') return Response.json({ healthy: await stub.health('a'.repeat(64)) })
    if (mode === 'inspect') return Response.json(await stub.inspect())
    if (mode === 'release') {
      await stub.release()
      return Response.json({ released: true })
    }
    if (mode === 'close') return Response.json(await stub.close())
    const handle = await stub.create(
      new Response('safe-static-analysis-source').body,
      mode === 'hold' || mode === 'configure-hold',
      mode === 'body',
      mode === 'configure' || mode === 'configure-hold',
    )
    try {
      if (mode === 'cancel') {
        await handle.cancel()
        let rejected = false
        try {
          await handle.run()
        } catch {
          rejected = true
        }
        return Response.json({ rejected, ...(await stub.inspect()) })
      }
      if (mode === 'repeat') {
        const results = await Promise.all([handle.run(), handle.run(), handle.run()])
        return Response.json({
          bodies: await Promise.all(results.map((result) => result.text())),
          ...(await stub.inspect()),
        })
      }
      return await handle.run()
    } catch {
      return Response.json({ cancelled: true }, { status: 410 })
    } finally {
      handle[Symbol.dispose]()
    }
  },
}
