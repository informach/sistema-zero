import { createPreviewProbe } from '../../packages/studio/e2e-runtime/fixtures/previewHost'
import { decodeProjectAsset, digestAssetBytes } from '../../packages/studio/src/core/assetBinary'
import { createPythonRuntimeProvider } from '../../packages/studio/src/runtime/python/provider'
import { preparePythonExecutionSnapshot } from '../../packages/studio/src/runtime/python/snapshot'
import type {
  StudioRuntimeEvent,
  StudioRuntimeInput,
  StudioRuntimeSession,
} from '../../packages/studio/src/runtime/types'
import { createControllerProbe } from './controllerHost'

interface Entry {
  frame: HTMLIFrameElement
  abort: AbortController
  events: StudioRuntimeEvent[]
  status: string
  error?: string
  session?: StudioRuntimeSession
}
const entries = new Map<string, Entry>()
const configuration = await (await fetch('/configuration')).json()
// The project's game storage, in memory for this page (the real one is state/gameStorage.ts).
const savedRecords = new Map<string, Record<string, string>>()
const provider = createPythonRuntimeProvider({
  id: 'python-integration-probe',
  savedFiles: (projectId) => ({
    load: async () => ({ ...(savedRecords.get(projectId) ?? {}) }),
    write: async (data) => {
      savedRecords.set(projectId, { ...data })
    },
  }),
  allowedOrigins: [new URL(configuration.providerFrameURL).origin],
  // Local qualification fixture, not approval of a production catalog release.
  async resolveFrame(selection) {
    if (
      selection.manifestSha256 !== configuration.runtime.manifestSha256 ||
      selection.profileId !== configuration.runtime.profileId ||
      selection.releaseId !== configuration.runtime.releaseId
    )
      throw new Error('Unknown qualification release')
    return {
      url: configuration.providerFrameURL,
      runtimeManifestSha256: configuration.runtime.manifestSha256,
    }
  },
})
function get(slot: string) {
  const entry = entries.get(slot)
  if (!entry) throw new Error('Unknown probe slot')
  return entry
}
const api = {
  decodeMaterial: decodeProjectAsset,
  async measureMaterials(fixture: string) {
    const project = await (await fetch(`/project/${encodeURIComponent(fixture)}`)).json()
    const samples: number[] = []
    let decoded: { mime: string; bytes: Uint8Array<ArrayBuffer> }[] = []
    for (let run = 0; run < 13; run++) {
      const start = performance.now()
      decoded = project.assets.map((asset: { dataUrl: string }) =>
        decodeProjectAsset(asset.dataUrl),
      )
      if (run >= 3) samples.push(performance.now() - start)
      // Separate the measured CPU batches from disposal/GC and allow the host to paint.
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    return {
      samples,
      golden: await Promise.all(
        decoded.map(async ({ mime, bytes }, index) => ({
          path: project.assets[index].proPath,
          mime,
          bytes: bytes.byteLength,
          sha256: await digestAssetBytes(bytes),
        })),
      ),
    }
  },
  async prepare(slot: string, fixture: string, mismatch = false) {
    const previous = entries.get(slot)
    if (previous) {
      await previous.session?.dispose()
      previous.abort.abort()
      previous.frame.remove()
    }
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const entry: Entry = { frame, abort: new AbortController(), events: [], status: 'loading' }
    entries.set(slot, entry)
    try {
      const project = await (await fetch(`/project/${encodeURIComponent(fixture)}`)).json()
      const snapshot = await preparePythonExecutionSnapshot(project)
      const session = await provider.prepare({
        project,
        signal: entry.abort.signal,
        frame,
        identity: {
          projectId: snapshot.projectId,
          revision: mismatch ? 'b'.repeat(64) : snapshot.revision,
          runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
          instanceId: slot,
          runId: crypto.randomUUID(),
          writerEpoch: null,
        },
      })
      entry.session = session
      entry.status = 'ready'
      if (slot === 'audio') {
        for (const previous of document.querySelectorAll('[data-audio-control]')) previous.remove()
        for (const [name, label, action] of [
          ['start', 'Jogar', () => session.run()],
          ['stop', 'Parar', () => session.stop()],
        ] as const) {
          const button = document.createElement('button')
          button.dataset.audioControl = name
          button.textContent = label
          button.addEventListener(
            'click',
            () => {
              void action().catch((error: unknown) => {
                entry.status = 'failed'
                entry.error = String(error)
              })
            },
            { signal: entry.abort.signal },
          )
          frame.before(button)
        }
      }
      session.subscribe((event) => {
        if (entry.events.length < 2048) entry.events.push(event)
        if (event.type === 'state') entry.status = event.state
        else if (event.type === 'failed') {
          entry.status = 'failed'
          entry.error = event.message
        }
      })
    } catch (error) {
      entry.status = 'failed'
      entry.error = String(error)
    }
  },
  run(slot: string) {
    return get(slot).session!.run()
  },
  capture(slot: string) {
    return get(slot).session!.captureSnapshot!()
  },
  async overlap(slot: string) {
    const entry = get(slot)
    const project = await (await fetch('/project/portable')).json()
    const snapshot = await preparePythonExecutionSnapshot(project)
    try {
      await provider.prepare({
        project,
        frame: entry.frame,
        signal: entry.abort.signal,
        identity: {
          ...entry.session!.identity,
          revision: snapshot.revision,
          runId: crypto.randomUUID(),
        },
      })
      return 'unexpected success'
    } catch (error) {
      return String(error)
    }
  },
  evaluate(slot: string, requestId: string, source: string) {
    const repl = get(slot).session!.repl
    if (repl.kind !== 'python') throw new Error('No REPL')
    return repl.evaluate({ requestId, source })
  },
  input(slot: string, requestId: string, response: StudioRuntimeInput) {
    return get(slot).session!.provideInput(requestId, response)
  },
  cancel(slot: string) {
    get(slot).abort.abort()
  },
  async stop(slot: string) {
    await get(slot).session!.stop()
  },
  async dispose(slot: string) {
    const entry = get(slot)
    await entry.session?.dispose()
    entry.abort.abort()
    entry.frame.remove()
  },
  savedKeys() {
    return [...savedRecords.values()].flatMap((record) => Object.keys(record)).sort()
  },
  read(slot: string) {
    const { events, status, error, frame } = get(slot)
    return { events, status, error, frameURL: frame.src }
  },
}
declare global {
  var providerProbe: typeof api
}
globalThis.providerProbe = api
globalThis.pythonControllerProbe = await createControllerProbe(provider)
globalThis.pythonPreviewProbe = await createPreviewProbe(provider)
