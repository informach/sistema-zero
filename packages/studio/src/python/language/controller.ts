import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { type PythonAnalysisSession, preparePythonAnalysisSession } from './session'

interface Owner {
  projectId: string
  manifest: string
  environment: StudioRuntimeEnvironment
  epoch: number | null
  abort: AbortController
  ready?: Promise<PythonAnalysisSession>
  session?: PythonAnalysisSession
  release?: () => void
  releaseAuthority?: () => void
}
interface Job {
  owner: Owner
  current(): boolean
  reject(error: unknown): void
  execute(session: Pick<PythonAnalysisSession, 'parse' | 'render'>): Promise<void>
}
const cancelled = () =>
  new DOMException('Análise substituída por uma edição mais recente.', 'AbortError')

function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  late?: (value: T) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(cancelled())
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        if (signal.aborted) late?.(value)
        else resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

/**
 * One parser per editor, one operation in flight and at most one waiting gesture.
 * New typing supersedes work without terminating/reloading CPython for every key.
 * Cancellation of the owner (project/host/writer/unmount) still destroys the parser.
 */
export function createPythonAnalysisController(options: {
  project(): PythonProjectDocument | null
  environment(): StudioRuntimeEnvironment | null
  writerEpoch?(): number | null
  mountFrame(): { frame: HTMLIFrameElement; release(): void }
  prepareSession?: typeof preparePythonAnalysisSession
}) {
  let owner: Owner | undefined
  let pending: Job | undefined
  let active: Job | undefined
  let pumping = false
  let disposed = false
  const epoch = () => options.writerEpoch?.() ?? null
  function owns(current: Owner) {
    const project = options.project()
    const environment = options.environment()
    const writerEpoch = epoch()
    return (
      !disposed &&
      owner === current &&
      !current.abort.signal.aborted &&
      !current.environment.signal?.aborted &&
      environment === current.environment &&
      writerEpoch === current.epoch &&
      project?.id === current.projectId &&
      project.runtime.manifestSha256 === current.manifest
    )
  }
  function check(job: Job) {
    if (!owns(job.owner) || active !== job || pending || !job.current()) throw cancelled()
    const project = options.project()!
    if (job.owner.environment.access(project).releaseStatus === 'revoked')
      throw new Error('O analisador deste ambiente foi desativado. O código continua disponível.')
    // A host policy/current callback can synchronously retire this owner.
    if (!owns(job.owner) || active !== job || pending) throw cancelled()
  }
  function retire() {
    const previous = owner
    owner = undefined
    pending?.reject(cancelled())
    pending = undefined
    active?.reject(cancelled())
    previous?.releaseAuthority?.()
    previous?.abort.abort()
    previous?.session?.dispose()
    previous?.release?.()
  }
  function failWaiting(current: Owner, error: unknown) {
    if (pending?.owner !== current) return
    pending.reject(error)
    pending = undefined
  }
  function getOwner(): Owner {
    const project = options.project()
    const environment = options.environment()
    if (disposed || !project || !environment) throw cancelled()
    environment.signal?.throwIfAborted()
    if (owner && owns(owner)) return owner
    retire()
    const release = selectStudioRuntimeRelease(environment.catalog, project.runtime)
    if (
      release?.manifest.programmingLanguage !== 'python' ||
      !release.manifest.kinds.includes(project.kind)
    )
      throw new Error('O analisador Python não pertence ao catálogo aprovado.')
    if (environment.access(project).releaseStatus === 'revoked')
      throw new Error('O analisador deste ambiente foi desativado. O código continua disponível.')
    const current: Owner = {
      projectId: project.id,
      manifest: project.runtime.manifestSha256,
      environment,
      epoch: epoch(),
      abort: new AbortController(),
    }
    owner = current
    const authorityLost = () => {
      if (owner === current) retire()
    }
    environment.signal?.addEventListener('abort', authorityLost, { once: true })
    current.releaseAuthority = () => environment.signal?.removeEventListener('abort', authorityLost)
    return current
  }
  async function session(current: Owner) {
    if (!current.ready) {
      current.ready = (async () => {
        const project = options.project()
        if (!project || !owns(current)) throw cancelled()
        const resolved = await abortable(
          current.environment.resolvePythonAnalysis(project, current.abort.signal),
          current.abort.signal,
        )
        if (!owns(current)) throw cancelled()
        const mounted = options.mountFrame()
        if (!owns(current)) {
          mounted.release()
          throw cancelled()
        }
        current.release = mounted.release
        const prepared = await abortable(
          (options.prepareSession ?? preparePythonAnalysisSession)({
            frame: mounted.frame,
            ...resolved,
            runtimeManifestSha256: current.manifest,
            signal: current.abort.signal,
          }),
          current.abort.signal,
          (late) => late.dispose(),
        )
        if (!owns(current)) {
          prepared.dispose()
          throw cancelled()
        }
        current.session = prepared
        return prepared
      })()
    }
    return current.ready
  }
  async function pump() {
    if (pumping) return
    pumping = true
    try {
      while (pending) {
        const job = pending
        pending = undefined
        active = job
        try {
          check(job)
          const parser = await session(job.owner)
          check(job)
          const guarded: Pick<PythonAnalysisSession, 'parse' | 'render'> = {
            async parse(identity, source, _signal, parseOptions) {
              check(job)
              const result = await parser.parse(
                identity,
                source,
                job.owner.abort.signal,
                parseOptions,
              )
              check(job)
              return result
            },
            async render(node) {
              check(job)
              const result = await parser.render(node, job.owner.abort.signal)
              check(job)
              return result
            },
          }
          await abortable(job.execute(guarded), job.owner.abort.signal)
        } catch (error) {
          job.reject(error)
          // A transport failure can close its session. Do not keep a rejected boot
          // promise or a dead parser forever; a later gesture may explicitly retry.
          if ((!job.owner.session || job.owner.session.closed) && owns(job.owner)) {
            failWaiting(job.owner, error)
            job.owner.releaseAuthority?.()
            job.owner.abort.abort()
            job.owner.session?.dispose()
            job.owner.release?.()
            owner = undefined
          }
        } finally {
          if (active === job) active = undefined
        }
      }
    } finally {
      pumping = false
    }
  }
  return {
    run<T>(request: {
      current(): boolean
      execute(analysis: Pick<PythonAnalysisSession, 'parse' | 'render'>): Promise<T>
      /** Synchronous publication, guarded after computation and without another await. */
      commit?(result: T): undefined
    }): Promise<T> {
      return new Promise((resolve, reject) => {
        let currentOwner: Owner
        try {
          currentOwner = getOwner()
        } catch (error) {
          reject(error)
          return
        }
        pending?.reject(cancelled())
        const job: Job = {
          owner: currentOwner,
          current: request.current,
          reject,
          async execute(parser) {
            const result = await request.execute(parser)
            check(job)
            request.commit?.(result)
            resolve(result)
          },
        }
        pending = job
        void pump()
      })
    },
    reset() {
      retire()
    },
    dispose() {
      disposed = true
      retire()
    },
  }
}

export type PythonAnalysisController = ReturnType<typeof createPythonAnalysisController>
