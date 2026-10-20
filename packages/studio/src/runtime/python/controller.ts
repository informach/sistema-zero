import {
  type StudioPythonActivity,
  StudioPythonActivitySchema,
  verifyStudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../environment'
import { assertStudioRuntimeExecutionAccess, assertStudioRuntimeOperationAccess } from '../registry'
import type {
  StudioExecutionIdentity,
  StudioRuntimeEvent,
  StudioRuntimeInput,
  StudioRuntimeSession,
  StudioRuntimeSnapshot,
} from '../types'
import { samePythonExecutionIdentity } from './frameProtocol'
import { preparePythonExecutionSnapshot } from './snapshot'

export interface PythonExecutionView {
  status:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'running'
    | 'waiting-input'
    | 'paused'
    | 'completed'
    | 'stopped'
    | 'failed'
  identity?: StudioExecutionIdentity
  /** Exact immutable editor document captured at Run, for stale-preview indication. */
  project?: PythonProjectDocument
  input?: { requestId: string; prompt: string }
  error?: string
}
interface Generation {
  audioListeners: Set<() => void>
  abort: AbortController
  project: PythonProjectDocument
  writerEpoch: number | null
  environment: StudioRuntimeEnvironment
  session?: StudioRuntimeSession
  unsubscribe?: () => void
  releaseFrame?: () => void
  releaseAuthority?: () => void
  capture?: Promise<StudioRuntimeSnapshot | null>
}
const cancelled = () => new DOMException('Execução cancelada.', 'AbortError')

/** Shared lifecycle for the editor and anonymous player; never writes the project. */
export function createPythonExecutionController(options: {
  instanceId: string
  environment(): StudioRuntimeEnvironment | null
  project(): PythonProjectDocument | null
  canExecute(): boolean
  writerEpoch?(): number | null
  audioMuted?(): boolean
  mountFrame(): { frame: HTMLIFrameElement; release(): void }
  onEvent?(event: StudioRuntimeEvent): void
  /** A dedicated formative generation; absent for ordinary editor/public playback. */
  pythonActivity?: StudioPythonActivity
}) {
  const activity =
    options.pythonActivity === undefined
      ? undefined
      : StudioPythonActivitySchema.parse(options.pythonActivity)
  let view: PythonExecutionView = { status: 'idle' }
  let generation: Generation | undefined
  let disposed = false
  let releasing: Promise<void> = Promise.resolve()
  const listeners = new Set<() => void>()
  const epoch = () => options.writerEpoch?.() ?? null
  function publish(next: PythonExecutionView) {
    view = next
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        reportError(error)
      }
    }
  }
  function owns(current: Generation) {
    return (
      !disposed &&
      generation === current &&
      !current.abort.signal.aborted &&
      !current.environment.signal?.aborted &&
      options.canExecute() &&
      options.project()?.id === current.project.id &&
      epoch() === current.writerEpoch &&
      options.environment() === current.environment
    )
  }
  function requireOwner(current: Generation, preparing = false) {
    if (!owns(current) || (preparing && options.project() !== current.project)) throw cancelled()
  }
  function retire(): Promise<void> {
    const previous = generation
    generation = undefined // revoke authority before any callback or await
    if (!previous) return releasing
    previous.unsubscribe?.()
    previous.audioListeners.clear()
    previous.releaseAuthority?.()
    previous.abort.abort()
    const prior = releasing
    releasing = Promise.allSettled([prior, previous.session?.dispose()]).then(() => {
      previous.releaseFrame?.()
      previous.releaseFrame = undefined
    })
    return releasing
  }
  function handle(current: Generation, event: StudioRuntimeEvent) {
    if (
      !owns(current) ||
      !current.session ||
      !samePythonExecutionIdentity(event.identity, current.session.identity)
    )
      return
    if (event.type === 'state')
      publish({
        ...view,
        status: event.state,
        input: event.state === 'waiting-input' ? view.input : undefined,
      })
    else if (event.type === 'input-request')
      publish({
        ...view,
        status: 'waiting-input',
        input: { requestId: event.requestId, prompt: event.prompt },
      })
    else if (event.type === 'failed')
      publish({ ...view, status: 'failed', input: undefined, error: event.message })
    if (owns(current)) {
      try {
        options.onEvent?.(event)
      } catch (error) {
        reportError(error)
      }
    }
  }
  async function run(): Promise<void> {
    if (disposed) throw new Error('Esta área de execução foi encerrada.')
    const cleanup = retire()
    const project = options.project()
    const environment = options.environment()
    if (!project || !environment || !options.canExecute()) {
      const message = !environment
        ? 'O ambiente Python ainda não está disponível nesta página.'
        : 'A execução não está disponível agora.'
      publish({ status: 'failed', error: message })
      throw new Error(message)
    }
    const current: Generation = {
      audioListeners: new Set(),
      abort: new AbortController(),
      project,
      environment,
      writerEpoch: epoch(),
    }
    generation = current
    const authorityLost = () => {
      if (generation !== current) return
      void retire()
      publish({
        status: 'failed',
        project,
        error: 'O acesso a este ambiente mudou. Seu código continua preservado.',
      })
    }
    environment.signal?.addEventListener('abort', authorityLost, { once: true })
    current.releaseAuthority = () => environment.signal?.removeEventListener('abort', authorityLost)
    publish({ status: 'loading', project })
    try {
      await cleanup
      requireOwner(current, true)
      const snapshot = await preparePythonExecutionSnapshot(project)
      requireOwner(current, true)
      await environment.authorize?.({
        project,
        operation: 'execute',
        revision: snapshot.revision,
        signal: current.abort.signal,
      })
      requireOwner(current, true)
      const provider = await environment.registry.load({
        project,
        catalog: environment.catalog,
        access: environment.access(project),
        signal: current.abort.signal,
      })
      requireOwner(current, true)
      // Policy can change while the snapshot is hashed. Check again before creating a frame.
      assertStudioRuntimeExecutionAccess({
        project,
        catalog: environment.catalog,
        access: environment.access(project),
      })
      requireOwner(current, true)
      const mounted = options.mountFrame()
      current.releaseFrame = mounted.release
      const identity: StudioExecutionIdentity = Object.freeze({
        projectId: project.id,
        revision: snapshot.revision,
        instanceId: options.instanceId,
        runId: crypto.randomUUID(),
        writerEpoch: current.writerEpoch,
        runtimeManifestSha256: project.runtime.manifestSha256,
      })
      const session = await provider.prepare({
        project,
        identity,
        signal: current.abort.signal,
        frame: mounted.frame,
        hostAudio: {
          getMuted() {
            requireOwner(current)
            const value = options.audioMuted ? options.audioMuted() : false
            if (typeof value !== 'boolean') throw new Error('Preferência de som inválida.')
            return value
          },
          subscribe(listener) {
            if (!owns(current)) return () => {}
            current.audioListeners.add(listener)
            return () => {
              current.audioListeners.delete(listener)
            }
          },
        },
        ...(activity ? { pythonActivity: activity } : {}),
      })
      current.session = session
      requireOwner(current, true)
      current.unsubscribe = session.subscribe((event) => handle(current, event))
      publish({ status: 'ready', project, identity: session.identity })
      requireOwner(current, true)
      assertStudioRuntimeExecutionAccess({
        project,
        catalog: environment.catalog,
        access: environment.access(project),
      })
      requireOwner(current, true)
      await session.run()
      requireOwner(current)
    } catch (error) {
      if (generation === current) {
        const wasCancelled = error instanceof DOMException && error.name === 'AbortError'
        void retire()
        publish(
          wasCancelled
            ? { status: 'stopped' }
            : {
                status: 'failed',
                project,
                error:
                  error instanceof Error ? error.message : 'Não foi possível executar o projeto.',
              },
        )
      } else {
        // A provider may settle after Stop. Its own signal is revoked; release any late handle.
        await current.session?.dispose()
        current.releaseFrame?.()
        current.releaseFrame = undefined
      }
      throw error
    }
  }
  async function active(operation: 'execute' | 'python-repl' = 'execute') {
    const current = generation
    if (!current?.session) throw new Error('Execute o projeto primeiro.')
    requireOwner(current)
    await current.environment.authorize?.({
      project: current.project,
      operation,
      revision: current.session.identity.revision,
      signal: current.abort.signal,
    })
    requireOwner(current)
    assertStudioRuntimeExecutionAccess({
      project: current.project,
      catalog: current.environment.catalog,
      access: current.environment.access(current.project),
    })
    requireOwner(current)
    return { current, session: current.session }
  }
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) {
      if (disposed) return () => {}
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    run,
    syncAudioPreference() {
      const current = generation
      if (!current || !owns(current)) return
      for (const listener of [...current.audioListeners]) {
        if (!owns(current)) break
        listener()
      }
    },
    async applyActivityControls() {
      if (!activity) throw new Error('Esta execução não tem tarefa Python.')
      const { current, session } = await active()
      requireOwner(current, true)
      if (!session.applyPythonActivityControls)
        throw new Error('Este ambiente não oferece controles de tarefa Python.')
      await session.applyPythonActivityControls()
      requireOwner(current, true)
    },
    async checkActivity() {
      if (!activity) throw new Error('Esta execução não tem tarefa Python.')
      const { current, session } = await active()
      requireOwner(current, true)
      if (!session.checkPythonActivity)
        throw new Error('Este ambiente não oferece correção Python.')
      const feedback = await session.checkPythonActivity()
      requireOwner(current, true)
      await current.environment.authorize?.({
        project: current.project,
        operation: 'execute',
        revision: session.identity.revision,
        signal: current.abort.signal,
      })
      requireOwner(current, true)
      assertStudioRuntimeExecutionAccess({
        project: current.project,
        catalog: current.environment.catalog,
        access: current.environment.access(current.project),
      })
      requireOwner(current, true)
      return verifyStudioPythonActivityFeedback(feedback, activity)
    },
    stop(): Promise<void> {
      const cleanup = retire()
      if (!disposed) publish({ status: 'stopped' })
      return cleanup
    },
    async capture(): Promise<StudioRuntimeSnapshot | null> {
      const current = generation
      if (!current?.session) throw new Error('Execute o projeto primeiro.')
      requireOwner(current)
      if (current.capture) return current.capture
      const pending = (async () => {
        const { session } = await active()
        requireOwner(current)
        const snapshot = (await session.captureSnapshot?.()) ?? null
        requireOwner(current)
        return snapshot
      })()
      current.capture = pending
      try {
        return await pending
      } finally {
        if (current.capture === pending) current.capture = undefined
      }
    },
    async input(requestId: string, response: StudioRuntimeInput) {
      const { current, session } = await active()
      await session.provideInput(requestId, response)
      requireOwner(current)
    },
    async evaluate(requestId: string, source: string) {
      const { current, session } = await active('python-repl')
      assertStudioRuntimeOperationAccess(
        {
          project: current.project,
          catalog: current.environment.catalog,
          access: current.environment.access(current.project),
        },
        'python-repl',
      )
      requireOwner(current)
      if (session.repl.kind !== 'python')
        throw new Error('Este ambiente não oferece um console Python.')
      await session.repl.evaluate({ requestId, source })
      requireOwner(current)
    },
    async dispose() {
      if (disposed) return releasing
      disposed = true
      listeners.clear()
      await retire()
    },
  }
}
export type PythonExecutionController = ReturnType<typeof createPythonExecutionController>
