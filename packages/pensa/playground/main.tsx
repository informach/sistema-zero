/**
 * Playground de DEV do Pensa (11/09/2026): monta o <PensaApp> com um SERVIDOR EM MEMÓRIA, sem
 * subir o community-kids (que exige banco e login). Os planos imitam os das telas-modelo: o
 * "Runo" aprovado (as quatro etapas vencidas, cartões para o Estúdio, o Pinta e o Molda) e o
 * "Guardiões da Lua" parado na etapa R. Criar um plano novo funciona (nasce na etapa Z) e o chat
 * do Zappy responde com uma frase pronta, em pedaços, como o SSE de verdade.
 *
 * Parâmetros:
 * - `?host=1`: o chrome de HOST de mentira (o botão do menu, que alterna o estado local, e a
 *   seta "Voltar para Criar", que loga no console em vez de navegar).
 * - `?theme=dark`: o tema escuro.
 * - `?vazio=1`: começa sem planos (o primeiro uso).
 *
 * O que o servidor não simula (gerar artefato, avançar etapa, editar cartão) responde com um
 * erro legível, que a tela mostra no alerta dela.
 */

import {
  PensaApp,
  type PensaArtifactView,
  type PensaChatHandlers,
  type PensaChatInput,
  type PensaCycleView,
  type PensaHostAdapter,
  type PensaHostChrome,
  PensaHostChromeProvider,
  type PensaProjectDetailView,
  type PensaProjectListView,
  type PensaStage,
  type PensaStageView,
  type PensaTaskDestination,
  type PensaTaskView,
} from '@sistemazero/pensa'
import { type JSX, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type WorkStage = Exclude<PensaStage, 'done'>

const params = new URLSearchParams(window.location.search)
const hostDemo = params.get('host') === '1'
const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
const empty = params.get('vazio') === '1'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const now = Date.now()
const ago = (ms: number): string => new Date(now - ms).toISOString()

// ── os planos ────────────────────────────────────────────────────────────────────────────

interface PlanRecord {
  detail: PensaProjectDetailView
  stages: Partial<Record<PensaStage, PensaStageView>>
}

function cycle(id: string, stage: PensaStage, done: WorkStage[]): PensaCycleView {
  const at = (s: WorkStage) => (done.includes(s) ? ago(3 * DAY) : null)
  return {
    id,
    number: 1,
    goal: null,
    stage,
    zCompletedAt: at('z'),
    eCompletedAt: at('e'),
    rCompletedAt: at('r'),
    oCompletedAt: at('o'),
  }
}

function artifact(
  id: string,
  stage: PensaStage,
  type: PensaArtifactView['type'],
  content: unknown,
): PensaArtifactView {
  return { id, stage, type, version: 1, status: 'validated', content, createdAt: ago(3 * DAY) }
}

function task(
  id: string,
  position: number,
  destination: PensaTaskDestination,
  title: string,
  dependencies: string[] = [],
  status: PensaTaskView['progress']['status'] = 'planned',
): PensaTaskView {
  const context: PensaTaskView['context'] =
    destination === 'pinta'
      ? {
          kind: 'pinta',
          assetId: `${id}-asset`,
          artKind: 'sprite',
          style: 'pixel',
          palette: [{ role: 'herói', color: '#2563eb' }],
          appearance: 'Contorno escuro e cores vivas.',
          animations: ['correr'],
          states: [],
          usage: 'Personagem principal.',
          requiresStudioUse: true,
        }
      : destination === 'molda'
        ? {
            kind: 'molda',
            assetId: `${id}-asset`,
            artKind: 'model',
            appearance: 'Troféu dourado brilhante.',
            usage: 'Aparece na chegada.',
            palette: [],
          }
        : {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: ['g2d:arrowsX'],
            blocks: [
              {
                id: 'g2d:arrowsX',
                label: 'Mover com as setas ← →',
                category: 'Jogo 2D',
                subcategory: 'Movimento',
                area: 'loops',
                extension: 'game-2d',
              },
            ],
            mechanicDocumentIds: ['game-2d'],
            extensionIds: ['game-2d'],
          }
  return {
    id,
    title,
    summary: 'Um cartão pequeno e claro.',
    destination,
    category: destination === 'studio' ? 'gameplay' : 'art',
    estimatedMinutes: 20,
    position,
    dependencies,
    guide: {
      steps: [{ id: `${id}-step`, text: 'Fazer a parte principal', required: true }],
      criteria: [{ id: `${id}-criterion`, text: 'Funciona no jogo', required: true }],
    },
    context,
    progress: {
      status,
      completedStepIds: [],
      completedCriteriaIds: [],
      outputRef: null,
      startedAt: status === 'planned' ? null : ago(DAY),
      completedAt: status === 'completed' ? ago(DAY) : null,
      updatedAt: status === 'planned' ? null : ago(DAY),
    },
    revision: 1,
    supersedesTaskId: null,
  }
}

const RUNO_IDEA = {
  title: 'Runo: Corrida de Superação',
  idea: 'Um jogo de corrida de rua visto de cima, onde o jogador controla um personagem usando as setas para os lados. Durante a corrida aparecem 5 tipos de obstáculos e 5 tipos de estímulos. O jogador precisa desviar dos obstáculos e coletar os estímulos para chegar ao destino dentro do tempo.',
  objective:
    'Chegar ao destino antes do tempo acabar, coletando estímulos e desviando dos obstáculos para não perder todas as vidas.',
  controls: [
    'Seta para a esquerda: move para a esquerda',
    'Seta para a direita: move para a direita',
  ],
  victory: 'Chega ao fim do percurso dentro do tempo, usando os estímulos para ajudar.',
  defeat: 'Perde todas as vidas batendo nos obstáculos ou não chega ao destino a tempo.',
  dimension: '2d',
}

const RUNO_CHAT = [
  {
    role: 'user' as const,
    at: ago(3 * DAY + 20 * MINUTE),
    content:
      'Um jogo de corrida de rua, à medida que ele corre ele enfrenta 5 tipos de obstáculos e 5 tipos de estímulo. Para o jogo não ficar visualmente carregado, eu usaria 5 obstáculos e 5 estímulos principais, todos fáceis de reconhecer em pixel art.',
  },
  {
    role: 'assistant' as const,
    at: ago(3 * DAY + 19 * MINUTE),
    content:
      'Que ideia boa! Uma corrida em que cada obstáculo atrapalha de um jeito diferente fica fácil de entender. Como a pessoa vai controlar o Runo?\nSUGESTÕES: Com as setas para os lados | Com toque na tela | Com a barra de espaço',
  },
  {
    role: 'user' as const,
    at: ago(3 * DAY + 18 * MINUTE),
    content: 'Com as setas para os lados. E vence quem chegar ao destino antes do tempo acabar.',
  },
  {
    role: 'assistant' as const,
    at: ago(3 * DAY + 17 * MINUTE),
    content:
      'Perfeito: setas para os lados e uma corrida contra o tempo. Já dá para montar a Carta da Ideia!',
  },
]

const RUNO_DESIGN = {
  coreLoop: ['correr', 'desviar dos obstáculos', 'pegar estímulos', 'chegar ao destino'],
  scenes: [{ id: 'rua', name: 'Rua da cidade', purpose: 'A corrida inteira acontece aqui.' }],
  screens: [
    { id: 'inicio', name: 'Tela de início', purpose: 'Começar a corrida.' },
    { id: 'fim', name: 'Tela de chegada', purpose: 'Mostrar o tempo e as vidas.' },
  ],
  camera: 'Vista de cima, seguindo o Runo.',
}

const RUNO_VISUAL = {
  style: 'Pixel art simples, com contorno escuro.',
  camera: 'De cima.',
  mood: 'Animado e colorido.',
  shapeLanguage: 'Formas redondas para o que ajuda, pontudas para o que atrapalha.',
  palette: [
    { role: 'herói', color: '#2563eb' },
    { role: 'perigo', color: '#dc2626' },
    { role: 'estímulo', color: '#16a34a' },
  ],
  visualRules: ['Perigos sempre vermelhos', 'Estímulos sempre brilham'],
  screens: [{ screenId: 'inicio', description: 'Título grande e o Runo parado na largada.' }],
  assets: [
    {
      id: 'runo',
      name: 'Runo',
      kind: 'sprite',
      appearance: 'Um corredor de tênis azul.',
      animations: ['correr'],
      states: ['cansado'],
      usage: 'Personagem principal.',
    },
  ],
}

const RUNO_TASKS: PensaTaskView[] = [
  task('runo-art-1', 0, 'pinta', 'Desenhar o Runo correndo', [], 'completed'),
  task('runo-art-2', 1, 'pinta', 'Desenhar os obstáculos', ['runo-art-1']),
  task('runo-3d-1', 2, 'molda', 'Modelar o troféu da chegada'),
  task('runo-code-1', 3, 'studio', 'Programar as setas', ['runo-art-1']),
  task('runo-code-2', 4, 'studio', 'Programar os obstáculos', ['runo-art-2', 'runo-code-1']),
  task('runo-code-3', 5, 'studio', 'Programar o tempo e a chegada', ['runo-code-2']),
]

const emptyConversation = { messages: [], summary: null, messageCount: 0 }

function stageView(
  stage: PensaStage,
  extra: Partial<Omit<PensaStageView, 'stage'>> = {},
): PensaStageView {
  return {
    stage,
    conversation: emptyConversation,
    state: {},
    artifacts: [],
    tasks: [],
    nextTaskId: null,
    ...extra,
  }
}

function runo(): PlanRecord {
  const c = cycle('runo-cycle', 'done', ['z', 'e', 'r', 'o'])
  return {
    detail: {
      id: 'runo',
      name: 'Runo',
      status: 'active',
      createdAt: ago(5 * DAY),
      updatedAt: ago(2 * DAY),
      cycles: [c],
      currentCycle: c,
      artifactsIndex: [],
    },
    stages: {
      z: stageView('z', {
        conversation: { messages: RUNO_CHAT, summary: null, messageCount: RUNO_CHAT.length },
        state: {
          answered: { idea: true, objective: true, controls: true, outcome: true, dimension: true },
          ready: true,
        },
        artifacts: [artifact('runo-idea', 'z', 'idea', RUNO_IDEA)],
      }),
      e: stageView('e', {
        artifacts: [
          artifact('runo-design', 'e', 'game_design', RUNO_DESIGN),
          artifact('runo-visual', 'e', 'visual_direction', RUNO_VISUAL),
        ],
      }),
      r: stageView('r', {
        artifacts: [
          artifact('runo-plan', 'r', 'task_plan', {
            taskIds: RUNO_TASKS.map((item) => item.id),
            generatedAt: ago(3 * DAY),
          }),
        ],
        tasks: RUNO_TASKS,
      }),
      o: stageView('o', {
        artifacts: [artifact('runo-review', 'o', 'plan_review', { approved: true, findings: [] })],
        tasks: RUNO_TASKS,
      }),
      done: stageView('done', { tasks: RUNO_TASKS, nextTaskId: 'runo-art-2' }),
    },
  }
}

function guardioes(): PlanRecord {
  const c = cycle('lua-cycle', 'r', ['z', 'e'])
  return {
    detail: {
      id: 'guardioes-da-lua',
      name: 'Guardiões da Lua',
      status: 'active',
      createdAt: ago(4 * DAY),
      updatedAt: ago(DAY + 2 * 60 * MINUTE),
      cycles: [c],
      currentCycle: c,
      artifactsIndex: [],
    },
    stages: {
      z: stageView('z', {
        artifacts: [
          artifact('lua-idea', 'z', 'idea', {
            title: 'Guardiões da Lua',
            idea: 'Dois guardiões protegem a Lua de meteoros que caem do céu.',
            objective: 'Proteger a Lua até o sol nascer.',
            controls: ['Setas: mover o guardião', 'Espaço: escudo'],
            victory: 'A Lua chega inteira ao amanhecer.',
            defeat: 'Três meteoros acertam a Lua.',
            dimension: '2d',
          }),
        ],
      }),
      e: stageView('e', {
        artifacts: [
          artifact('lua-design', 'e', 'game_design', RUNO_DESIGN),
          artifact('lua-visual', 'e', 'visual_direction', RUNO_VISUAL),
        ],
      }),
      r: stageView('r'),
    },
  }
}

const plans = new Map<string, PlanRecord>(
  empty ? [] : [runo(), guardioes()].map((plan) => [plan.detail.id, plan]),
)

function listView(plan: PlanRecord): PensaProjectListView {
  return {
    id: plan.detail.id,
    name: plan.detail.name,
    status: plan.detail.status,
    cycleNumber: plan.detail.currentCycle.number,
    stage: plan.detail.currentCycle.stage,
    createdAt: plan.detail.createdAt,
    updatedAt: plan.detail.updatedAt,
  }
}

function newPlan(name: string): PlanRecord {
  const id = `plano-${Math.random().toString(36).slice(2, 8)}`
  const c = cycle(`${id}-cycle`, 'z', [])
  const greeting = {
    role: 'assistant' as const,
    at: new Date().toISOString(),
    content: `Oi! Vamos planejar o ${name}. Me conta: que jogo você imagina?\nSUGESTÕES: Um jogo de corrida | Um jogo de plataforma | Um jogo de nave`,
  }
  return {
    detail: {
      id,
      name,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cycles: [c],
      currentCycle: c,
      artifactsIndex: [],
    },
    stages: {
      z: stageView('z', {
        conversation: { messages: [greeting], summary: null, messageCount: 1 },
        state: {
          answered: {
            idea: false,
            objective: false,
            controls: false,
            outcome: false,
            dimension: false,
          },
          ready: false,
        },
      }),
    },
  }
}

// ── o transporte ─────────────────────────────────────────────────────────────────────────

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function notSimulated(method: string, path: string): Error {
  return new Error(`O playground não simula ${method} ${path}.`)
}

const transport: PensaHostAdapter['transport'] = {
  async request<T>(
    path: string,
    init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown },
  ): Promise<T> {
    const method = init?.method ?? 'GET'
    // Um tiquinho de latência: o "Preparando seu mapa…" aparece como no app de verdade.
    await pause(120)
    if (method === 'GET' && path === '/projects') {
      const projects = [...plans.values()]
        .map(listView)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return { projects } as T
    }
    if (method === 'POST' && path === '/projects') {
      const name = String((init?.body as { name?: unknown } | undefined)?.name ?? '').trim()
      const plan = newPlan(name || 'Meu jogo')
      plans.set(plan.detail.id, plan)
      return { project: plan.detail } as T
    }
    const project = /^\/projects\/([^/]+)$/.exec(path)
    if (method === 'GET' && project) {
      const plan = plans.get(decodeURIComponent(project[1] ?? ''))
      if (!plan) throw new Error('Esse plano não existe mais.')
      return { project: plan.detail } as T
    }
    const stage = /^\/cycles\/([^/]+)\/stages\/([^/]+)$/.exec(path)
    if (method === 'GET' && stage) {
      const plan = [...plans.values()].find((item) => item.detail.currentCycle.id === stage[1])
      const view = plan?.stages[stage[2] as PensaStage]
      if (!view) throw new Error('Essa etapa ainda não tem nada para mostrar.')
      return view as T
    }
    throw notSimulated(method, path)
  },

  streamChat(input: PensaChatInput, handlers: PensaChatHandlers): () => void {
    const plan = [...plans.values()].find((item) => item.detail.id === input.projectId)
    const view = plan?.stages.z
    if (!plan || !view) {
      handlers.onError(new Error('Esse plano não existe mais.'))
      return () => {}
    }
    const reply =
      'Adorei! Agora me conta: o que a pessoa precisa fazer para ganhar?\nSUGESTÕES: Chegar ao fim da fase | Juntar 10 estrelas | Sobreviver 2 minutos'
    const pieces = reply.match(/.{1,12}/gs) ?? [reply]
    let index = 0
    let cancelled = false
    const userMessage = {
      role: 'user' as const,
      at: new Date().toISOString(),
      content: input.message,
    }
    const tick = () => {
      if (cancelled) return
      const piece = pieces[index]
      if (piece === undefined) {
        const messages = [
          ...view.conversation.messages,
          userMessage,
          { role: 'assistant' as const, at: new Date().toISOString(), content: reply },
        ]
        plan.stages.z = {
          ...view,
          conversation: { messages, summary: null, messageCount: messages.length },
          state: {
            answered: {
              idea: true,
              objective: false,
              controls: false,
              outcome: false,
              dimension: false,
            },
            ready: false,
          },
        }
        plan.detail = { ...plan.detail, updatedAt: new Date().toISOString() }
        handlers.onDone()
        return
      }
      index += 1
      handlers.onDelta(piece)
      timer = setTimeout(tick, 40)
    }
    let timer = setTimeout(tick, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  },
}

// ── o host de mentira ────────────────────────────────────────────────────────────────────

// Fora do componente: identidade estável, como a do host de verdade (`useHostChrome`).
const DEMO_BACK: PensaHostChrome['back'] = {
  label: 'Voltar para Criar',
  href: '#criar',
  onNavigate: () => console.log('[playground] voltar para Criar'),
}

function DemoHostChrome({ children }: { children: JSX.Element }): JSX.Element {
  const [hidden, setHidden] = useState(false)
  const chrome: PensaHostChrome = {
    menu: {
      hidden,
      label: hidden ? 'Mostrar menu' : 'Esconder menu',
      onToggle: () => setHidden((value) => !value),
    },
    back: DEMO_BACK,
  }
  return <PensaHostChromeProvider value={chrome}>{children}</PensaHostChromeProvider>
}

const adapter: PensaHostAdapter = {
  transport,
  mode: 'kids',
  theme,
  capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
  onOpenTask: ({ taskId, destination }) =>
    console.log('[playground] abrir o cartão', { taskId, destination }),
}

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

const app = <PensaApp adapter={adapter} />

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {hostDemo ? <DemoHostChrome>{app}</DemoHostChrome> : app}
    </div>
  </StrictMode>,
)
