import { PYTHON_BOOT_LIMITS, type PythonBootResourceName } from './bootResourceContract'
import {
  capturePythonBootResourceManifest,
  pythonBootResourceManifestKey,
} from './bootResourceManifest'
import { type PythonBootResponse, readPythonBootRequest } from './bootResourceProtocol'

/** A per-owner capability for three public files. It never accepts an HTTP request or executable URL. */
export function createPythonBootResourceBroker(options: {
  port: MessagePort
  manifest: unknown
  signal: AbortSignal
  store: {
    readonly manifestKey: string
    read(name: PythonBootResourceName, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>>
  }
  onError(error: Error): void
}) {
  const manifest = capturePythonBootResourceManifest(options.manifest)
  const store = options.store
  if (store.manifestKey !== pythonBootResourceManifestKey(manifest))
    throw new Error('O cache pertence a outro manifesto de boot Python.')
  const { port, signal, onError } = options
  const read = store.read.bind(store)
  const controller = new AbortController()
  const lifetime = AbortSignal.any([signal, controller.signal])
  const files = new Map(manifest.files.map((file) => [file.name, file]))
  const requested = new Set<PythonBootResourceName>(),
    delivered = new Set<number>(),
    acknowledged = new Set<number>()
  let closed = false,
    sequence = 0
  const timer = setTimeout(
    () => fail(new Error('O carregamento dos arquivos Python demorou demais.')),
    PYTHON_BOOT_LIMITS.deadlineMs,
  )
  function close(message: PythonBootResponse) {
    if (closed) return
    closed = true
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
    controller.abort(new Error('Canal de arquivos Python encerrado.'))
    port.onmessage = null
    port.onmessageerror = null
    try {
      port.postMessage(message)
    } finally {
      port.close()
    }
  }
  function dispose() {
    close({ protocol: 1, type: 'failed', message: 'Canal de arquivos Python encerrado.' })
  }
  function abort() {
    dispose()
  }
  function fail(raw: unknown) {
    if (closed) return
    const error = raw instanceof Error ? raw : new Error('Falha ao carregar arquivos Python.')
    close({ protocol: 1, type: 'failed', message: error.message.slice(0, 300) })
    onError(error)
  }
  async function transfer(id: number, name: PythonBootResourceName) {
    const expected = files.get(name)
    if (!expected) throw new Error('Recurso Python não autorizado.')
    const bytes = await read(name, lifetime)
    if (closed || lifetime.aborted) return
    if (
      !(bytes instanceof Uint8Array) ||
      !(bytes.buffer instanceof ArrayBuffer) ||
      bytes.length !== expected.bytes
    )
      throw new Error('Bytes de boot Python inválidos.')
    const owned =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice()
    delivered.add(id)
    port.postMessage(
      { protocol: 1, type: 'resource', id, name, bytes: owned.buffer } satisfies PythonBootResponse,
      [owned.buffer],
    )
  }
  port.onmessageerror = () => fail(new Error('Mensagem de arquivos Python inválida.'))
  port.onmessage = (event: MessageEvent<unknown>) => {
    if (closed) return
    const message = readPythonBootRequest(event.data)
    if (!message) {
      fail(new Error('Pedido de arquivos Python inválido.'))
      return
    }
    if (message.type === 'ack') {
      if (!delivered.has(message.id) || acknowledged.has(message.id)) {
        fail(new Error('Confirmação de arquivos Python inválida.'))
        return
      }
      acknowledged.add(message.id)
      if (acknowledged.size === PYTHON_BOOT_LIMITS.requests)
        close({ protocol: 1, type: 'complete' })
      return
    }
    if (message.id !== sequence + 1 || requested.has(message.name)) {
      fail(new Error('Pedido de arquivos Python fora de ordem.'))
      return
    }
    sequence = message.id
    requested.add(message.name)
    void transfer(message.id, message.name).catch(fail)
  }
  port.start()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) dispose()
  return {
    get closed() {
      return closed
    },
    dispose,
  }
}
