import { loadPyodide } from './pyodide.mjs'

let runtime
let busy = false
let turtleInstalled = false
let nextDrawId = 0
const pendingDraws = new Map()
let pendingInput
let nextInputId = 0
const started = performance.now()
globalThis.l0Delay = (milliseconds, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), milliseconds))
globalThis.l0Pump = (commands, delay) =>
  new Promise((resolve) => {
    const id = ++nextDrawId
    pendingDraws.set(id, resolve)
    postMessage({ type: 'draw', id, commands, delay })
  })
globalThis.l0Readline = () => {
  if (pendingInput) return Promise.reject(new Error('Only one stdin request is supported'))
  return new Promise((resolve) => {
    const id = ++nextInputId
    pendingInput = { id, resolve }
    postMessage({ type: 'stdin', id })
  })
}
try {
  runtime = await loadPyodide({
    indexURL: new URL('./', import.meta.url).href,
    stdout: (text) => postMessage({ type: 'stdout', text }),
    stderr: (text) => postMessage({ type: 'stderr', text }),
  })
  const stdio = await fetch(new URL('./stdio.py', import.meta.url))
  if (!stdio.ok) throw new Error(`Standard input adapter: HTTP ${stdio.status}`)
  runtime.runPython(await stdio.text())
  postMessage({
    type: 'ready',
    boot: {
      python: runtime.runPython('import sys; sys.version'),
      pyodide: runtime.version,
      jspi:
        typeof WebAssembly.Suspending === 'function' && typeof WebAssembly.promising === 'function',
      elapsedMs: performance.now() - started,
      crossOriginIsolated: globalThis.crossOriginIsolated,
    },
  })
} catch (error) {
  postMessage({ type: 'boot-error', error: String(error) })
}

addEventListener('message', async (event) => {
  const message = event.data
  if (message?.type === 'stdin-result') {
    if (
      pendingInput?.id === message.id &&
      (message.line === null ||
        (typeof message.line === 'string' &&
          message.line.length <= 4096 &&
          !/[\r\n]/.test(message.line)))
    ) {
      const { resolve } = pendingInput
      pendingInput = undefined
      resolve(JSON.stringify({ line: message.line }))
    }
    return
  }
  if (message?.type === 'draw-complete' && Number.isSafeInteger(message.id)) {
    const resolve = pendingDraws.get(message.id)
    if (resolve) {
      pendingDraws.delete(message.id)
      resolve(JSON.stringify(message.events))
    }
    return
  }
  if (
    !runtime ||
    busy ||
    message?.type !== 'run' ||
    !Number.isSafeInteger(message.id) ||
    typeof message.code !== 'string' ||
    message.code.length > 20_000
  )
    return
  busy = true
  const began = performance.now()
  try {
    if (message.interruptBuffer instanceof Uint8Array)
      runtime.setInterruptBuffer(message.interruptBuffer)
    if (message.turtle && !turtleInstalled) {
      const response = await fetch(new URL('./turtle.py', import.meta.url))
      if (!response.ok) throw new Error(`Turtle feasibility module: HTTP ${response.status}`)
      runtime.FS.mkdirTree('/l0-extensions')
      runtime.FS.writeFile('/l0-extensions/turtle.py', await response.text())
      runtime.runPython('import sys\nsys.path.insert(0, "/l0-extensions")')
      turtleInstalled = true
    }
    const result = await runtime.runPythonAsync(message.code)
    if (result && typeof result.destroy === 'function') result.destroy()
    postMessage({ type: 'result', id: message.id, ok: true, elapsedMs: performance.now() - began })
  } catch (error) {
    postMessage({
      type: 'result',
      id: message.id,
      ok: false,
      error: String(error),
      elapsedMs: performance.now() - began,
    })
  } finally {
    busy = false
  }
})
