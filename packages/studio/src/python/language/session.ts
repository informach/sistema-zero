import { isStudioPortablePath } from '@sistemazero/core/studio/project-environment'
import { isStudioProjectId } from '@sistemazero/core/studio/project-format'
import { createPythonBootResourceBroker } from '../../runtime/python/bootResourceBroker'
import { preparePythonBootResourceHost } from '../../runtime/python/bootResourceHost'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../../runtime/python/versions'
import { readPythonAnalysisResult } from './readResult'
import {
  PYTHON_ANALYSIS_LIMITS as limits,
  type PythonAnalysisIdentity,
  type PythonAnalysisRequest,
  type PythonAnalysisResult,
  type PythonByteCompilation,
  type PythonNode,
  type PythonParsedDocument,
} from './types'

const owners = new WeakMap<HTMLIFrameElement, symbol>()
const cancelled = () => new DOMException('Análise cancelada.', 'AbortError')

export interface PythonAnalysisSession {
  readonly closed: boolean
  readonly interpreter: Readonly<{ pythonVersion: string; pyodideVersion: string }>
  compileBytes(
    identity: PythonAnalysisIdentity,
    bytes: Uint8Array,
    signal: AbortSignal | undefined,
    options: { structure: boolean },
  ): Promise<PythonByteCompilation>
  parse(
    identity: PythonAnalysisIdentity,
    source: string,
    signal?: AbortSignal,
    options?: { compilable?: boolean },
  ): Promise<PythonParsedDocument>
  render(node: PythonNode, signal?: AbortSignal): Promise<string>
  dispose(): void
}

