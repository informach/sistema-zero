import {
  applyStudioProChange,
  type StudioProBuilderAdapter,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { StrictMode, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ProBuilderPanel from '../../../src/components/tutor/ProBuilderPanel'
import type { EditableStudioProject } from '../../../src/core/editableProject'
import { createEmptyProject } from '../../../src/core/project'
import { documentFixture } from '../../../src/state/fixtures/projectDocuments'
import { persistProject } from '../../../src/state/persistence'
import { registerProjectPersistence } from '../../../src/state/projectOperations'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../../src/state/projectStorageRuntime'
import {
  loadSanitizedProjectById,
  useProjectStore,
  useProjectStoreApi,
} from '../../../src/state/projectStore'
import { captureProRevision } from '../../../src/state/proRevision'
import { refinePythonProProjectDocument } from '../../../src/state/pythonProProjectValidation'
import '../../../playground/styles.css'

// Structural runtime identities grant no execution. Server responses are controlled;
// Panel, Monaco, revision CAS and Python IndexedDB application/recovery are real.
const python = new URLSearchParams(location.search).get('language') === 'python'
const pythonSource = documentFixture('python', 'pro')
if (pythonSource.programmingLanguage !== 'python' || pythonSource.kind !== 'pro')
  throw new Error('Python fixture missing')
const projectId = python ? 'python-review-browser' : 'review-browser'
const entrypoint = python ? 'src/main.py' : 'main.ts'
const initial: EditableStudioProject = python
  ? await refinePythonProProjectDocument({
      ...pythonSource,
      id: projectId,
      tree: {
        ...pythonSource.tree,
        [entrypoint]: { kind: 'file', content: 'meta = 10\nprint(meta)\n' },
        rascunhos: { kind: 'dir' },
      },
      coverAssetName: undefined,
      assets: [
        {
          id: 'pinta-hero',
          name: 'heroi',
          kind: 'image',
          source: 'library',
          libOrigin: 'pinta',
          libId: 'personal:pinta-hero',
          libRevision: 7,
          proPath: 'assets/heroi.png',
          license: {
            name: 'CC BY 4.0',
            attribution: 'Desenho da criança',
            sourceUrl: 'https://example.test/arte',
          },
          dataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
        },
      ],
    })
  : {
      ...createEmptyProject('review-browser', 'Revisão'),
      kind: 'pro',
      mode: 'code',
      tree: { 'main.ts': { kind: 'file', content: 'export const goal = 10\n' } },
      proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    }
const base = await captureProRevision(initial)
if (python) {
  setProjectStorageNamespace('python-builder-browser')
  const scope = captureProjectStorageScope()
  const saved = await loadSanitizedProjectById(projectId, scope)
  if (!saved) await persistProject(initial, {}, scope)
  useProjectStore.getState().hydrateProject(saved ?? initial)
} else useProjectStore.getState().setProject(initial)
const change = {
  baseHash: base.hash,
  summary: 'Ajustar meta',
  patches: [
    {
      path: entrypoint,
      before: await studioProDigest(base.files[entrypoint]!),
      content: python ? 'meta = 12\nprint(meta)\n' : 'export const goal = 12\n',
    },
  ],
}
const job: StudioProBuilderJob = {
  id: python ? '00000000-0000-4000-8000-000000000067' : crypto.randomUUID(),
  projectId: base.projectId,
  base,
  objective: 'Ajustar meta',
  model: 'fixture/model',
  phase: 'review',
  version: 2,
  modelCalls: 1,
  validationCalls: 1,
  createdAt: new Date().toISOString(),
  deadlineAt: new Date(Date.now() + 300000).toISOString(),
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  leaseUntil: null,
  result: {
    change,
    revisionHash: (await applyStudioProChange(base, change)).revision.hash,
    plan: ['Conferir alteração'],
    evidence: (['types', 'build', 'playtest', 'capture'] as const).map((kind) => ({
      kind,
      status: 'passed',
      detail: 'Resposta controlada do adaptador de teste',
    })),
  },
  notes: [],
  error: null,
  cost: { source: 'platform', confirmedMicroUsd: 3, uncertain: false },
}
const view = studioProBuilderView(job)
const adapter: StudioProBuilderAdapter = {
  latest: async () => view,
  create: async () => view,
  cancel: async () => ({ ...view, phase: 'cancelled' }),
}
function Fixture() {
  const store = useProjectStoreApi()
  useLayoutEffect(() => {
    if (!python) return
    const scope = captureProjectStorageScope()
    return registerProjectPersistence(store, {
      scopeIdentity: scope.identity,
      localScope: scope,
      load: (id) => loadSanitizedProjectById(id, scope),
      save: (project) => persistProject(project, {}, scope),
    })
  }, [store])
  const [open, setOpen] = useState(true)
  const [modelCount, setModelCount] = useState<number | null>(null)
  const [languages, setLanguages] = useState<string[]>([])
  const project = useProjectStore((state) => state.project)
  const file = project?.tree?.[entrypoint]
  return (
    <main
      className="bg-sz-panel text-sz-fg"
      data-sz-theme="dark"
      style={{ minHeight: '100vh', maxWidth: 700, margin: 'auto' }}
    >
      <h1>Fixture de revisão do construtor</h1>
      <button
        type="button"
        onClick={async () => {
          const { editor } = await import('monaco-editor/esm/vs/editor/editor.api.js')
          setModelCount(
            editor.getModels().filter((model) => model.uri.scheme === 'studio-review').length,
          )
          setLanguages(
            editor
              .getModels()
              .filter((model) => model.uri.scheme === 'studio-review')
              .map((model) => model.getLanguageId()),
          )
        }}
      >
        Contar modelos da revisão
      </button>
      <output aria-label="Modelos da revisão">{modelCount ?? 'Não contado'}</output>
      <output aria-label="Linguagens da revisão">{languages.join(',')}</output>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? 'Fechar painel' : 'Abrir painel'}
      </button>
      <output aria-label="Código persistido">{file?.kind === 'file' ? file.content : ''}</output>
      {python && (
        <output
          aria-label="Metadados preservados"
          style={{ display: 'block', overflowWrap: 'anywhere' }}
        >
          {JSON.stringify({
            entrypoint:
              project?.programmingLanguage === 'python' ? project.python.entrypoint : null,
            assets: project?.assets,
            folder: project?.tree?.rascunhos,
            assistance: project?.proMeta?.assistance,
          })}
        </output>
      )}
      {open && <ProBuilderPanel adapter={adapter} projectId={projectId} />}
    </main>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
