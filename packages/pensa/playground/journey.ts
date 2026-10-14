/**
 * Servidor EM MEMÓRIA da jornada v2 do Pensa (14/10/2026), para o QA visual do `JourneyApp`
 * no playground (`?v2=1`). Imita as rotas `/v2/projects/*` do member-shell com a máquina de
 * estados REAL do core (`applyPensaCommand`): o que a tela recebe tem a forma do servidor, e o
 * que ele recusa ela recusa também. A preparação (proposta e missões) termina no segundo `work`,
 * como um passo durável que leva alguns segundos.
 *
 * Jogos de partida:
 * - "O ninho nas nuvens": construindo, com 4 missões (Pinta, Estúdio e Molda), 1 concluída.
 * - "Gato na lua": a proposta pronta para a criança escolher.
 * - "Robô de lata": pausado na ideia.
 * - "Corrida do Bolt": arquivado.
 * `?vazio=1` começa sem jogos (a primeira visita).
 */
import {
  applyPensaCommand,
  createPensaJourney,
  type PensaJourney,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyView,
  type PensaProposal,
  pensaZeroStage,
} from '@sistemazero/core/pensa'
import type { PensaTaskDestination, PensaTaskView } from '@sistemazero/pensa'

type TaskBuilder = (
  id: string,
  position: number,
  destination: PensaTaskDestination,
  title: string,
  dependencies?: string[],
  status?: PensaTaskView['progress']['status'],
) => PensaTaskView

interface GameRecord {
  view: PensaJourneyView
  tasks: PensaTaskView[]
  /** Quantos `work` faltam para a operação em andamento terminar. */
  ticks: number
}

const iso = () => new Date().toISOString()
const capabilities: PensaProposal['capabilities'] = {
  profileId: 'eu',
  rank: 'explorador',
  studio: true,
  pinta: true,
  molda: true,
  dimensions: ['2d', '3d'],
  blockIds: [],
  extensionIds: ['game-2d'],
  moldaTools: [],
  tutor: true,
  fingerprint: 'playground',
}

function proposalFor(intent: string): PensaProposal {
  return {
    id: crypto.randomUUID(),
    title: 'O ninho nas nuvens',
    summary:
      'Um dragãozinho voa entre as nuvens para levar um ovo de volta ao ninho. Na primeira versão ele voa com as setas e entrega um ovo.',
    firstResult: 'Seu dragão voa pela tela e leva um ovo até o ninho',
    essentials: [
      'Um dragão que voa',
      'Um ovo que precisa voltar ao ninho',
      intent.length > 80 ? `${intent.slice(0, 77)}…` : intent || 'Nuvens no céu',
    ],
    suggestions: ['Começar com uma ilha só', 'Usar as setas para voar'],
    later: [{ id: crypto.randomUUID(), text: 'Outras ilhas para visitar', origin: 'child' }],
    dimension: '2d',
    missions: [],
    test: {
      action: 'Voe com o dragão até o ovo e leve ele para o ninho.',
      expected: 'o ovo some do caminho e aparece dentro do ninho',
    },
    references: [
      { kind: 'lesson', id: 'l1', title: 'Corre Dino · Aula 2: o pulo', href: '#aula' },
      { kind: 'help', id: 'h1', title: 'Como fazer: mover com as setas', href: null },
    ],
    capabilities,
  }
}

function missions(task: TaskBuilder, prefix: string, done: number): PensaTaskView[] {
  const list = [
    task(`${prefix}-m1`, 1, 'pinta', 'Desenhe o seu dragão', []),
    task(`${prefix}-m2`, 2, 'studio', 'Faça o dragão voar com as setas', [`${prefix}-m1`]),
    task(`${prefix}-m3`, 3, 'molda', 'Modele o ovo dourado', []),
    task(`${prefix}-m4`, 4, 'studio', 'Leve o ovo até o ninho', [`${prefix}-m2`, `${prefix}-m3`]),
  ]
  const summaries = [
    'O dragão do seu jeito, pronto para entrar no jogo.',
    'Quando você aperta as setas, o dragão anda pelo céu.',
    'Um ovo brilhante para o dragão carregar.',
    'Quando o dragão encosta no ninho com o ovo, o ovo aparece lá dentro.',
  ]
  return list.map((t, index) => ({
    ...t,
    summary: summaries[index] ?? t.summary,
    progress:
      index < done
        ? {
            ...t.progress,
            status: 'completed',
            completedAt: iso(),
            startedAt: iso(),
            updatedAt: iso(),
          }
        : t.progress,
  }))
}

