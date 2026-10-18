import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'
import type * as Monaco from 'monaco-editor'
import { isModelInPathPrefix } from '../../monaco/modelPaths'

type Formatter = ReturnType<typeof createFormatter>
const scopes = new Map<string, Formatter>()
let registration: Monaco.IDisposable | undefined
function createFormatter() {
  let worker: Worker | undefined,
    sequence = 0,
    disposed = false
  let cancel: (() => void) | undefined
  return {
    format(source: string, token: Monaco.CancellationToken): Promise<string> {
      if (disposed || token.isCancellationRequested)
        return Promise.reject(new DOMException('Formatação cancelada.', 'AbortError'))
      if (cancel) return Promise.reject(new Error('Aguarde a organização do código em andamento.'))
      if (new TextEncoder().encode(source).length > PYTHON_LANGUAGE_LIMITS.maxFileBytes)
        return Promise.reject(new Error('Este arquivo ultrapassou o limite de formatação Python.'))
      worker ??= new Worker(new URL('./format.worker.ts', import.meta.url), {
        type: 'module',
        name: 'studio-python-format',
      })
      const target = worker,
        id = ++sequence
      return new Promise((resolve, reject) => {
        let settled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        let subscription: Monaco.IDisposable | undefined
        const finish = (value?: string, error?: Error, terminate = false) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          subscription?.dispose()
          cancel = undefined
          target.removeEventListener('message', onMessage)
          target.removeEventListener('error', onError)
          if (terminate) {
            target.terminate()
            if (worker === target) worker = undefined
          }
          if (error) reject(error)
          else resolve(value!)
        }
        const onMessage = (event: MessageEvent<unknown>) => {
          const data = event.data
          if (!data || typeof data !== 'object' || !('id' in data) || data.id !== id) return
          if ('value' in data && typeof data.value === 'string') finish(data.value)
          else
            finish(
              undefined,
              new Error(
                'error' in data && typeof data.error === 'string'
                  ? data.error
                  : 'Não foi possível organizar o código Python.',
              ),
            )
        }
        const onError = () =>
          finish(
            undefined,
            new Error('O formatador Python não pôde ser carregado. Tente novamente.'),
            true,
          )
        timer = setTimeout(
          () =>
            finish(
              undefined,
              new Error('A formatação demorou demais. O código original foi mantido.'),
              true,
            ),
          8000,
        )
        cancel = () =>
          finish(undefined, new DOMException('O editor foi fechado.', 'AbortError'), true)
        target.addEventListener('message', onMessage)
        target.addEventListener('error', onError)
        subscription = token.onCancellationRequested(() =>
          finish(undefined, new DOMException('Formatação cancelada.', 'AbortError'), true),
        )
        if (settled) subscription.dispose()
        else if (token.isCancellationRequested) cancel()
        else {
          try {
            target.postMessage({ id, source })
          } catch {
            onError()
          }
        }
      })
    },
    dispose() {
      disposed = true
      cancel?.()
      worker?.terminate()
      worker = undefined
    },
  }
}

/** Formatting is local, explicit, and independent of the optional remote language service. */
export function attachPythonFormatter(monaco: typeof Monaco, prefix: string) {
  if (scopes.has(prefix)) throw new Error('Este editor já possui um formatador Python.')
  const formatter = createFormatter()
  scopes.set(prefix, formatter)
  registration ??= monaco.languages.registerDocumentFormattingEditProvider('python', {
    async provideDocumentFormattingEdits(model, _options, token) {
      const scope = [...scopes].find(([prefix]) => isModelInPathPrefix(model, prefix))
      if (!scope || model.isDisposed() || token.isCancellationRequested) return []
      const version = model.getVersionId(),
        source = model.getValue()
      try {
        const value = await scope[1].format(source, token)
        if (
          scopes.get(scope[0]) !== scope[1] ||
          model.isDisposed() ||
          model.getVersionId() !== version ||
          token.isCancellationRequested ||
          model.getValue() !== source
        )
          return []
        return value === source ? [] : [{ range: model.getFullModelRange(), text: value }]
      } catch (error) {
        if (
          token.isCancellationRequested ||
          model.isDisposed() ||
          scopes.get(scope[0]) !== scope[1]
        )
          return []
        throw error
      }
    },
  })
  return {
    dispose() {
      if (scopes.get(prefix) !== formatter) return
      scopes.delete(prefix)
      formatter.dispose()
      if (!scopes.size) {
        registration?.dispose()
        registration = undefined
      }
    },
  }
}
