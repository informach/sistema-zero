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
 *
 * `?equipe=1` (14/10/2026) simula a EQUIPE do v2 (as rotas novas do BFF: `…/team`, `…/roles`,
 * `…/share`, `…/members/:id`, `POST /v2/projects/join`) com as regras do core
 * (`effectivePensaRoles`, `canWorkOnPensaMission`):
 * - "O ninho nas nuvens" é MEU, com a Bia nas artes (eu programo) e o código ZAP-AAAAAB ligado.
 *   A Bia já desenhou o dragão; a minha missão é a do Estúdio. 25 s depois de abrir, a Bia COMEÇA
 *   o ovo no Molda (o compasso de 20 s da tela mostra).
 * - "A torre da Bia" é DELA e eu entrei: ela programa, eu faço as artes, e a minha missão espera
 *   a programação dela ("Esperando a programação de Bia").
 * - "O castelo do Leo" é do Leo e está FORA da minha lista: digite ZAP-CCCCCC em "Entrar com um
 *   código" para entrar.
 * Sem `?equipe=1` o servidor é o anterior à equipe (sem `role`/`team`): a tela fica como antes.
 */
import {
  applyPensaCommand,
  createPensaJourney,
  effectivePensaRoles,
  type PensaJourney,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyTeamView,
  type PensaJourneyView,
  type PensaProposal,
  type PensaTeamPerson,
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

/** A equipe de um jogo: quem é a dona, quem entrou, as funções CRUAS e o código. */
interface TeamRecord {
  owner: PensaTeamPerson
  members: PensaTeamPerson[]
  /** `code: null` = a dona programa; `art: []` = quem programa também desenha. */
  roles: { code: string | null; art: string[] }
  shareCode: string | null
}

interface GameRecord {
  view: PensaJourneyView
  tasks: PensaTaskView[]
  /** Quantos `work` faltam para a operação em andamento terminar. */
  ticks: number
  team?: TeamRecord
}

const ME = 'perfil-eu'
const iso = () => new Date().toISOString()
const person = (profileId: string, firstName: string, owner: boolean): PensaTeamPerson => ({
  profileId,
  firstName,
  photoUrl: null,
  owner,
  joinedAt: owner ? null : iso(),
})
const EU = person(ME, 'Helena', true)
const BIA = person('perfil-bia', 'Bia', true)
const LEO = person('perfil-leo', 'Leo', true)

/** Um erro com `status`, como o transporte do host entrega (o `run` da tela relê no 409). */
function refuse(status: number, message: string): never {
  throw Object.assign(new Error(message), { status })
}

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

export function createJourneyServer(task: TaskBuilder, empty: boolean, withTeam = false) {
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

    if (withTeam) seedTeam(ninho)
  }

  /** A equipe do `?equipe=1`: o ninho com a Bia, a torre da Bia e o castelo do Leo. */
  function seedTeam(ninho: GameRecord): void {
    const bia = { ...BIA, owner: false, joinedAt: iso() }
    ninho.team = {
      owner: EU,
      members: [bia],
      roles: { code: null, art: [bia.profileId] },
      shareCode: 'AAAAAB',
    }
    // A Bia (artes) já desenhou o dragão; a missão do Estúdio é minha.
    ninho.tasks = ninho.tasks.map((t) =>
      t.progress.status === 'completed'
        ? { ...t, assigneeProfileId: bia.profileId, completedByProfileId: bia.profileId }
        : t,
    )

    const torreIntent = 'Uma torre de cubos que a gente sobe pulando antes que a lava chegue.'
    const torreTasks = [
      task('torre-m1', 1, 'studio', 'Faça o herói pular com o espaço', [], 'in_progress'),
      task('torre-m2', 2, 'pinta', 'Desenhe a lava que sobe', ['torre-m1']),
      task('torre-m3', 3, 'studio', 'Faça a lava subir devagar', ['torre-m2']),
    ].map((t) =>
      t.progress.status === 'in_progress' ? { ...t, assigneeProfileId: BIA.profileId } : t,
    )
    const torre = seed(
      'torre',
      'A torre da Bia',
      {
        stage: 'building',
        intent: torreIntent,
        revision: 5,
        messages: [
          message('user', torreIntent, 1),
          message(
            'assistant',
            'Que torre boa! Primeiro o herói pula; depois a lava sobe. A lava é com quem desenha.',
            2,
          ),
        ],
        missionIds: torreTasks.map((t) => t.id),
      },
      { tasks: torreTasks },
    )
    const torreProposal = {
      ...proposalFor(torreIntent),
      title: 'A torre da Bia',
      firstResult: 'O herói pula de cubo em cubo',
    }
    torre.view.journey.proposal = torreProposal
    torre.view.journey.acceptedProposalId = torreProposal.id
    torre.team = {
      owner: BIA,
      members: [{ ...EU, owner: false, joinedAt: iso() }],
      roles: { code: null, art: [ME] },
      shareCode: 'BIATOR',
    }

    const castelo = seed('castelo', 'O castelo do Leo', {
      stage: 'idea',
      intent: 'Um castelo de areia que a onda tenta derrubar.',
      revision: 1,
      messages: [message('user', 'Um castelo de areia que a onda tenta derrubar.', 1)],
    })
    castelo.team = { owner: LEO, members: [], roles: { code: null, art: [] }, shareCode: 'CCCCCC' }

    // A Bia COMEÇA o ovo no Molda: o compasso de 20 s da tela mostra a mudança no caminho.
    setTimeout(() => {
      ninho.tasks = ninho.tasks.map((t) =>
        t.destination === 'molda' && t.progress.status === 'planned'
          ? {
              ...t,
              assigneeProfileId: bia.profileId,
              progress: {
                ...t.progress,
                status: 'in_progress',
                startedAt: iso(),
                updatedAt: iso(),
              },
            }
          : t,
      )
    }, 25_000)
  }

  /** Papéis EFETIVOS (a regra do core), nunca as linhas cruas. */
  function rolesOf(team: TeamRecord) {
    return effectivePensaRoles({
      ownerProfileId: team.owner.profileId,
      memberProfileIds: team.members.map((m) => m.profileId),
      code: team.roles.code,
      art: team.roles.art,
    })
  }
  /** Sem `?equipe=1` todo jogo é só meu e sem equipe; com ele, o jogo ganha uma equipe vazia. */
  function teamOf(record: GameRecord): TeamRecord | undefined {
    if (!withTeam) return undefined
    record.team ??= { owner: EU, members: [], roles: { code: null, art: [] }, shareCode: null }
    return record.team
  }
  const inTeam = (team: TeamRecord) =>
    team.owner.profileId === ME || team.members.some((m) => m.profileId === ME)
  /** O jogo começou no Estúdio de quem programa: missão do Estúdio andando ou versão guardada. */
  const codeLocked = (record: GameRecord) =>
    Boolean(record.view.checkpoints?.length) ||
    record.tasks.some((t) => t.destination === 'studio' && t.progress.status !== 'planned')

  /** A view como o servidor novo a entrega: com `role` e `team` (papéis efetivos, sem nomes). */
  function decorate(view: PensaJourneyView): PensaJourneyView {
    const record = games.get(view.project.id)
    const team = record ? teamOf(record) : undefined
    if (!team) return view
    return {
      ...view,
      role: team.owner.profileId === ME ? 'owner' : 'member',
      team: {
        viewerProfileId: ME,
        ownerProfileId: team.owner.profileId,
        memberCount: team.members.length,
        shareEnabled: team.shareCode !== null,
        roles: rolesOf(team),
      },
    }
  }

  function listItem(record: GameRecord): PensaJourneyListItem {
    const { view } = record
    const team = teamOf(record)
    return {
      id: view.project.id,
      name: view.project.name,
      status: view.project.status,
      cycleNumber: view.cycles.at(-1)?.number ?? 1,
      stage: pensaZeroStage(view.journey),
      lastInteractionAt: view.journey.lastInteractionAt,
      paused: view.journey.paused,
      ...(team
        ? {
            role: team.owner.profileId === ME ? ('owner' as const) : ('member' as const),
            team: {
              memberCount: team.members.length,
              ownerFirstName: team.owner.profileId === ME ? null : team.owner.firstName,
            },
          }
        : {}),
    }
  }

  /** Quem não está na equipe não vê o jogo (404, como o `accessible` do members). */
  function get(id: string): GameRecord {
    const record = games.get(id)
    const team = record ? teamOf(record) : undefined
    if (!record || (team && !inTeam(team))) refuse(404, 'Esse jogo não existe mais.')
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

  /** As réguas de quem pode o quê (spec §1.4): só a dona; só quem programa. */
  function ownerOnly(record: GameRecord): void {
    const team = teamOf(record)
    if (team && team.owner.profileId !== ME) refuse(403, 'Só quem criou o plano pode fazer isso.')
  }
  function programmerOnly(record: GameRecord): void {
    const team = teamOf(record)
    if (team && rolesOf(team).code !== ME)
      refuse(403, 'Quem testa e guarda as versões é quem programa o jogo.')
  }

  /** As rotas da EQUIPE (`?equipe=1`). `undefined` = não é rota de equipe. */
  function handleTeam(method: string, path: string, body: unknown): unknown {
    if (method === 'POST' && path === '/v2/projects/join') {
      const typed = String((body as { code?: unknown })?.code ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^ZAP/, '')
      const found = [...games.values()].find((g) => g.team?.shareCode === typed)
      if (!found?.team)
        refuse(404, 'Esse código não abriu nenhum jogo. Confira com quem te chamou.')
      if (found.team.owner.profileId === ME) refuse(409, 'Esse jogo já é seu.')
      if (!found.team.members.some((m) => m.profileId === ME)) {
        if (found.team.members.length >= 5) refuse(409, 'Essa equipe já está cheia.')
        found.team.members = [...found.team.members, { ...EU, owner: false, joinedAt: iso() }]
      }
      return { projectId: found.view.project.id }
    }
    const match = /^\/v2\/projects\/([^/?]+)\/(team|roles|share|members)(?:\/([^/]+))?$/.exec(path)
    if (!match) return undefined
    const record = get(decodeURIComponent(match[1] ?? ''))
    const team = teamOf(record)
    if (!team) return undefined
    const route = match[2]
    if (route === 'team' && method === 'GET') {
      const view: PensaJourneyTeamView = {
        viewerProfileId: ME,
        role: team.owner.profileId === ME ? 'owner' : 'member',
        shareCode: team.owner.profileId === ME ? team.shareCode : null,
        maxMembers: 5,
        roles: rolesOf(team),
        people: [team.owner, ...team.members],
        codeLocked: codeLocked(record),
      }
      return view
    }
    if (route === 'roles' && method === 'PUT') {
      ownerOnly(record)
      const input = body as { code: string; art: string[] }
      const ids = new Set([team.owner.profileId, ...team.members.map((m) => m.profileId)])
      if (!ids.has(input.code) || input.art.some((id) => !ids.has(id)))
        refuse(400, 'Escolha só pessoas da equipe.')
      if (codeLocked(record) && input.code !== rolesOf(team).code)
        refuse(
          409,
          'O jogo já começou no Estúdio de quem programa. Essa função não muda mais neste plano.',
        )
      team.roles = {
        code: input.code === team.owner.profileId ? null : input.code,
        art: [...input.art],
      }
      return decorate(bump(record, {}))
    }
    if (route === 'share') {
      ownerOnly(record)
      if (method === 'POST') {
        team.shareCode = Array.from(
          { length: 6 },
          () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)],
        ).join('')
        return { code: team.shareCode, display: `ZAP-${team.shareCode}` }
      }
      if (method === 'DELETE') {
        team.shareCode = null
        return { ok: true }
      }
    }
    if (route === 'members' && method === 'DELETE' && match[3]) {
      const who = match[3] === 'me' ? ME : decodeURIComponent(match[3])
      if (who === team.owner.profileId) refuse(409, 'Quem criou o plano não sai dele: pode apagar.')
      if (who !== ME) ownerOnly(record)
      // Sair ou ser tirada apaga as funções da pessoa; quem programava devolve à dona.
      team.members = team.members.filter((m) => m.profileId !== who)
      team.roles = {
        code: team.roles.code === who ? null : team.roles.code,
        art: team.roles.art.filter((id) => id !== who),
      }
      return { ok: true }
    }
    return undefined
  }

  /** `undefined` = rota que não é da jornada (o servidor do legado responde). */
  async function handleJourney(method: string, path: string, body: unknown): Promise<unknown> {
    const list = /^\/v2\/projects\?status=(active|archived)$/.exec(path)
    if (method === 'GET' && list) {
      return [...games.values()]
        .filter((g) => g.view.project.status === list[1])
        .filter((g) => {
          const team = teamOf(g)
          return !team || inTeam(team)
        })
        .sort((a, b) =>
          b.view.journey.lastInteractionAt.localeCompare(a.view.journey.lastInteractionAt),
        )
        .map(listItem)
    }
    if (withTeam) {
      const handled = handleTeam(method, path, body)
      if (handled !== undefined) return handled
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
      ownerOnly(record)
      // Renomear (15/10/2026) ou arquivar/trazer de volta.
      record.view = {
        ...record.view,
        project: {
          ...record.view.project,
          ...(typeof input.name === 'string' ? { name: input.name.trim() } : {}),
          ...(input.status ? { status: input.status as 'active' | 'archived' } : {}),
        },
      }
      return record.view
    }
    if (!action && method === 'DELETE') {
      ownerOnly(record)
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
      if (['observe', 'record_test', 'repair', 'close', 'revise'].includes(command.type))
        programmerOnly(record)
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
    if (['test', 'close', 'revise', 'increment', 'restore'].includes(action ?? ''))
      programmerOnly(record)
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

  /** Toda view que sai passa pelo `decorate` (o servidor novo manda `role`/`team` sempre). */
  async function handle(method: string, path: string, body: unknown): Promise<unknown> {
    const result = await handleJourney(method, path, body)
    if (result && typeof result === 'object' && 'journey' in result && 'project' in result)
      return decorate(result as PensaJourneyView)
    return result
  }

  return { handle }
}
