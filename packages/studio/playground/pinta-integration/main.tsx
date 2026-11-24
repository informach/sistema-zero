import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { setStudioStorageNamespace } from '@sistemazero/studio'
import { StudioEditor } from '@sistemazero/studio/editor'
import { createLocalPersistenceAdapter } from '@sistemazero/studio/local-persistence'
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PintaClient } from '../../../member-shell/src/components/creator/pinta-client'
import { useStudioCreationLibraries } from '../../../member-shell/src/components/creator/use-studio-creation-libraries'
import type { EditableStudioProject } from '../../src/core/editableProject'
import { createEmptyProject } from '../../src/core/project'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import { documentFixture } from '../../src/state/fixtures/projectDocuments'
import { refinePythonClassicProjectDocument } from '../../src/state/pythonProjectValidation'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-700.css'
import './styles.css'
import { QA_PROFILE as profile } from './profile'

// Isolated synthetic profile; Playwright aborts API requests to exercise offline behavior.
// No credentials, authenticated account or successful cloud response are simulated.
setStudioStorageNamespace(profile)
function Studio() {
  const adapter = useMemo(() => createLocalPersistenceAdapter({ namespace: profile }), [])
  const [initial, setInitial] = useState<EditableStudioProject | null>(null)
  const [observed, setObserved] = useState<EditableStudioProject | null>(null)
  const [runtimeEnvironment, setRuntimeEnvironment] = useState<StudioRuntimeEnvironment>()
  const { pintaLibrary } = useStudioCreationLibraries(profile, true, false)
  useEffect(() => {
    let active = true
    if (new URLSearchParams(window.location.search).get('novo') === '1') {
      const python = new URLSearchParams(window.location.search).get('python') === '1'
      if (python) {
        const raw = documentFixture('python', 'classic')
        if (raw.programmingLanguage !== 'python' || raw.kind !== 'classic')
          throw new Error('fixture inválida')
        raw.id = crypto.randomUUID()
        raw.assets = []
        raw.ir = null
        raw.blocksState = null
        raw.files = {
          'main.py': '# Meu programa continua aqui\nvalor_da_vila = 41\n',
          'requirements.txt': '',
        }
        raw.installedExtensions = [{ id: 'python-pygame', version: '1.0.0', installedAt: 1 }]
        void (async () => {
          const reader = new URLSearchParams(window.location.search).get('leitor')
          if (reader === 'antigo' || reader === 'mundo') {
            // Authoring-only catalog: declares no new Pinta reader and cannot execute code.
            const release = await createStudioRuntimeRelease({
              manifestVersion: 1,
              profileId: 'python-test',
              releaseId: 'old-pinta-reader',
              programmingLanguage: 'python',
              kinds: ['classic'],
              modes: ['blocks', 'bridge'],
              capabilities: ['edit', 'export-source'],
              extensions: [{ id: 'python-pygame', versions: ['1.0.0'] }],
              sourceTargets: ['desktop'],
              requiredBrowserFeatures: [],
              artifacts: [{ path: 'authoring-only.txt', sha256: 'b'.repeat(64) }],
              python: {
                version: '3.14.2',
                packages: [],
                providedModules: [],
                features: reader === 'mundo' ? ['pinta-map-world-v1'] : [],
              },
            })
            const catalog = await createStudioRuntimeCatalog({
              releases: [release],
              profiles: [
                {
                  id: release.profileId,
                  languages: ['python'],
                  kinds: ['classic'],
                  modes: ['blocks', 'bridge'],
                  levels: [],
                  releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
                },
              ],
            })
            raw.runtime = {
              profileId: release.profileId,
              releaseId: release.releaseId,
              manifestSha256: release.manifestSha256,
            }
            raw.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
            if (active)
              setRuntimeEnvironment({
                catalog,
                registry: createStudioRuntimeRegistry([]),
                access: () => ({
                  releaseStatus: 'active',
                  hostOperations: [
                    { capability: 'edit', state: 'available' },
                    { capability: 'export-source', state: 'available' },
                  ],
                  grantedCapabilities: ['edit', 'export-source'],
                  grantedExtensionIds: ['python-pygame'],
                  curation: null,
                }),
                resolvePythonAnalysis: async () => {
                  throw new Error('This authoring fixture has no execution provider.')
                },
              })
          }
          const project = await refinePythonClassicProjectDocument(raw)
          if (active) {
            setInitial(project)
            setObserved(project)
          }
        })()
        return () => {
          active = false
        }
      }
      const project = createEmptyProject(crypto.randomUUID(), 'Meu jogo com mapas')
      setInitial(project)
      setObserved(project)
      return
    }
    void (async () => {
      const summaries = (await adapter.list?.()) ?? []
      const selected =
        new URLSearchParams(window.location.search).get('project') ?? summaries[0]?.id
      if (!selected) return
      const loaded = await adapter.load(selected)
      if (active) {
        setInitial(loaded)
        setObserved(loaded)
      }
    })()
    return () => {
      active = false
    }
  }, [adapter])
  if (!initial) return <p role="status">Carregando projeto local…</p>
  return (
    <>
      <StudioEditor
        initialProject={initial}
        persistence={adapter}
        runtimeEnvironment={runtimeEnvironment}
        pintaLibrary={pintaLibrary}
        onExit={() => window.location.assign('/pinta')}
        onEditDrawing={(id, tab) => {
          const url = `/pinta?desenho=${encodeURIComponent(id)}`
          if (tab) tab.location.href = url
          else window.open(url, '_blank', 'noopener')
        }}
        onChange={setObserved}
        onSave={setObserved}
      />
      <output hidden data-testid="qa-project">
        {JSON.stringify(observed)}
      </output>
    </>
  )
}
const element = document.getElementById('root')
if (!element) throw new Error('Missing root')
createRoot(element).render(
  <StrictMode>
    {window.location.pathname.startsWith('/estudio') ? (
      <Studio />
    ) : (
      <PintaClient viewerId={profile} studioAvailable />
    )}
  </StrictMode>,
)
