/**
 * Transport FAKE para testes: `request` responde via callback injetado e
 * registra as chamadas (path/method/body); `streamChat` é roteirizável por
 * uma fila de eventos (delta/state/done/error) entregue de forma assíncrona
 * (um microtask por evento — um `setTimeout(0)`/waitFor drena tudo).
 */
import { createElement } from 'react'
import type { PensaGamificationDelta } from '../core/gamification'
import type { PensaIdentitySuggestions, PensaSpecFlow, PensaSpecScreen } from '../core/specContent'
import type {
  PensaArtifactView,
  PensaChatHandlers,
  PensaChatInput,
  PensaChecklistItemView,
  PensaCycleView,
  PensaHostAdapter,
  PensaMission,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaStageView,
  PensaTaskView,
  PensaTransport,
  PensaZState,
} from '../core/types'

export interface FakeCall {
  path: string
  method: string
  body: unknown
}

export type FakeChatEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'state'; state: Record<string, unknown> }
  | { kind: 'done' }
  | { kind: 'error'; error: Error }

export interface FakeTransportOptions {
  /** Roteiro do streamChat (fila de eventos por chamada). Ausente = lança. */
  chatScript?: (input: PensaChatInput) => FakeChatEvent[]
}

export interface FakeTransport extends PensaTransport {
  calls: FakeCall[]
  chatCalls: PensaChatInput[]
  /** Quantas vezes a fn de abort devolvida foi chamada. */
  aborted: number
}

export function createFakeTransport(
  respond: (path: string, init?: { method?: string; body?: unknown }) => unknown,
  options: FakeTransportOptions = {},
): FakeTransport {
  const calls: FakeCall[] = []
  const chatCalls: PensaChatInput[] = []
  const fake: FakeTransport = {
    calls,
    chatCalls,
    aborted: 0,
    async request<T>(
      path: string,
      init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown },
    ): Promise<T> {
      calls.push({ path, method: init?.method ?? 'GET', body: init?.body })
      return (await respond(path, init)) as T
    },
    streamChat(input: PensaChatInput, handlers: PensaChatHandlers): () => void {
      chatCalls.push(input)
      const script = options.chatScript
      if (!script) throw new Error('streamChat não roteirizado (passe options.chatScript)')
      const events = script(input)
      let stopped = false
      void (async () => {
        for (const event of events) {
          // Um microtask por evento: o send() retorna antes do 1º handler rodar.
          await Promise.resolve()
          if (stopped) return
          switch (event.kind) {
            case 'delta':
              handlers.onDelta(event.text)
              break
            case 'state':
              handlers.onState?.(event.state)
              break
            case 'done':
              handlers.onDone()
              break
            case 'error':
              handlers.onError(event.error)
              break
          }
        }
      })()
      return () => {
        stopped = true
        fake.aborted += 1
      }
    },
  }
  return fake
}

export function makeCycle(overrides: Partial<PensaCycleView> = {}): PensaCycleView {
  return {
    id: 'cycle-1',
    number: 1,
    goal: null,
    stage: 'z',
    zCompletedAt: null,
    eCompletedAt: null,
    rCompletedAt: null,
    oCompletedAt: null,
    ...overrides,
  }
}

