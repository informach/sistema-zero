import { STUDIO_PYTHON_STRUCTURE_LIMITS } from '@sistemazero/core/studio/python-structure-limits'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../../runtime/python/versions'
import source from './analyzer.py'
import limits from './limits.json'

interface Callable {
  (...args: string[]): unknown
  destroy(): void
}
interface Service {
  request: Callable
  destroy(): void
}
interface AnalyzerRuntime {
  version: string
  runPython(source: string): unknown
}
interface AnalyzerModule {
  loadPyodide(options: {
    indexURL: string
    stdout(text: string): void
    stderr(text: string): void
  }): Promise<AnalyzerRuntime>
}
const send = globalThis.postMessage.bind(globalThis)
let busy = false
let failed = false
try {
  const base = new URL('./', import.meta.url)
  const module: AnalyzerModule = await import(/* @vite-ignore */ new URL('pyodide.mjs', base).href)
  const runtime = await module.loadPyodide({ indexURL: base.href, stdout() {}, stderr() {} })
  if (
    runtime.version !== PYODIDE_VERSION ||
    runtime.runPython('import platform; platform.python_version()') !== PYTHON_VERSION
  )
    throw new Error('A versão do analisador não corresponde à distribuição.')
  const factory = runtime.runPython(source) as Callable
  const service = factory(
    JSON.stringify({ ...limits, structure: STUDIO_PYTHON_STRUCTURE_LIMITS }),
  ) as Service
  factory.destroy()
  const request = service.request
  addEventListener('message', (event: MessageEvent<unknown>) => {
    if (failed) return
    const value = event.data
    if (
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      !Number.isSafeInteger(value.id) ||
      !('payload' in value) ||
      typeof value.payload !== 'string' ||
      value.payload.length > limits.requestBytes ||
      busy
    ) {
      failed = true
      send({ type: 'failed', message: 'Solicitação de análise inválida.' })
      return
    }
    busy = true
    try {
      const result = request(value.payload)
      if (typeof result !== 'string' || result.length > limits.responseBytes)
        throw new Error('Resposta de análise inválida.')
      send({ type: 'result', id: value.id, payload: result })
    } catch (error) {
      send({
        type: 'result',
        id: value.id,
        payload: JSON.stringify({
          ok: false,
          message:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : 'Não foi possível analisar o código.',
        }),
      })
    } finally {
      busy = false
    }
  })
  send({ type: 'ready', pythonVersion: PYTHON_VERSION, pyodideVersion: runtime.version })
} catch (error) {
  failed = true
  send({
    type: 'failed',
    message: error instanceof Error ? error.message.slice(0, 2000) : 'Analisador indisponível.',
  })
}