/** One analysis iframe per editor instance; never runs the learner's program. */
export function preparePythonAnalysisSession(options: {
  frame: HTMLIFrameElement
  /** URL resolved from the host's approved distribution, never a source import. */
  url: string
  allowedOrigins: readonly string[]
  /** Host-captured pin for the private boot protocol. */
  runtimeManifestSha256: string
  signal: AbortSignal
}): Promise<PythonAnalysisSession> {
  const { frame, signal } = options
  const runtimeHash = options.runtimeManifestSha256
  if (signal.aborted) return Promise.reject(cancelled())
  let url: URL
  try {
    url = new URL(options.url)
    if (
      !/^[a-f0-9]{64}$/.test(runtimeHash) ||
      !options.allowedOrigins.includes(url.origin) ||
      url.origin === location.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.endsWith('/analysis.html') ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    )
      throw new Error('Distribuição de análise não aprovada.')
  } catch (error) {
    return Promise.reject(error)
  }
  if (!frame.isConnected || owners.has(frame))
    return Promise.reject(new Error('A área de análise não está disponível.'))
  const owner = Symbol('python-analysis')
  owners.set(frame, owner)
  const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  url.hash = challenge
  let port: MessagePort | undefined
  const bootOwner = new AbortController()
  const bootSignal = AbortSignal.any([signal, bootOwner.signal])
  let bootBroker: ReturnType<typeof createPythonBootResourceBroker> | undefined
  let closed = false
  let ready = false
  let sequence = 0
  let pending:
    | {
        id: number
        resolve(result: PythonAnalysisResult): void
        reject(error: unknown): void
        sourceLength: number
        cleanup(): void
      }
    | undefined
  return new Promise((resolve, reject) => {
    const bootTimer = setTimeout(
      () => close(new Error('O analisador demorou demais para iniciar.')),
      35_000,
    )
    function close(error: unknown = cancelled()) {
      if (closed) return
      closed = true
      bootOwner.abort(error)
      bootBroker?.dispose()
      clearTimeout(bootTimer)
      removeEventListener('message', initialize)
      signal.removeEventListener('abort', abort)
      port?.postMessage({ type: 'dispose' })
      port?.close()
      const waiting = pending
      pending = undefined
      waiting?.cleanup()
      waiting?.reject(error)
      if (owners.get(frame) === owner) {
        owners.delete(frame)
        frame.removeAttribute('srcdoc')
        frame.src = 'about:blank'
      }
      reject(error)
    }
    const abort = () => close(cancelled())
    signal.addEventListener('abort', abort, { once: true })
    function request(
      input: PythonAnalysisRequest,
      sourceLength: number,
      operationSignal?: AbortSignal,
    ): Promise<PythonAnalysisResult> {
      if (closed || !ready || operationSignal?.aborted) return Promise.reject(cancelled())
      if (pending) return Promise.reject(new Error('O analisador está ocupado.'))
      const payload = JSON.stringify(input)
      if (new TextEncoder().encode(payload).byteLength > limits.requestBytes)
        return Promise.reject(new Error('A análise excede o limite de tamanho.'))
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => close(new Error('O código excedeu o tempo de análise visual.')),
          5000,
        )
        const cancel = () => close(cancelled())
        operationSignal?.addEventListener('abort', cancel, { once: true })
        const id = ++sequence
        pending = {
          id,
          resolve,
          reject,
          sourceLength,
          cleanup() {
            clearTimeout(timer)
            operationSignal?.removeEventListener('abort', cancel)
          },
        }
        try {
          port!.postMessage({ id, payload })
        } catch (error) {
          close(error)
        }
      })
    }
    const session: PythonAnalysisSession = {
      get closed() {
        return closed
      },
      interpreter: Object.freeze({
        pythonVersion: PYTHON_VERSION,
        pyodideVersion: PYODIDE_VERSION,
      }),
      async compileBytes(identity, bytes, operationSignal, options) {
        if (typeof options?.structure !== 'boolean')
          throw new Error('A compilação exige uma escolha explícita de estrutura.')
        const structureRequested = options.structure
        const captured = { ...identity }
        if (
          !isStudioProjectId(captured.projectId) ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(captured.instanceId) ||
          !isStudioPortablePath(captured.path) ||
          !/^[a-f0-9]{64}$/.test(captured.revision) ||
          !Number.isSafeInteger(captured.generation) ||
          captured.generation < 0 ||
          bytes.byteLength > limits.sourceBytes
        )
          throw new Error('Identidade ou bytes de compilação inválidos.')
        let binary = ''
        for (const byte of bytes) binary += String.fromCharCode(byte)
        const result = await request(
          {
            operation: structureRequested ? 'structure' : 'compile',
            path: captured.path,
            bytesBase64: btoa(binary),
          },
          0,
          operationSignal,
        )
        if (!result.ok) throw new Error(result.message)
        if (!('compiledBytes' in result) || result.compiledBytes !== true)
          throw new Error('O analisador não confirmou a compilação dos bytes originais.')
        if (structureRequested && !result.diagnostics.length && !result.structure)
          throw new Error('O analisador não confirmou a estrutura dos bytes originais.')
        return {
          identity: captured,
          diagnostics: result.diagnostics,
          ...(result.structure ? { structure: result.structure } : {}),
        }
      },
      async parse(identity, source, operationSignal, parseOptions) {
        const captured = { ...identity }
        if (
          !isStudioProjectId(captured.projectId) ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(captured.instanceId) ||
          !isStudioPortablePath(captured.path) ||
          !/^[a-f0-9]{64}$/.test(captured.revision) ||
          !Number.isSafeInteger(captured.generation) ||
          captured.generation < 0 ||
          new TextEncoder().encode(source).byteLength > limits.sourceBytes
        )
          throw new Error('Identidade ou fonte de análise inválida.')
        const result = await request(
          { operation: 'parse', path: captured.path, source, compilable: parseOptions?.compilable },
          source.length,
          operationSignal,
        )
        if (!result.ok) throw new Error(result.message)
        if (!('tree' in result)) throw new Error('Resposta de análise incompatível.')
        if (parseOptions?.compilable && result.tree && result.compilable !== true)
          throw new Error(
            'Este analisador não confirmou a compilação da mudança. Seus arquivos foram preservados.',
          )
        return {
          version: 1,
          language: 'python',
          identity: captured,
          source,
          tree: result.tree,
          tokens: result.tokens,
          diagnostics: result.diagnostics,
        }
      },
      async render(node, operationSignal) {
        const result = await request({ operation: 'render', node }, 0, operationSignal)
        if (!result.ok) throw new Error(result.message)
        if (!('source' in result)) throw new Error('Resposta de geração incompatível.')
        return result.source
      },
      dispose() {
        close()
      },
    }
    async function initialize(event: MessageEvent<unknown>) {
      if (closed || port || event.source !== frame.contentWindow || event.origin !== 'null') return
      const value = event.data
      if (
        !value ||
        typeof value !== 'object' ||
        !('type' in value) ||
        value.type !== 'python-analysis-ready' ||
        !('challenge' in value) ||
        value.challenge !== challenge
      )
        return
      if (!('bootResources' in value) || value.bootResources !== 1) {
        close(new Error('Protocolo ou pin de carregamento Python incompatível.'))
        return
      }
      removeEventListener('message', initialize)
      const channel = new MessageChannel()
      port = channel.port1
      port.onmessageerror = () => close(new Error('Canal de análise inválido.'))
      port.onmessage = (event: MessageEvent<unknown>) => {
        if (closed) return
        const value = event.data
        if (!value || typeof value !== 'object' || !('type' in value)) {
          close(new Error('Resposta de análise inválida.'))
          return
        }
        if (value.type === 'ready' && !ready) {
          if (
            !('pythonVersion' in value) ||
            value.pythonVersion !== PYTHON_VERSION ||
            !('pyodideVersion' in value) ||
            value.pyodideVersion !== PYODIDE_VERSION
          ) {
            close(
              new Error('A versão efetiva do compilador Python não corresponde à distribuição.'),
            )
            return
          }
          clearTimeout(bootTimer)
          ready = true
          resolve(session)
        } else if (
          value.type === 'result' &&
          pending &&
          'id' in value &&
          value.id === pending.id &&
          'payload' in value &&
          typeof value.payload === 'string'
        ) {
          const waiting = pending
          try {
            const result = readPythonAnalysisResult(value.payload, waiting.sourceLength)
            pending = undefined
            waiting.cleanup()
            waiting.resolve(result)
          } catch (error) {
            close(error)
          }
        } else close(new Error('O analisador foi encerrado ou respondeu fora de ordem.'))
      }
      port.start()
      let resourcePort: MessagePort | undefined
      try {
        const host = await preparePythonBootResourceHost({
          frameURL: new URL('analysis.html', url),
          runtimeManifestSha256: runtimeHash,
          signal: bootSignal,
        })
        if (closed || bootSignal.aborted) {
          channel.port2.close()
          return
        }
        const resources = new MessageChannel()
        resourcePort = resources.port2
        bootBroker = createPythonBootResourceBroker({
          port: resources.port1,
          manifest: host.manifest,
          store: host.store,
          signal: bootSignal,
          onError: (error) => close(error),
        })
        frame.contentWindow!.postMessage(
          {
            type: 'python-analysis-init',
            challenge,
            bootResources: 1,
          },
          '*',
          [channel.port2, resourcePort],
        )
      } catch (error) {
        channel.port2.close()
        resourcePort?.close()
        close(error)
      }
    }
    addEventListener('message', initialize)
    // Analysis has no ambient credentials and must also embed under the Pro host's COEP.
    frame.setAttribute('credentialless', '')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.referrerPolicy = 'no-referrer'
    frame.removeAttribute('srcdoc')
    frame.src = url.href
  })
}
