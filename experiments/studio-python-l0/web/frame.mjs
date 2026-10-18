// Isolated feasibility harness, not the production execution protocol.
const workerUrl = new URL('./worker.mjs', import.meta.url).href
const mode = new URL(location.href).searchParams.get('mode')
const protectedWorkers = new URL(location.href).searchParams.get('protected') === '1'
let worker
let nextId = 0
let generation = 0
let blobUrl
let interruptBuffer
let bootstrapPolicy
const pending = new Map()
const state = { status: 'booting', mode, events: [], boot: null, inputId: null }
const maximumLogEntries = 100
let renderer
let rendererPromise

async function getRenderer() {
  if (!rendererPromise)
    rendererPromise = import('./renderer.mjs').then((module) => {
      renderer = module.createRenderer()
      return renderer
    })
  return rendererPromise
}

function releaseBlob() {
  if (blobUrl) URL.revokeObjectURL(blobUrl)
  blobUrl = undefined
}

function errorText(error) {
  if (typeof error === 'string') return error.slice(0, 4000)
  if (error instanceof Error && typeof error.message === 'string')
    return error.message.slice(0, 4000)
  return 'Invalid runtime error payload'
}

function terminateWorker() {
  // Official Pyodide interruption is an optional accelerator. The worker is
  // always terminated as well: Python may catch or ignore KeyboardInterrupt.
  if (interruptBuffer) Atomics.store(interruptBuffer, 0, 2)
  worker?.terminate()
  worker = undefined
  interruptBuffer = undefined
}

function fail(error) {
  ++generation
  state.status = 'failed'
  state.error = errorText(error)
  terminateWorker()
  releaseBlob()
  renderer?.stop()
  for (const completion of pending.values()) completion({ ok: false, error: state.error })
  pending.clear()
  state.inputId = null
}

function start() {
  if (worker) throw new Error('Stop the previous generation before starting')
  renderer?.stop()
  state.status = 'booting'
  state.error = undefined
  state.boot = null
  state.events = []
  state.inputId = null
  const currentGeneration = ++generation
  interruptBuffer =
    globalThis.crossOriginIsolated && typeof SharedArrayBuffer === 'function'
      ? new Uint8Array(new SharedArrayBuffer(1))
      : undefined
  let messageWindowStarted = performance.now()
  let messageCount = 0
  let drawInFlight = false
  try {
    if (protectedWorkers && mode !== 'blob-classic')
      throw new Error('Protected workers require the qualified classic bootstrap')
    if (protectedWorkers && !bootstrapPolicy) {
      bootstrapPolicy = trustedTypes.createPolicy('sz-python-bootstrap', {
        createScriptURL(url) {
          if (!blobUrl || url !== blobUrl)
            throw new TypeError('Only the active bootstrap is allowed')
          return url
        },
      })
    }
    const source =
      mode === 'blob-inline'
        ? 'postMessage({type: "ready", boot: {control: true}})'
        : mode === 'blob-classic'
          ? `${protectedWorkers ? "trustedTypes.createPolicy('sz-python-bootstrap', {});" : ''}import(${JSON.stringify(workerUrl)}).catch(error => postMessage({type: 'boot-error', error: String(error)}))`
          : `import ${JSON.stringify(workerUrl)}`
    if (mode !== 'direct')
      blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    const url = mode === 'direct' ? workerUrl : blobUrl
    worker = new Worker(bootstrapPolicy ? bootstrapPolicy.createScriptURL(url) : url, {
      type: mode === 'blob-classic' ? 'classic' : 'module',
    })
    worker.addEventListener('message', (event) => {
      if (currentGeneration !== generation) return
      const now = performance.now()
      if (now - messageWindowStarted >= 1000) {
        messageWindowStarted = now
        messageCount = 0
      }
      // All worker output is untrusted: Python can call postMessage via FFI.
      // This L0 boundary budget is measured independently of stdout cooperation.
      if (++messageCount > 1000) {
        fail('L0 message quota exceeded')
        return
      }
      if (!event.data || typeof event.data !== 'object') return
      const message = event.data
      if (message.type === 'ready') {
        state.status = 'ready'
        state.boot = message.boot
        releaseBlob()
      } else if (message.type === 'boot-error') {
        fail(message.error)
      } else if (message.type === 'stdout' || message.type === 'stderr') {
        if (typeof message.text !== 'string') {
          fail('Invalid console payload')
          return
        }
        if (state.events.length < maximumLogEntries)
          state.events.push({ type: message.type, text: String(message.text).slice(0, 4000) })
      } else if (message.type === 'stdin' && Number.isSafeInteger(message.id)) {
        if (state.inputId !== null) {
          fail('Concurrent stdin requests')
          return
        }
        state.inputId = message.id
      } else if (message.type === 'draw' && Number.isSafeInteger(message.id)) {
        if (drawInFlight) {
          fail('Concurrent drawing requests')
          return
        }
        if (typeof message.commands !== 'string' || message.commands.length > 1_000_000) {
          fail('Invalid drawing payload')
          return
        }
        drawInFlight = true
        getRenderer()
          .then((activeRenderer) => {
            if (currentGeneration !== generation) return
            activeRenderer.draw(JSON.parse(message.commands), message.delay, (events) => {
              if (currentGeneration === generation) {
                drawInFlight = false
                worker?.postMessage({ type: 'draw-complete', id: message.id, events })
              }
            })
          })
          .catch((error) => {
            if (currentGeneration === generation) fail(error)
          })
      } else if (message.type === 'result' && Number.isSafeInteger(message.id)) {
        const completion = pending.get(message.id)
        if (!completion) return
        if (message.error !== undefined && typeof message.error !== 'string') {
          fail('Invalid runtime error payload')
          return
        }
        pending.delete(message.id)
        state.status = 'ready'
        completion({
          ok: message.ok === true,
          error: (message.error ?? '').slice(0, 4000),
          elapsedMs: message.elapsedMs,
        })
      }
    })
    worker.addEventListener('error', (event) => {
      if (currentGeneration !== generation) return
      fail(event.message || 'Worker failed without a message')
    })
  } catch (error) {
    fail(error)
  }
}

function run(code, options = {}) {
  if (state.status !== 'ready' || !worker) throw new Error('Worker is not ready')
  if (typeof code !== 'string' || code.length > 20_000) throw new Error('Invalid probe')
  state.status = 'running'
  state.events = []
  const id = ++nextId
  return new Promise((resolve) => {
    pending.set(id, resolve)
    worker.postMessage({ type: 'run', id, code, turtle: options.turtle === true, interruptBuffer })
  })
}

function stop() {
  const started = performance.now()
  ++generation
  terminateWorker()
  releaseBlob()
  renderer?.stop()
  for (const completion of pending.values()) completion({ ok: false, error: 'stopped' })
  pending.clear()
  state.status = 'stopped'
  state.inputId = null
  return performance.now() - started
}

globalThis.l0 = {
  state,
  start,
  run,
  stop,
  inputKey: (key) => renderer?.inputKey(key),
  graphics: () => (renderer ? { ...renderer.stats } : null),
  resetGraphics: () => renderer?.reset(),
  submitLine: (line) => {
    if (state.inputId === null) throw new Error('No pending stdin request')
    if (line !== null && (typeof line !== 'string' || line.length > 4096 || /[\r\n]/.test(line)))
      throw new Error('Invalid input line')
    const id = state.inputId
    state.inputId = null
    worker?.postMessage({ type: 'stdin-result', id, line })
  },
}
start()
