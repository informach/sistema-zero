import { RpcTarget } from 'cloudflare:workers'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'

type BufferedReply = { status: number; body: ArrayBuffer }
type ContainerRequest = (request: Request) => Promise<Response>

/** Called inside the Sandbox DO; only its token and boolean cross RPC. */
export async function checkPythonLanguageHealth(
  token: string,
  send: ContainerRequest,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid language credential')
  const signal = AbortSignal.timeout(5000)
  const response = await send(
    new Request('http://language/healthz', {
      headers: { authorization: `Bearer ${token}` },
      signal,
    }),
  )
  return (await bufferLanguageReply(response, signal)).status === 200
}

/** Own the response body before completing RPC; headers alone do not prove drain. */
export async function bufferLanguageReply(
  response: Response,
  signal: AbortSignal,
): Promise<BufferedReply> {
  const reader = response.body?.getReader()
  if (!reader) {
    signal.throwIfAborted()
    return { status: response.status, body: new ArrayBuffer(0) }
  }
  let complete = false,
    cancel: Promise<void> | undefined,
    size = 0
  const chunks: Uint8Array[] = []
  const abort = () => {
    cancel ??= reader.cancel().catch(() => {})
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const chunk = await reader.read()
      signal.throwIfAborted()
      if (chunk.done) {
        complete = true
        break
      }
      size += chunk.value.byteLength
      if (size > PYTHON_LANGUAGE_LIMITS.maxResponseBytes)
        throw new Error('Language response too large')
      chunks.push(chunk.value)
    }
    const body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { status: response.status, body: body.buffer }
  } finally {
    signal.removeEventListener('abort', abort)
    if (!complete) {
      cancel ??= reader.cancel().catch(() => {})
    }
    await cancel
    reader.releaseLock()
  }
}

/** An RPC capability: cancellation stays in the DO that performs container I/O. */
export class PythonLanguageCommand extends RpcTarget {
  #controller = new AbortController()
  #body: ReadableStream<Uint8Array> | null
  #token: string
  #send: ContainerRequest
  #retain: (promise: Promise<unknown>) => void
  #reply: Promise<BufferedReply> | undefined
  #inputCancelled: Promise<void> | undefined
  constructor(input: {
    body: ReadableStream<Uint8Array> | null
    token: string
    send: ContainerRequest
    retain(promise: Promise<unknown>): void
  }) {
    super()
    if (!/^[a-f0-9]{64}$/.test(input.token)) throw new Error('Invalid language credential')
    this.#body = input.body
    this.#token = input.token
    this.#send = input.send
    this.#retain = input.retain
  }
  async #execute(): Promise<BufferedReply> {
    const signal = AbortSignal.any([
      this.#controller.signal,
      AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs + 2000),
    ])
    try {
      signal.throwIfAborted()
      const response = await this.#send(
        new Request('http://language/command', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.#token}` },
          body: this.#body,
          signal,
        }),
      )
      return await bufferLanguageReply(response, signal)
    } finally {
      await this.#inputCancelled
      if (this.#body && !this.#body.locked) await this.#body.cancel().catch(() => {})
      this.#body = null
      this.#token = ''
    }
  }
  async run(): Promise<Response> {
    if (!this.#reply) {
      this.#reply = this.#execute()
      this.#retain(
        this.#reply.then(
          () => {},
          () => {},
        ),
      )
    }
    const reply = await this.#reply
    // Repeated RPC calls reuse the result; never repeat the command or transfer
    // the same response stream twice.
    return new Response(reply.body.slice(0), {
      status: reply.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }
  async cancel(): Promise<void> {
    this.#controller.abort()
    if (!this.#reply && this.#body) {
      this.#inputCancelled ??= this.#body.cancel().catch(() => {})
      await this.#inputCancelled
      this.#body = null
      this.#token = ''
    }
  }
  [Symbol.dispose]() {
    void this.cancel()
  }
}
