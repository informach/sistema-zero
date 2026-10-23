import { isPythonChallenge } from '../../runtime/python/frameProtocol'
import { createProtectedPythonWorker } from '../../runtime/python/protectedWorker'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../../runtime/python/versions'
import limits from './limits.json'

const challenge = location.hash.slice(1)
let initialized = false
function initialize(event: MessageEvent<unknown>) {
  const value = event.data
  if (
    initialized ||
    event.source !== parent ||
    event.ports.length !== 2 ||
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    value.type !== 'python-analysis-init' ||
    !('challenge' in value) ||
    value.challenge !== challenge ||
    !('bootResources' in value) ||
    value.bootResources !== 1 ||
    !isPythonChallenge(challenge)
  )
    return
  initialized = true
  removeEventListener('message', initialize)
  const port = event.ports[0]!
  const resources = event.ports[1]!
  let bootstrap: ReturnType<typeof createProtectedPythonWorker> | undefined
  let active: number | undefined
  let latest = 0
  let closed = false
  let ready = false
  let timer: ReturnType<typeof setTimeout>
  function close() {
    if (closed) return
    closed = true
    clearTimeout(timer)
    bootstrap?.worker.terminate()
    bootstrap?.release()
    port.close()
    resources.close()
    removeEventListener('pagehide', close)
  }
  function fail(message: string) {
    if (closed) return
    port.postMessage({ type: 'failed', message })
    close()
  }
  timer = setTimeout(() => fail('O analisador demorou demais para iniciar.'), 30_000)
  addEventListener('pagehide', close, { once: true })
  port.onmessageerror = () => fail('Canal de análise inválido.')
  port.onmessage = (event: MessageEvent<unknown>) => {
    if (closed) return
    const value = event.data
    if (value && typeof value === 'object' && 'type' in value && value.type === 'dispose') {
      close()
      return
    }
    if (
      !ready ||
      active !== undefined ||
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      typeof value.id !== 'number' ||
      !Number.isSafeInteger(value.id) ||
      value.id !== latest + 1 ||
      !('payload' in value) ||
      typeof value.payload !== 'string' ||
      value.payload.length > limits.requestBytes
    ) {
      fail('Solicitação de análise fora de ordem.')
      return
    }
    active = latest = value.id
    // Deadline lives outside CPython's thread; a pathological parse cannot delay it.
    timer = setTimeout(() => fail('O código excedeu o tempo de análise visual.'), 3000)
    bootstrap!.worker.postMessage({ id: value.id, payload: value.payload })
  }
  port.start()
  try {
    bootstrap = createProtectedPythonWorker('analysis', resources)
    bootstrap.worker.addEventListener('error', () => fail('Falha do analisador Python.'))
    bootstrap.worker.addEventListener('messageerror', () =>
      fail('Resposta do analisador inválida.'),
    )
    bootstrap.worker.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (closed) return
      const result = event.data
      if (!result || typeof result !== 'object' || !('type' in result)) {
        fail('Resposta do analisador inválida.')
        return
      }
      if (result.type === 'ready' && !ready && active === undefined) {
        if (
          !('pythonVersion' in result) ||
          result.pythonVersion !== PYTHON_VERSION ||
          !('pyodideVersion' in result) ||
          result.pyodideVersion !== PYODIDE_VERSION
        ) {
          fail('A versão efetiva do compilador Python não corresponde à distribuição.')
          return
        }
        clearTimeout(timer)
        bootstrap!.release()
        ready = true
        port.postMessage({
          type: 'ready',
          pythonVersion: result.pythonVersion,
          pyodideVersion: result.pyodideVersion,
        })
      } else if (
        result.type === 'result' &&
        ready &&
        active !== undefined &&
        'id' in result &&
        result.id === active &&
        'payload' in result &&
        typeof result.payload === 'string' &&
        result.payload.length <= limits.responseBytes
      ) {
        clearTimeout(timer)
        active = undefined
        port.postMessage({ type: 'result', id: result.id, payload: result.payload })
      } else fail('Resposta do analisador fora de ordem.')
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Analisador indisponível.')
  }
}
if (parent !== window && isPythonChallenge(challenge)) {
  addEventListener('message', initialize)
  parent.postMessage({ type: 'python-analysis-ready', challenge, bootResources: 1 }, '*')
}
