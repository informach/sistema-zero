import { realpath } from 'node:fs/promises'
import { ToolRejected } from '@sistemazero/agent-core'
import { z } from 'zod'
import { JsonLineTransport } from '../mcp/stdio'
import { browserActionSchema, browserExtractSchema, browserOpenSchema, redactText } from './schema'
import { BrowserSession } from './session'

const directory = await realpath(z.string().parse(process.argv[2]))
const requests = new Map<
  string,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()
let browser: BrowserSession | undefined
let stopped = false
let pending = 0
let tail = Promise.resolve()
const transport = new JsonLineTransport({
  input: process.stdin,
  write: (data) =>
    new Promise<void>((resolve, reject) =>
      process.stdout.write(data, (error) => (error ? reject(error) : resolve())),
    ),
  close: async () => {
    process.stdin.pause()
    await close()
  },
})
async function close() {
  if (stopped) return
  stopped = true
  for (const request of requests.values()) {
    clearTimeout(request.timer)
    request.reject(new Error('Browser worker stopped'))
  }
  requests.clear()
  await browser?.close()
}
async function parent(method: string, params: Record<string, unknown>) {
  if (requests.size >= 16) throw new Error('Browser control queue full')
  const id = crypto.randomUUID()
  const promise = new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      requests.delete(id)
      reject(new Error('Browser control timed out'))
    }, 5000)
    requests.set(id, { resolve, reject, timer })
  })
  try {
    await transport.send({ jsonrpc: '2.0', id, method, params })
  } catch (error) {
    const request = requests.get(id)
    if (request) {
      clearTimeout(request.timer)
      requests.delete(id)
      request.reject(new Error(String(error)))
    }
  }
  return promise
}
transport.onmessage = (message) => {
  if (!('method' in message)) {
    const request = requests.get(String(message.id))
    if (!request) return
    requests.delete(String(message.id))
    clearTimeout(request.timer)
    if ('error' in message) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  if (!('id' in message)) {
    if (message.method === 'browser.cancel') void close()
    return
  }
  const id = message.id
  if (pending >= 8 || stopped) {
    void transport.send({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: 'Browser worker unavailable' },
    })
    return
  }
  pending++
  tail = tail
    .then(async () => {
      try {
        if (stopped) throw new Error('Browser worker closed')
        await transport.send({
          jsonrpc: '2.0',
          method: 'browser.progress',
          params: { method: message.method, state: 'started' },
        })
        let result: unknown
        if (message.method === 'open') {
          if (browser) throw new Error('Browser already opened')
          browser = await BrowserSession.open(
            browserOpenSchema.parse(message.params),
            directory,
            async (origin) =>
              z.object({ allowed: z.boolean() }).parse(await parent('network.local', { origin }))
                .allowed,
          )
          result = { ready: true }
        } else {
          if (!browser) throw new Error('Open the browser first')
          switch (message.method) {
            case 'navigate':
              result = await browser.navigate(z.object({ url: z.url() }).parse(message.params).url)
              break
            case 'observe':
              result = await browser.observe()
              break
            case 'extract':
              result = await browser.extract(
                z.object({ fields: browserExtractSchema }).parse(message.params).fields,
              )
              break
            case 'action':
              result = await browser.action(browserActionSchema.parse(message.params))
              break
            case 'screenshot':
              result = await browser.screenshot()
              break
            case 'inspect':
              result = browser.inspect()
              break
            case 'close':
              await close()
              result = { closed: true }
              break
            default:
              throw new Error('Unknown browser operation')
          }
        }
        await transport.send({
          jsonrpc: '2.0',
          id,
          result: z.record(z.string(), z.unknown()).parse(result),
        })
        await transport.send({
          jsonrpc: '2.0',
          method: 'browser.progress',
          params: { method: message.method, state: 'completed' },
        })
      } catch (error) {
        const detail = redactText(
          error instanceof Error ? error.message : 'Browser operation failed',
          8000,
        )
        await transport.send({
          jsonrpc: '2.0',
          method: 'browser.progress',
          params: { method: message.method, state: 'failed', detail: detail.slice(0, 500) },
        })
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: {
            code: error instanceof ToolRejected ? -32010 : -32000,
            message:
              detail.length > 8000
                ? `${detail.slice(0, 1000)}\n...\n${detail.slice(-7000)}`
                : detail,
          },
        })
      } finally {
        pending--
      }
    })
    .catch(async (error) => {
      console.error(String(error))
      await close()
    })
}
transport.onerror = (error) => {
  console.error(error.message)
  void close()
}
await transport.start()