export function makeListProject(
  overrides: Partial<PensaProjectListView> = {},
): PensaProjectListView {
  return {
    id: 'proj-1',
    name: 'Aventura do Dino',
    kind: 'game',
    status: 'active',
    cycleNumber: 1,
    stage: 'z',
    createdAt: '2026-06-30T12:00:00.000Z',
    updatedAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

export function makeDetail(
  overrides: Partial<PensaProjectDetailView> = {},
): PensaProjectDetailView {
  const cycle = overrides.currentCycle ?? makeCycle()
  return {
    id: 'proj-1',
    name: 'Aventura do Dino',
    kind: 'game',
    status: 'active',
    studioProjectId: null,
    // Default 'embedded' = comportamento clássico (o chooser pede buildEnv: null explícito).
    buildEnv: 'embedded',
    studioSnapshotAt: null,
    createdAt: '2026-06-30T12:00:00.000Z',
    updatedAt: '2026-06-30T12:00:00.000Z',
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
    ...overrides,
  }
}

// A interseção com Record permite usar o resultado direto como o `state` CRU
// do PensaStageView (interface não tem index signature implícita).
export function makeZState(
  overrides: { answered?: Partial<PensaZState['answered']>; ready?: boolean } = {},
): PensaZState & Record<string, unknown> {
  return {
    answered: {
      who: false,
      problem: false,
      action: false,
      screens: false,
      success: false,
      ...overrides.answered,
    },
    ready: overrides.ready ?? false,
  }
}

export function makeIdeaArtifact(overrides: Partial<PensaArtifactView> = {}): PensaArtifactView {
  return {
    id: 'artifact-1',
    stage: 'z',
    type: 'idea',
    version: 1,
    status: 'draft',
    content: { text: 'Um jogo em que o Dino desvia de meteoros para salvar o piquenique.' },
    createdAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

export function makeStageView(overrides: Partial<PensaStageView> = {}): PensaStageView {
  return {
    stage: 'z',
    conversation: { messages: [], summary: null, messageCount: 0 },
    state: {},
    artifacts: [],
    tasks: [],
    checklist: [],
    ...overrides,
  }
}

// ── Etapa E: friendly_spec + identity ────────────────────────────────────────

export function makeSpecFlow(overrides: Partial<PensaSpecFlow> = {}): PensaSpecFlow {
  return {
    id: 'flow-1',
    title: 'Desviar do meteoro',
    input: 'aperta a seta para cima',
    processing: 'faz o dino pular e confere se bateu',
    output: 'o dino pula e a pontuação sobe',
    screens: ['Fase 1'],
    ...overrides,
  }
}

export function makeSpecScreen(overrides: Partial<PensaSpecScreen> = {}): PensaSpecScreen {
  return {
    name: 'Início',
    elements: [
      { kind: 'title', label: 'Dino Turbo', zone: 'top' },
      { kind: 'score', label: 'Pontos', zone: 'top' },
      { kind: 'background', label: 'Floresta', zone: 'middle' },
      { kind: 'hero', label: 'Dino', zone: 'middle' },
      { kind: 'enemy', label: 'Meteoro', zone: 'middle' },
      { kind: 'item', label: 'Moeda', zone: 'middle' },
      { kind: 'button', label: 'Jogar', zone: 'bottom' },
      { kind: 'text', label: 'Recorde', zone: 'bottom' },
    ],
    ...overrides,
  }
}

export function makeSpecArtifact(overrides: Partial<PensaArtifactView> = {}): PensaArtifactView {
  return {
    id: 'artifact-spec-1',
    stage: 'e',
    type: 'friendly_spec',
    version: 1,
    status: 'draft',
    content: { flows: [makeSpecFlow()], screens: [makeSpecScreen()] },
    createdAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

export function makeIdentitySuggestions(): PensaIdentitySuggestions {
  return {
    names: ['Dino Turbo', 'Pulo Jurássico', 'Corrida do Dino'],
    palettes: [
      { name: 'Floresta Doce', colors: ['#22c55e', '#facc15', '#0ea5e9', '#f97316'] },
      { name: 'Céu de Tarde', colors: ['#f472b6', '#a78bfa', '#38bdf8', '#fde047'] },
      { name: 'Lava Divertida', colors: ['#ef4444', '#f97316', '#facc15', '#1f2937'] },
      { name: 'Mar Fundo', colors: ['#0ea5e9', '#14b8a6', '#6366f1', '#f8fafc'] },
    ],
  }
}

export function makeIconSvgs(): string[] {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#22c55e"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#facc15"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 22 22H2Z" fill="#0ea5e9"/></svg>',
  ]
}

export function makeIdentityArtifact(
  overrides: Partial<PensaArtifactView> = {},
): PensaArtifactView {
  return {
    id: 'artifact-identity-1',
    stage: 'e',
    type: 'identity',
    version: 1,
    status: 'validated',
    content: {
      name: 'Dino Turbo',
      palette: { name: 'Floresta Doce', colors: ['#22c55e', '#facc15', '#0ea5e9', '#f97316'] },
      iconSvg: makeIconSvgs()[0] ?? null,
    },
    createdAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

// ── Etapa R: mission_plan + tasks ────────────────────────────────────────────

export function makeMission(overrides: Partial<PensaMission> = {}): PensaMission {
  return {
    story: 'O Dino precisa aprender a pular antes da chuva de meteoros chegar!',
    steps: [
      { text: 'Abra o Estúdio e encontre a categoria de eventos', hint: 'Procure o bloco roxo' },
      { text: 'Faça o Dino pular quando apertar a seta para cima' },
    ],
    studioHints: { categories: ['Eventos', 'Movimento'], blocks: ['quando tecla', 'mover'] },
    doneWhen: ['O Dino pula ao apertar a seta', 'O jogo continua rodando sem travar'],
    ...overrides,
  }
}

export function makeTask(overrides: Partial<PensaTaskView> = {}): PensaTaskView {
  return {
    id: 'task-1',
    title: 'Fazer o Dino pular',
    summary: 'O herói precisa pular por cima dos meteoros.',
    taskType: 'gameplay',
    column: 'backlog',
    position: 0,
    mission: makeMission(),
    notes: null,
    ...overrides,
  }
}

/** Três missões no backlog (ids/positions distintos), como um generate devolve. */
export function makeTasks(): PensaTaskView[] {
  return [
    makeTask(),
    makeTask({ id: 'task-2', title: 'Chuva de meteoros', position: 1 }),
    makeTask({ id: 'task-3', title: 'Placar de pontos', position: 2 }),
  ]
}

export function makeMissionPlanArtifact(
  overrides: Partial<PensaArtifactView> = {},
): PensaArtifactView {
  return {
    id: 'artifact-plan-1',
    stage: 'r',
    type: 'mission_plan',
    version: 1,
    status: 'draft',
    // Espelho auditável do replace (sem os ids REAIS das tasks).
    content: { tasks: [] },
    createdAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

// ── Etapa O: checklist_seed + itens ──────────────────────────────────────────

export function makeChecklistItem(
  overrides: Partial<PensaChecklistItemView> = {},
): PensaChecklistItemView {
  return {
    id: 'check-1',
    category: 'test',
    title: 'Caça aos Bugs',
    description: 'Jogue do começo ao fim procurando qualquer coisa estranha.',
    required: true,
    position: 0,
    done: false,
    doneAt: null,
    ...overrides,
  }
}

/** Template determinístico do contrato (required = itens 1, 2 e 4). */
export function makeChecklistItems(): PensaChecklistItemView[] {
  return [
    makeChecklistItem(),
    makeChecklistItem({
      id: 'check-2',
      category: 'test',
      title: 'Teste do Convidado',
      description: 'Chame alguém para jogar sem explicar nada.',
      position: 1,
    }),
    makeChecklistItem({
      id: 'check-3',
      category: 'polish',
      title: 'Toque de Brilho',
      description: 'Um capricho a mais: som, cor ou efeito.',
      required: false,
      position: 2,
    }),
    makeChecklistItem({
      id: 'check-4',
      category: 'publish',
      title: 'Publicar no Mural',
      description: 'Publique o jogo no Mural dos Criadores.',
      position: 3,
    }),
    makeChecklistItem({
      id: 'check-5',
      category: 'share',
      title: 'Mostrar para alguém especial',
      description: 'Compartilhe sua criação com quem você gosta.',
      required: false,
      position: 4,
    }),
  ]
}

export function makeChecklistSeedArtifact(
  overrides: Partial<PensaArtifactView> = {},
): PensaArtifactView {
  return {
    id: 'artifact-seed-1',
    stage: 'o',
    type: 'checklist_seed',
    version: 1,
    status: 'draft',
    // Espelho do replace (sem os ids REAIS dos itens).
    content: { items: [] },
    createdAt: '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

// ── Gamificação + adapter fake do Estúdio ────────────────────────────────────

/** Delta como o members manda (campos extras são ignorados pelo parser). */
export function makeGamification(
  overrides: Partial<PensaGamificationDelta> = {},
): PensaGamificationDelta & Record<string, unknown> {
  return {
    xpAwarded: 15,
    badgesUnlocked: [],
    totalXp: 115,
    streak: { current: 2, best: 3, extended: true },
    unitCompleted: false,
    ...overrides,
  }
}

export interface FakeStudioAdapter extends PensaHostAdapter {
  /** Nomes passados ao createStudioProject (semeadura). */
  createdStudioNames: string[]
  /** Seeds passados ao onOpenStudio. */
  openStudioCalls: { pensaProjectId: string; studioProjectId: string | null; name: string }[]
  /** Args passados ao syncStudioSnapshot (sync oportunista do ProjectView). */
  syncCalls: { pensaProjectId: string; studioProjectId: string }[]
}

/**
 * Adapter fake com as capabilities opcionais do host: createStudioProject
 * (registra o nome e devolve `studioProjectId`), onOpenStudio (registra o
 * seed), renderStudio (marcador com data-testid="studio-embed" e os DOIS args
 * expostos em data-studio-project/data-pensa-project) e syncStudioSnapshot
 * (registra os args). Desligue capabilities via options para testar o degrade.
 */
export function makeStudioAdapter(
  transport: PensaTransport,
  options: {
    mode?: 'kids' | 'adult'
    studioProjectId?: string
    withCreate?: boolean
    withRender?: boolean
    withOpen?: boolean
    withSync?: boolean
  } = {},
): FakeStudioAdapter {
  const createdStudioNames: string[] = []
  const openStudioCalls: FakeStudioAdapter['openStudioCalls'] = []
  const syncCalls: FakeStudioAdapter['syncCalls'] = []
  return {
    transport,
    mode: options.mode ?? 'kids',
    createdStudioNames,
    openStudioCalls,
    syncCalls,
    ...(options.withCreate === false
      ? {}
      : {
          createStudioProject: async (name: string) => {
            createdStudioNames.push(name)
            return options.studioProjectId ?? 'studio-1'
          },
        }),
    ...(options.withOpen === false
      ? {}
      : {
          onOpenStudio: (seed: {
            pensaProjectId: string
            studioProjectId: string | null
            name: string
          }) => {
            openStudioCalls.push(seed)
          },
        }),
    ...(options.withRender === false
      ? {}
      : {
          renderStudio: (studioProjectId: string, pensaProjectId: string) =>
            createElement(
              'div',
              {
                'data-testid': 'studio-embed',
                'data-studio-project': studioProjectId,
                'data-pensa-project': pensaProjectId,
              },
              `estúdio:${studioProjectId}`,
            ),
        }),
    ...(options.withSync === false
      ? {}
      : {
          syncStudioSnapshot: (args: { pensaProjectId: string; studioProjectId: string }) => {
            syncCalls.push(args)
          },
        }),
  }
}
