import { createProtectedPythonWorker } from '../../packages/studio/src/runtime/python/protectedWorker'
import type {
  PythonWorkerCommand,
  PythonWorkerEvent,
} from '../../packages/studio/src/runtime/python/protocol'

/** Test transport only. Product supervisor and host authority are tested separately. */
interface Probe {
  events: PythonWorkerEvent[]
  command(command: PythonWorkerCommand): void
  prepare(fixture: string): Promise<void>
  stop(): void
}
declare global {
  var pythonProbe: Probe
}

let bootstrap: ReturnType<typeof createProtectedPythonWorker> | undefined
const events: PythonWorkerEvent[] = []
let active = true
let received = 0
function stop() {
  active = false
  bootstrap?.worker.terminate()
  bootstrap?.release()
  parent.postMessage({ type: 'python-probe-stopped', protocol: 1 }, '*')
}
function initialize(event: MessageEvent<unknown>) {
  if (
    event.source !== parent ||
    bootstrap ||
    event.ports.length !== 1 ||
    !event.data ||
    typeof event.data !== 'object' ||
    !('type' in event.data) ||
    event.data.type !== 'python-probe-boot-init' ||
    !('protocol' in event.data) ||
    event.data.protocol !== 1
  )
    return
  removeEventListener('message', initialize)
  if (!active) {
    event.ports[0]!.close()
    return
  }
  bootstrap = createProtectedPythonWorker('execution', event.ports[0]!)
  bootstrap.worker.addEventListener('message', (event) => {
    if (!active) return
    if (++received > 1000) {
      stop()
      throw new Error('Probe message quota')
    }
    // The probe accepts only our fixtures; this is deliberately not the product validator.
    events.push(event.data)
    if (event.data?.type === 'booted') bootstrap?.release()
  })
  bootstrap.worker.addEventListener('error', (event) => {
    events.push({ type: 'failed', message: event.message })
    stop()
  })
}
addEventListener('message', initialize)
addEventListener('pagehide', stop, { once: true })
parent.postMessage({ type: 'python-probe-boot-ready', protocol: 1 }, '*')
globalThis.pythonProbe = {
  events,
  command(command) {
    if (!bootstrap || !active) throw new Error('Probe worker not ready')
    bootstrap.worker.postMessage(command)
  },
  async prepare(fixture) {
    const response = await fetch(`/fixture/${encodeURIComponent(fixture)}`)
    if (!response.ok) throw new Error('Fixture unavailable')
    const snapshot = await response.json()
    for (const file of snapshot.files) file.bytes = new Uint8Array(file.bytes)
    if (!bootstrap || !active) throw new Error('Probe worker not ready')
    bootstrap.worker.postMessage({ type: 'prepare', snapshot })
  },
  stop,
}