function message(role: 'user' | 'assistant', text: string, revision: number) {
  return { id: crypto.randomUUID(), role, text, at: iso(), revision, final: true }
}

export function createJourneyServer(task: TaskBuilder, empty: boolean) {
  const games = new Map<string, GameRecord>()

  function seed(
    id: string,
    name: string,
    patch: Partial<PensaJourney>,
    extra: Partial<GameRecord> = {},
  ): GameRecord {
    const journey = { ...createPensaJourney(id, `${id}-c1`, iso()), ...patch }
    const record: GameRecord = {
      view: {
        project: { id, name, status: 'active' },
        journey,
        operation: null,
        cycles: [{ id: `${id}-c1`, number: 1 }],
        checkpoints: [],
      },
      tasks: [],
      ticks: 0,
      ...extra,
    }
    games.set(id, record)
    return record
  }

  if (!empty) {
    const intent =
      'Um dragão que voa nas nuvens e precisa levar os ovos de volta para o ninho antes da chuva.'
    const ninhoTasks = missions(task, 'ninho', 1)
    const ninho = seed(
      'ninho',
      'O ninho nas nuvens',
      {
        stage: 'building',
        intent,
        revision: 6,
        messages: [
          message('user', intent, 1),
          message(
            'assistant',
            'Que ideia boa! Separei um começo: o dragão voa com as setas e leva um ovo até o ninho. A chuva e as outras ilhas ficam guardadas para depois.',
            2,
          ),
        ],
        missionIds: ninhoTasks.map((t) => t.id),
        backlog: [
          { id: 'b1', text: 'Uma chuva que deixa o dragão mais lento', origin: 'child' },
          { id: 'b2', text: 'Contar quantos ovos você salvou', origin: 'zappy' },
        ],
      },
      { tasks: ninhoTasks },
    )
    const ninhoProposal = proposalFor(intent)
    ninho.view.journey.proposal = ninhoProposal
    ninho.view.journey.acceptedProposalId = ninhoProposal.id

    const gatoIntent = 'Um gato astronauta que pula de cratera em cratera na lua pegando queijos.'
    seed('gato', 'Gato na lua', {
      stage: 'proposal',
      intent: gatoIntent,
      revision: 3,
      messages: [
        message('user', gatoIntent, 1),
        message(
          'assistant',
          'Entendi! Um gato que pula na lua. Pensei num começo bem pequeno para você testar logo.',
          2,
        ),
      ],
      proposal: {
        ...proposalFor(gatoIntent),
        title: 'Gato na lua',
        firstResult: 'Seu gato pula de uma cratera para outra e pega um queijo',
        summary:
          'Na primeira versão o gato pula com a barra de espaço e pega o queijo que aparece numa cratera.',
        essentials: ['Um gato astronauta', 'Pular de cratera em cratera', 'Pegar queijos'],
        suggestions: ['Pular com a barra de espaço', 'Uma cratera de cada vez'],
      },
    })
    seed('robo', 'Robô de lata', {
      stage: 'idea',
      paused: true,
      intent: 'Um robô que conserta coisas',
      revision: 2,
      messages: [message('user', 'Um robô que conserta coisas', 1)],
    })
    const bolt = seed('bolt', 'Corrida do Bolt', { stage: 'building', revision: 4 })
    bolt.view.project.status = 'archived'
  }

  function listItem(record: GameRecord): PensaJourneyListItem {
    const { view } = record
    return {
      id: view.project.id,
      name: view.project.name,
      status: view.project.status,
      cycleNumber: view.cycles.at(-1)?.number ?? 1,
      stage: pensaZeroStage(view.journey),
      lastInteractionAt: view.journey.lastInteractionAt,
      paused: view.journey.paused,
    }
  }

  function get(id: string): GameRecord {
    const record = games.get(id)
    if (!record) {
      const error = new Error('Esse jogo não existe mais.') as Error & { status: number }
      error.status = 404
      throw error
    }
    return record
  }

  function bump(record: GameRecord, patch: Partial<PensaJourney>): PensaJourneyView {
    record.view = {
      ...record.view,
      journey: {
        ...record.view.journey,
        ...patch,
        revision: record.view.journey.revision + 1,
        lastInteractionAt: iso(),
      },
    }
    return record.view
  }

  function operate(record: GameRecord, kind: 'planning' | 'help', step: 'propose' | 'guides') {
    record.ticks = 2
    record.view = {
      ...record.view,
      operation: {
        id: crypto.randomUUID(),
        projectId: record.view.project.id,
        cycleId: record.view.journey.cycleId,
        kind,
        step,
        status: 'running',
        inputRevision: record.view.journey.revision,
        attempts: 1,
        error: null,
        createdAt: iso(),
        updatedAt: iso(),
      },
    }
  }

  function finish(record: GameRecord): void {
    const operation = record.view.operation
    if (!operation || !['queued', 'running'].includes(operation.status)) return
    record.ticks -= 1
    if (record.ticks > 0) return
    const journey = record.view.journey
    if (journey.stage === 'preparing') {
      const prefix = record.view.project.id
      record.tasks = missions(task, prefix, 0)
      bump(record, { stage: 'building', missionIds: record.tasks.map((t) => t.id) })
    } else if (operation.kind === 'help') {
      bump(record, {
        messages: [
          ...journey.messages,
          message(
            'assistant',
            'Vamos tentar assim: abra a categoria Jogo 2D, procure o bloco "Mover com as setas ← →" e encaixe dentro do "A cada quadro do jogo, fazer". Depois aperte ▶ e teste as setas. O dragão andou?',
            journey.revision + 1,
          ),
        ],
      })
    } else {
      bump(record, {
        stage: 'proposal',
        proposal: proposalFor(journey.intent),
        messages: [
          ...journey.messages,
          message(
            'assistant',
            'Que ideia boa! Separei um começo pequeno para você construir primeiro. O resto fica guardado para as próximas versões.',
            journey.revision + 1,
          ),
        ],
      })
    }
    record.view = { ...record.view, operation: { ...operation, status: 'succeeded' } }
  }

  /** `undefined` = rota que não é da jornada (o servidor do legado responde). */
  async function handle(method: string, path: string, body: unknown): Promise<unknown> {
    const list = /^\/v2\/projects\?status=(active|archived)$/.exec(path)
    if (method === 'GET' && list) {
      return [...games.values()]
        .filter((g) => g.view.project.status === list[1])
        .sort((a, b) =>
          b.view.journey.lastInteractionAt.localeCompare(a.view.journey.lastInteractionAt),
        )
        .map(listItem)
    }
    if (method === 'POST' && path === '/v2/projects') {
      const id = String((body as { id?: string })?.id ?? crypto.randomUUID())
      const existing = games.get(id)
      if (existing) return existing.view
      return seed(id, 'Meu novo jogo', {}).view
    }
    const cycleStage = /^\/cycles\/([^/]+)\/stages\/z$/.exec(path)
    if (method === 'GET' && cycleStage) {
      const record = [...games.values()].find((g) => g.view.journey.cycleId === cycleStage[1])
      if (!record) return undefined
      return {
        stage: 'z',
        conversation: { messages: [], summary: null, messageCount: 0 },
        state: {},
        artifacts: [],
        tasks: record.tasks,
        nextTaskId: null,
      }
    }
    const match = /^\/v2\/projects\/([^/?]+)(?:\/([a-z]+))?$/.exec(path)
    if (!match) return undefined
    const record = get(decodeURIComponent(match[1] ?? ''))
    const action = match[2]
    const input = (body ?? {}) as Record<string, unknown>
    if (!action && method === 'GET') return record.view
    if (!action && method === 'PATCH') {
      record.view = {
        ...record.view,
        project: { ...record.view.project, status: input.status as 'active' | 'archived' },
      }
      return record.view
    }
    if (!action && method === 'DELETE') {
      games.delete(record.view.project.id)
      return { ok: true }
    }
    if (action === 'start') {
      const journey = record.view.journey
      const text = String(input.message ?? '')
      const first = !journey.intent
      bump(record, {
        intent: first ? text : journey.intent,
        messages: [...journey.messages, message('user', text, journey.revision + 1)],
        revising: false,
      })
      operate(record, input.kind === 'help' ? 'help' : 'planning', 'propose')
      return record.view
    }
    if (action === 'work') {
      if (input.retry && record.view.operation)
        record.view = { ...record.view, operation: { ...record.view.operation, status: 'running' } }
      finish(record)
      return { ok: true }
    }
    if (action === 'cancel') {
      if (record.view.operation)
        record.view = {
          ...record.view,
          operation: { ...record.view.operation, status: 'cancelled' },
        }
      return record.view
    }
    if (action === 'command') {
      const command = input.command as PensaJourneyCommand
      const next = applyPensaCommand(
        record.view.journey,
        Number(input.expectedRevision),
        command,
        iso(),
      )
      record.view = { ...record.view, journey: next }
      if (command.type === 'accept') operate(record, 'planning', 'guides')
      return record.view
    }
    if (action === 'test') {
      const journey = record.view.journey
      const test = {
        id: String(input.id),
        result: input.result as 'met' | 'needs_adjustment' | 'inconclusive',
        source: 'child' as const,
        note: String(input.note ?? ''),
        creationId: 'jogo-1',
        saveRevision: `r${journey.revision}`,
        at: iso(),
      }
      const checkpoint = {
        id: crypto.randomUUID(),
        creationId: 'jogo-1',
        saveRevision: test.saveRevision,
        planRevision: journey.revision,
        cycleId: journey.cycleId,
        createdAt: iso(),
      }
      record.view = {
        ...record.view,
        checkpoints: [...(record.view.checkpoints ?? []), checkpoint],
      }
      return bump(record, { tests: [...journey.tests, test], checkpoint })
    }
    if (action === 'close') {
      const command: PensaJourneyCommand = {
        type: 'close',
        reason: input.reason as 'met' | 'incomplete',
      }
      record.view = {
        ...record.view,
        journey: applyPensaCommand(
          record.view.journey,
          Number(input.expectedRevision),
          command,
          iso(),
        ),
      }
      return record.view
    }
    if (action === 'revise') {
      record.view = {
        ...record.view,
        journey: applyPensaCommand(
          record.view.journey,
          Number(input.expectedRevision),
          { type: 'revise' },
          iso(),
        ),
      }
      return record.view
    }
    if (action === 'increment') {
      const number = (record.view.cycles.at(-1)?.number ?? 1) + 1
      const cycleId = `${record.view.project.id}-c${number}`
      record.tasks = []
      record.view = {
        ...record.view,
        cycles: [...record.view.cycles, { id: cycleId, number }],
        journey: {
          ...createPensaJourney(record.view.project.id, cycleId, iso()),
          intent: record.view.journey.intent,
          backlog: record.view.journey.backlog,
          checkpoint: record.view.journey.checkpoint,
          revision: record.view.journey.revision + 1,
        },
      }
      return record.view
    }
    if (action === 'restore') return bump(record, {})
    throw new Error(`O playground não simula ${method} ${path}.`)
  }

  return { handle }
}
