import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PythonRuntimePreview } from '../../src/components/preview/PythonRuntimePreview'
import type { PythonProjectDocument } from '../../src/core/editableProject'
import { createStudioRuntimeCapture } from '../../src/runtime/capture'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import type { StudioRuntimeEvent, StudioRuntimeProvider } from '../../src/runtime/types'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'

/** Qualification harness: renders the production React surface against the real interpreter. */
export async function createPreviewProbe(provider: StudioRuntimeProvider) {
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
  let project: PythonProjectDocument
  let root: Root | undefined
  let container: HTMLDivElement | undefined
  let allowed = true
  let writerEpoch = 1
  const events: StudioRuntimeEvent[] = []
  const capture = createStudioRuntimeCapture()
  const environment: StudioRuntimeEnvironment = {
    catalog,
    registry,
    access: () => ({
      releaseStatus: 'active',
      grantedCapabilities: ['execute', 'python-repl'],
      grantedExtensionIds: ['python-turtle'],
      hostOperations: [{ capability: 'execute', state: 'available' }],
      curation: null,
    }),
    resolvePythonAnalysis: async () => {
      throw new Error('Preview qualification only')
    },
  }
  function render() {
    root?.render(
      <StrictMode>
        <PythonRuntimePreview
          project={project}
          environment={environment}
          canExecute={allowed}
          writerEpoch={writerEpoch}
          capture={capture}
          onEvent={(event) => {
            if (events.length < 2048) events.push(event)
          }}
        />
      </StrictMode>,
    )
  }
  return {
    async create(fixture: string) {
      root?.unmount()
      container?.remove()
      capture.clear()
      events.length = 0
      project = await refinePythonProjectDocument(
        await (await fetch(`/project/${encodeURIComponent(fixture)}`)).json(),
      )
      allowed = true
      writerEpoch = 1
      container = document.createElement('div')
      container.id = 'python-preview-probe'
      container.style.cssText = 'height:600px;max-width:800px'
      document.body.append(container)
      root = createRoot(container)
      render()
    },
    source(source: string) {
      project =
        project.kind === 'classic'
          ? { ...project, files: { ...project.files, [project.python.entrypoint]: source } }
          : {
              ...project,
              tree: {
                ...project.tree,
                [project.python.entrypoint]: { kind: 'file', content: source },
              },
            }
      render()
    },
    allow(value: boolean) {
      allowed = value
      render()
    },
    writer(value: number) {
      writerEpoch = value
      render()
    },
    events: () => events,
    capture: () => capture.capture(project),
    dispose() {
      root?.unmount()
      root = undefined
      container?.remove()
      container = undefined
    },
  }
}
declare global {
  var pythonPreviewProbe: Awaited<ReturnType<typeof createPreviewProbe>>
}
