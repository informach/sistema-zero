import {
  applyStudioProChange,
  type StudioProBuilderAdapter,
  type StudioProBuilderJob,
  studioProBuilderView,
  studioProDigest,
} from '@sistemazero/core/studio'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ZappyPanel } from '../../../src/components/tutor/ZappyPanel'
import { createEmptyProject } from '../../../src/core/project'
import { ProCodeMode } from '../../../src/modes/pro/ProCodeMode'
import { useProjectStore } from '../../../src/state/projectStore'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../../src/studio/config'
import { StudioLayoutProvider } from '../../../src/studio/layoutContext'
import {
  type StudioTutorAdapter,
  type StudioTutorAskInput,
  type StudioTutorHistoryMessage,
  StudioTutorProvider,
  useStudioTutor,
} from '../../../src/studio/tutor'
import '../../../playground/styles.css'

// Only remote services are controlled. Monaco, store, context assembly, proposal application and undo are real.
const path = 'src/main.ts'
useProjectStore.getState().setProject({
  ...createEmptyProject('zappy-browser', 'Autoria compartilhada'),
  kind: 'pro',
  mode: 'code',
  tree: {
    src: { kind: 'dir' },
    [path]: { kind: 'file', content: 'export const goal = 10\nexport const speed = 2\n' },
  },
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
})
const asked: StudioTutorAskInput[] = []
const created: Array<Parameters<StudioProBuilderAdapter['create']>[0]> = []
const history: StudioTutorHistoryMessage[] = []
let latest: ReturnType<typeof studioProBuilderView> | null = null
const notify = () => window.dispatchEvent(new Event('fixture-change'))
const builder: StudioProBuilderAdapter = {
  latest: async () => latest,
  create: async (input) => {
    created.push(input)
    const before = input.base.files[path]
    if (before === undefined) throw new Error('Missing fixture source')
    const change = {
      baseHash: input.base.hash,
      summary: 'Meta ajustada na proposta',
      patches: [
        {
          path,
          before: await studioProDigest(before),
          content: before.replace(/goal = \d+/, 'goal = 12'),
        },
      ],
    }
    const now = Date.now()
    const job: StudioProBuilderJob = {
      id: input.id,
      projectId: input.base.projectId,
      base: input.base,
      objective: input.objective,
      model: 'fixture/no-inference',
      phase: 'review',
      version: 1,
      modelCalls: 0,
      validationCalls: 0,
      cost: { source: 'platform', confirmedMicroUsd: 0, uncertain: false },
      createdAt: new Date(now).toISOString(),
      deadlineAt: new Date(now + 300000).toISOString(),
      expiresAt: new Date(now + 600000).toISOString(),
      leaseUntil: null,
      result: {
        change,
        revisionHash: (await applyStudioProChange(input.base, change)).revision.hash,
        plan: ['Revisar a meta proposta'],
        evidence: (['types', 'build', 'playtest', 'capture'] as const).map((kind) => ({
          kind,
          status: 'passed',
          detail: 'Resposta controlada; não é execução do runtime.',
        })),
      },
      notes: [],
      error: null,
      ...(input.request
        ? {
            assistance: {
              version: 1,
              request: input.request,
              disposition: 'pending',
              events: [{ sequence: 0, at: new Date(now).toISOString(), kind: 'created' }],
              previewRefreshes: 0,
            },
          }
        : {}),
    }
    latest = studioProBuilderView(job)
    notify()
    return latest
  },
  cancel: async () => (latest ? { ...latest, phase: 'cancelled' } : null),
}
const adapter: StudioTutorAdapter = {
  builder,
  loadHistory: async () => ({ messages: [...history], nextCursor: null }),
  deleteHistory: async () => {
    history.length = 0
  },
  feedback: async () => {},
  ask: async (input) => {
    asked.push(structuredClone(input))
    const selected = input.context.pro?.selection
    const response = {
      id: crypto.randomUUID(),
      kind: 'pro' as const,
      intent: input.context.pro?.intent,
      scope:
        input.context.pro?.intent === 'investigate' ? ('error' as const) : ('concept' as const),
      text:
        input.context.pro?.intent === 'investigate'
          ? 'Compare o movimento esperado com a posição observada antes de alterar a regra.'
          : 'A variável selecionada controla a velocidade; você pode ajustar o valor manualmente.',
      blockReferences: [],
      sourceRevision: input.context.pro?.revision,
      ...(selected
        ? {
            fileReferences: [
              {
                path: selected.path,
                startLine: selected.startLine,
                endLine: selected.endLine,
                sourceHash: selected.sourceHash,
              },
            ],
          }
        : {}),
      createdAt: new Date().toISOString(),
    }
    history.push(
      {
        id: input.clientMessageId,
        role: 'user',
        text: input.question,
        createdAt: response.createdAt,
      },
      {
        id: response.id,
        role: 'assistant',
        text: response.text,
        createdAt: response.createdAt,
        response,
      },
    )
    notify()
    return { response }
  },
}
const tutor = { adapter, cooldownMs: 0 }
const config = { ...STANDALONE_CONFIG, preview: false, terminal: false, professional: true }
function Fixture() {
  const { setOpen } = useStudioTutor()
  const [revision, setRevision] = useState(0)
  const project = useProjectStore((state) => state.project)
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1)
    window.addEventListener('fixture-change', changed)
    return () => window.removeEventListener('fixture-change', changed)
  }, [])
  const file = project?.tree?.[path]
  return (
    <main
      data-sz-theme="dark"
      className="relative bg-sz-panel text-sz-fg"
      style={{ height: '100vh' }}
    >
      <header style={{ height: 68, padding: 8 }}>
        <button type="button" onClick={() => setOpen(true)}>
          Abrir Zappy Pro
        </button>
      </header>
      <div style={{ height: 'calc(100vh - 68px)', width: '70%' }}>
        <ProCodeMode />
      </div>
      <ZappyPanel />
      <output hidden aria-label="Dados da prova" data-revision={revision}>
        {JSON.stringify({
          asked,
          created: created.map((input) => ({
            id: input.id,
            objective: input.objective,
            request: input.request,
          })),
          source: file?.kind === 'file' ? file.content : '',
        })}
      </output>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioConfigProvider value={config}>
      <StudioLayoutProvider value={{ width: 1280, isNarrow: false, isCompact: false }}>
        <StudioTutorProvider value={tutor}>
          <Fixture />
        </StudioTutorProvider>
      </StudioLayoutProvider>
    </StudioConfigProvider>
  </StrictMode>,
)
