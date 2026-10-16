import {
  applyStudioProChange,
  type StudioProBuilderAdapter,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ProBuilderPanel from '../../../src/components/tutor/ProBuilderPanel'
import { createEmptyProject } from '../../../src/core/project'
import { useProjectStore } from '../../../src/state/projectStore'
import { captureProRevision } from '../../../src/state/proRevision'
import '../../../playground/styles.css'

// Browser fixture: only the server adapter is controlled. Store, revision CAS and Monaco are real.
useProjectStore.getState().setProject({
  ...createEmptyProject('review-browser', 'Revisão'),
  kind: 'pro',
  mode: 'code',
  tree: { 'main.ts': { kind: 'file', content: 'export const goal = 10\n' } },
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
})
const base = await captureProRevision(useProjectStore.getState().project!)
const change = {
  baseHash: base.hash,
  summary: 'Ajustar meta',
  patches: [
    {
      path: 'main.ts',
      before: await studioProDigest(base.files['main.ts']!),
      content: 'export const goal = 12\n',
    },
  ],
}
const job: StudioProBuilderJob = {
  id: crypto.randomUUID(),
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
  const [open, setOpen] = useState(true)
  const [modelCount, setModelCount] = useState<number | null>(null)
  const project = useProjectStore((state) => state.project)
  const file = project?.tree?.['main.ts']
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
        }}
      >
        Contar modelos da revisão
      </button>
      <output aria-label="Modelos da revisão">{modelCount ?? 'Não contado'}</output>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? 'Fechar painel' : 'Abrir painel'}
      </button>
      <output aria-label="Código persistido">{file?.kind === 'file' ? file.content : ''}</output>
      {open && <ProBuilderPanel adapter={adapter} projectId="review-browser" />}
    </main>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
