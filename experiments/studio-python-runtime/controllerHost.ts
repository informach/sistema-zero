import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '../../packages/core/src/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../packages/studio/src/core/editableProject'
import type { StudioRuntimeEnvironment } from '../../packages/studio/src/runtime/environment'
import {
  createPythonExecutionController,
  type PythonExecutionController,
} from '../../packages/studio/src/runtime/python/controller'
import { createStudioRuntimeRegistry } from '../../packages/studio/src/runtime/registry'
import type {
  StudioRuntimeEvent,
  StudioRuntimeInput,
  StudioRuntimeProvider,
} from '../../packages/studio/src/runtime/types'
import { refinePythonProjectDocument } from '../../packages/studio/src/state/pythonProjectValidation'

export async function createControllerProbe(provider: StudioRuntimeProvider) {
  const distribution = await (await fetch('/distribution')).json()
  const release = StudioRuntimeReleaseSchema.parse(distribution.release)
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const registry = createStudioRuntimeRegistry([
    {
      id: provider.id,
      profileId: release.profileId,
      programmingLanguage: 'python',
      kinds: ['classic', 'pro'],
      load: async () => provider,
    },
  ])
  interface Entry {
    project: PythonProjectDocument
    allowed: boolean
    writerEpoch: number | null
    events: StudioRuntimeEvent[]
    controller: PythonExecutionController
    container: HTMLDivElement
  }
  const entries = new Map<string, Entry>()
  const get = (slot: string) => {
    const entry = entries.get(slot)
    if (!entry) throw new Error('slot')
    return entry
  }
  async function readFixture(fixture: string) {
    return refinePythonProjectDocument(
      await (await fetch(`/project/${encodeURIComponent(fixture)}`)).json(),
    )
  }
  return {
    async create(slot: string, fixture: string) {
      const previous = entries.get(slot)
      if (previous) {
        await previous.controller.dispose()
        previous.container.remove()
      }
      const project = await readFixture(fixture)
      const container = document.createElement('div')
      document.body.append(container)
      const environment: StudioRuntimeEnvironment = {
        catalog,
        registry,
        access: () => ({
          releaseStatus: 'active',
          grantedCapabilities: ['execute', 'python-repl'],
          grantedExtensionIds: get(slot).allowed ? ['python-turtle'] : [],
          hostOperations: [
            {
              capability: 'execute',
              state: get(slot).allowed ? 'available' : 'unavailable',
              ...(get(slot).allowed ? {} : { reasonCode: 'observer' }),
            },
          ],
          curation: null,
        }),
        resolvePythonAnalysis: async () => {
          throw new Error('Not part of this probe')
        },
      }
      const controller = createPythonExecutionController({
        instanceId: slot,
        project: () => get(slot).project,
        environment: () => environment,
        canExecute: () => get(slot).allowed,
        writerEpoch: () => get(slot).writerEpoch,
        onEvent: (event) => {
          if (get(slot).events.length < 2048) get(slot).events.push(event)
        },
        mountFrame: () => {
          const frame = document.createElement('iframe')
          container.append(frame)
          return { frame, release: () => frame.remove() }
        },
      })
      entries.set(slot, {
        project,
        controller,
        container,
        allowed: true,
        writerEpoch: null,
        events: [],
      })
    },
    run: (slot: string) => get(slot).controller.run(),
    stop: (slot: string) => get(slot).controller.stop(),
    capture: (slot: string) => get(slot).controller.capture(),
    input: (slot: string, requestId: string, response: StudioRuntimeInput) =>
      get(slot).controller.input(requestId, response),
    evaluate: (slot: string, requestId: string, source: string) =>
      get(slot).controller.evaluate(requestId, source),
    allow(slot: string, allowed: boolean) {
      get(slot).allowed = allowed
    },
    writer(slot: string, epoch: number | null) {
      get(slot).writerEpoch = epoch
    },
    async fixture(slot: string, fixture: string) {
      get(slot).project = await readFixture(fixture)
    },
    source(slot: string, source: string) {
      const entry = get(slot)
      const project = entry.project
      entry.project =
        project.kind === 'classic'
          ? { ...project, files: { ...project.files, [project.python.entrypoint]: source } }
          : {
              ...project,
              tree: {
                ...project.tree,
                [project.python.entrypoint]: { kind: 'file', content: source },
              },
            }
    },
    read(slot: string) {
      const entry = get(slot)
      const { project, ...view } = entry.controller.getSnapshot()
      return {
        ...view,
        current: project === entry.project,
        events: entry.events,
        frames: entry.container.querySelectorAll('iframe').length,
      }
    },
    async dispose(slot: string) {
      const entry = get(slot)
      await entry.controller.dispose()
      entry.container.remove()
    },
  }
}
declare global {
  var pythonControllerProbe: Awaited<ReturnType<typeof createControllerProbe>>
}
