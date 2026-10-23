import {
  isPythonBootResourceName,
  PYTHON_BOOT_LIMITS,
  PYTHON_BOOT_RESOURCE_MIME,
  type PythonBootResourceName,
} from './bootResourceContract'
import { type PythonBootRequest, readPythonBootResponse } from './bootResourceProtocol'

/** Worker-private read capability. This is a loader adapter, not a replacement for native fetch. */
export function createPythonBootResourceReader(options: { port: MessagePort; directory: URL }) {
  const { port } = options
  const directory = new URL(options.directory.href)
  if (
    !['https:', 'http:'].includes(directory.protocol) ||
    directory.username ||
    directory.password ||
    directory.search ||
    directory.hash ||
    !directory.pathname.endsWith('/') ||
    (directory.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(directory.hostname))
  )
    throw new Error('Diretório Python não autorizado.')
  const pending = new Map<
    number,
    {
      name: PythonBootResourceName
      resolve(response: Response): void
      reject(error: Error): void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  const requested = new Set<PythonBootResourceName>()
  let closed = false,
    sequence = 0,
    received = 0,
    receivedBytes = 0
  function close(error?: Error) {
    if (closed) return
    closed = true
    port.onmessage = null
    port.onmessageerror = null
    port.close()
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(error ?? new Error('Canal Python encerrado.'))
    }
    pending.clear()
  }
  const invalid = () => close(new Error('Resposta de arquivos Python inválida.'))
  port.onmessageerror = invalid
  port.onmessage = (event: MessageEvent<unknown>) => {
    if (closed) return
    const message = readPythonBootResponse(event.data)
    if (!message) {
      invalid()
      return
    }
    if (message.type === 'failed') {
      close(new Error(message.message))
      return
    }
    if (message.type === 'complete') {
      if (received !== PYTHON_BOOT_LIMITS.requests || pending.size) invalid()
      else close()
      return
    }
    const entry = pending.get(message.id)
    if (
      !entry ||
      entry.name !== message.name ||
      receivedBytes + message.bytes.byteLength > PYTHON_BOOT_LIMITS.totalBytes
    ) {
      invalid()
      return
    }
    // Enqueue transfers ownership; preserve the length before the buffer is detached.
    const byteLength = message.bytes.byteLength
    const response = new Response(
      new ReadableStream<Uint8Array>({
        type: 'bytes',
        start(controller) {
          controller.enqueue(new Uint8Array(message.bytes))
          controller.close()
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': PYTHON_BOOT_RESOURCE_MIME[entry.name],
          'Content-Length': String(byteLength),
        },
      },
    )
    pending.delete(message.id)
    clearTimeout(entry.timer)
    received++
    receivedBytes += byteLength
    port.postMessage({ protocol: 1, type: 'ack', id: message.id } satisfies PythonBootRequest)
    entry.resolve(response)
  }
  port.start()
  return {
    get closed() {
      return closed
    },
    dispose() {
      close(new Error('Canal Python encerrado.'))
    },
    async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (closed) throw new Error('Canal Python encerrado.')
      if (
        init !== undefined &&
        (!init || Object.getPrototypeOf(init) !== Object.prototype || Reflect.ownKeys(init).length)
      )
        throw new Error('O loader Python não oferece essas opções de fetch.')
      if (!(typeof input === 'string' || input instanceof URL))
        throw new Error('Recurso Python não autorizado.')
      const raw = typeof input === 'string' ? input : input.href
      let url: URL
      try {
        url = new URL(raw)
      } catch {
        throw new Error('Recurso Python não autorizado.')
      }
      const name = url.href.slice(directory.href.length)
      if (
        raw !== url.href ||
        !url.href.startsWith(directory.href) ||
        !isPythonBootResourceName(name) ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      )
        throw new Error('Recurso Python não autorizado.')
      if (requested.has(name)) throw new Error('O arquivo Python já foi solicitado.')
      if (requested.size >= PYTHON_BOOT_LIMITS.requests)
        throw new Error('Limite de arquivos Python excedido.')
      const id = ++sequence
      requested.add(name)
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => close(new Error('O arquivo Python demorou demais.')),
          PYTHON_BOOT_LIMITS.deadlineMs,
        )
        pending.set(id, { name, resolve, reject, timer })
        try {
          port.postMessage({ protocol: 1, type: 'read', id, name } satisfies PythonBootRequest)
        } catch (error) {
          close(error instanceof Error ? error : new Error('Falha no canal Python.'))
        }
      })
    },
  }
}

let configured: ReturnType<typeof createPythonBootResourceReader> | undefined
/** Called once by the pinned bootstrap before loading any interpreter/analyzer code. */
export function configurePythonBootReader(port: MessagePort, directory: string) {
  if (configured) throw new Error('O leitor Python já foi configurado.')
  configured = createPythonBootResourceReader({ port, directory: new URL(directory) })
}
/** esbuild.inject substitutes only lexical references in the two pinned loader modules. */
export function resourceFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!configured) return Promise.reject(new Error('O leitor Python não foi configurado.'))
  return configured.fetch(input, init)
}
