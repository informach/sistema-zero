import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import type {
  PensaCheckpoint,
  PensaMessage,
  PensaMission,
  PensaProjectListItem,
  PensaProjectView,
} from '@sistemazero/core/pensa'
import { PROFILE_ID, PROJECT_ID, projectFixture } from '../src/components/pensa.fixture'
import { PensaApiError, type PensaTransport } from '../src/core/types'

/**
 * As cenas do playground (`?cena=`), uma por quadro do Canvas: `lista`, `vazio`, `organizando`,
 * `pergunta`, `proposta`, `projeto` (padrão), `mudanca`, `pronto`, `esperando`, `tropeco`,
 * `ideias`, `abrindo`, `falha`, `pausado` e `suporte`.
 */
export type PlaygroundScene =
  | 'lista'
  | 'vazio'
  | 'organizando'
  | 'pergunta'
  | 'proposta'
  | 'projeto'
  | 'mudanca'
  | 'pronto'
  | 'esperando'
  | 'tropeco'
  | 'ideias'
  | 'abrindo'
  | 'falha'
  | 'pausado'
  | 'suporte'

const ANA_ID = '10000000-0000-4000-8000-0000000000a1'
const now = () => new Date().toISOString()
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

/** Development-only server: exercises the final contract without a provider or account. */
export function createProjectServer(
  input: boolean | { scene?: PlaygroundScene } = false,
): PensaTransport {
  const scene: PlaygroundScene =
    typeof input === 'boolean' ? (input ? 'vazio' : 'projeto') : (input.scene ?? 'projeto')
  const projects = new Map<string, PensaProjectView>()
  const checkpoints = new Map<string, PensaCheckpoint[]>()
  for (const view of seed(scene)) projects.set(view.project.id, view)
  const credits: AiCreditsView = {
    dayLimit: 50,
    dayRemaining: scene === 'ideias' ? 0 : 13,
    monthLimit: 500,
    monthRemaining: 300,
    monthRenewsOn: '2026-11-01',
  }
  return {
    async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
      const method = init?.method ?? 'GET'
      const body = init?.body && typeof init.body === 'object' ? init.body : {}
      const parts = path.split('?')[0]!.split('/').filter(Boolean)
      if (scene === 'suporte' && method !== 'GET')
        throw new PensaApiError('A sessão de suporte é só leitura.', 403, 'IMPERSONATION_READONLY')
      let result: unknown
      if (parts[0] === 'credits') return { credits } as T
      if (parts[0] === 'missions') {
        const view = [...projects.values()].find((item) =>
          item.revision?.plan.missions.some((mission) => mission.id === parts[1]),
        )
        const mission = view?.revision?.plan.missions.find((item) => item.id === parts[1])
        const progress = view?.progress.find((item) => item.missionId === parts[1])
        const availability = view?.availability.find((item) => item.missionId === parts[1])
        if (!view?.revision || !mission || !progress || !availability)
          throw new Error('Essa missão não está neste jogo.')
        return structuredClone({
          project: view.project,
          projectRevisionId: view.revision.id,
          mission,
          progress,
          availability,
          nextAction: view.nextAction,
          studioProjectId: `pensa-${view.project.id.replaceAll('-', '')}`,
          studioAuthoring: view.studioAuthoring,
          team: view.team,
          assetSlots: view.revision.definition.assetSlots,
          extensions: view.revision.technical.extensions,
          references: [],
          gameCreation: null,
          restoredSaveRevision: null,
        }) as T
      }
      if (parts.length === 1 && parts[0] === 'projects' && method === 'GET') {
        if (scene === 'abrindo') return new Promise<T>(() => {})
        if (scene === 'falha') throw new Error('O servidor não respondeu.')
        result = [...projects.values()]
          .filter(
            (view) => view.project.status === (path.includes('archived') ? 'archived' : 'active'),
          )
          .map(
            (view): PensaProjectListItem => ({
              project: view.project,
              summary: view.revision?.definition.summary ?? view.draft?.definition?.summary ?? null,
              completedMissions: view.progress.filter((item) => item.status === 'completed').length,
              totalMissions: view.revision?.plan.missions.length ?? 0,
              needsReview: view.progress.filter((item) => item.validity === 'needs_review').length,
              lifecycle: !view.revision
                ? 'defining'
                : view.nextAction.type === 'completed'
                  ? 'completed'
                  : 'building',
              memberCount: view.team.memberCount,
            }),
          )
      } else if (parts[0] === 'projects' && parts[1] === 'join' && method === 'POST') {
        const code = 'code' in body && typeof body.code === 'string' ? body.code : ''
        const match = [...projects.values()].find((view) => view.team.shareCode === code)
        if (!match) throw new Error('Esse código não abre nenhum jogo. Confira com o seu amigo.')
        result = { projectId: match.project.id }
      } else if (parts.length === 1 && method === 'POST') {
        const view = demoProject(crypto.randomUUID())
        if ('message' in body && typeof body.message === 'string') {
          view.revision!.definition.originalIntent = body.message
          view.messages = [message(view, 'user', body.message)]
        }
        view.project.name = 'Meu jogo novo'
        candidate(view)
        view.revision = null
        view.progress = []
        view.availability = []
        view.draft!.baseRevisionId = null
        view.nextAction = { type: 'accept_draft', draftId: view.draft!.id }
        projects.set(view.project.id, view)
        result = view
      } else {
        const view = projects.get(parts[1] ?? '')
        if (!view) throw new Error('Esse jogo não está neste playground.')
        if (parts.length === 2 && method === 'DELETE') {
          projects.delete(view.project.id)
          result = null
        } else if (parts.length === 2 && method === 'PATCH') {
          if ('name' in body && typeof body.name === 'string') view.project.name = body.name
          if ('paused' in body && typeof body.paused === 'boolean')
            view.project.paused = body.paused
          if ('status' in body && (body.status === 'active' || body.status === 'archived'))
            view.project.status = body.status
          view.project.metadataRevision += 1
          view.project.updatedAt = now()
          result = view
        } else if (parts[2] === 'messages') {
          const text = 'message' in body && typeof body.message === 'string' ? body.message : ''
          const kind = 'kind' in body && body.kind === 'help' ? 'help' : 'planning'
          if (text) view.messages.push({ ...message(view, 'user', text), kind })
          if (kind === 'help') {
            view.messages.push({
              ...message(
                view,
                'assistant',
                'Boa pergunta. Confira o "Pronto quando" da missão e teste uma parte de cada vez. A página [Como fazer](/como-fazer) tem exemplos.',
              ),
              kind,
            })
          } else if (view.revision) {
            changeDraft(view)
            view.messages.push(
              message(
                view,
                'assistant',
                'Preparei a mudança. Confira o que muda antes de aceitar.',
              ),
            )
          } else {
            view.operation = null
            candidate(view)
          }
          result = view
        } else if (parts[2] === 'operations') {
          if (parts[4] === 'cancel') {
            view.operation = view.operation ? { ...view.operation, status: 'cancelled' } : null
          } else if ('retry' in body && body.retry === true && view.operation) {
            view.operation = { ...view.operation, status: 'running', error: null }
          }
          result = view
        } else if (parts[2] === 'draft' && parts[3] === 'accept') {
          acceptDraft(view)
          result = view
        } else if (parts[2] === 'draft' && method === 'DELETE') {
          view.draft = null
          result = view
        } else if (parts[2] === 'share') {
          view.team.shareCode = method === 'DELETE' ? null : 'ZAP-ABC123'
          view.project.updatedAt = now()
          result = view
        } else if (parts[2] === 'members') {
          view.team.people = view.team.people.filter((person) => person.profileId !== parts[3])
          view.team.memberCount = view.team.people.length - 1
          view.project.teamRevision += 1
          result = view
        } else if (parts[2] === 'roles') {
          if ('programmerProfileId' in body && typeof body.programmerProfileId === 'string')
            view.team.programmerProfileId = body.programmerProfileId
          if ('artistProfileIds' in body && Array.isArray(body.artistProfileIds))
            view.team.artistProfileIds = body.artistProfileIds.filter(
              (id): id is string => typeof id === 'string',
            )
          view.project.teamRevision += 1
          result = view
        } else if (parts[2] === 'checkpoints') {
          const list = checkpoints.get(view.project.id) ?? []
          if (method === 'POST' && !parts[3]) {
            list.unshift({
              id: crypto.randomUUID(),
              projectId: view.project.id,
              projectRevisionId: view.revision!.id,
              creation: view.gameCreation!,
              status: 'ready',
              createdAt: now(),
            })
            checkpoints.set(view.project.id, list)
            result = { ok: true }
          } else if (method === 'POST') result = { ok: true }
          else result = list
        } else result = view
      }
      return structuredClone(result) as T
    },
  }
}

function message(
  view: PensaProjectView,
  role: 'user' | 'assistant',
  text: string,
  minutesAgo = 0,
): PensaMessage {
  return {
    id: crypto.randomUUID(),
    projectId: view.project.id,
    role,
    kind: 'planning',
    text,
    revision: 1,
    profileId: view.team.viewerProfileId,
    missionId: null,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  }
}

function candidate(view: PensaProjectView) {
  const source = view.revision ?? demoProject(view.project.id).revision!
  view.draft = {
    id: crypto.randomUUID(),
    projectId: view.project.id,
    revision: 1,
    baseRevisionId: view.revision?.id ?? null,
    status: 'ready',
    definition: structuredClone(source.definition),
    plan: structuredClone(source.plan),
    technical: structuredClone(source.technical),
    pendingChoices: [],
    impact: null,
    affectedProgressVersions: {},
    capabilitiesFingerprint: 'demo',
    acceptedRevisionId: null,
    updatedAt: now(),
  }
  if (!view.revision) view.nextAction = { type: 'accept_draft', draftId: view.draft.id }
}

function acceptDraft(view: PensaProjectView) {
  const template = demoProject(view.project.id).revision!
  if (view.draft?.definition && view.draft.plan && view.draft.technical)
    view.revision = {
      ...template,
      id: view.revision ? crypto.randomUUID() : template.id,
      projectId: view.project.id,
      definition: {
        ...view.draft.definition,
        requirements: view.draft.definition.requirements.map((item) => ({
          ...item,
          origin: item.origin === 'suggestion' ? 'accepted_suggestion' : item.origin,
        })),
        adaptations: view.draft.definition.adaptations.map((item) => ({
          ...item,
          acceptedAt: item.acceptedAt ?? now(),
          acceptedByProfileId: item.acceptedByProfileId ?? view.team.viewerProfileId,
        })),
      },
      plan: view.draft.plan,
      technical: view.draft.technical,
    }
  const firstAccept = view.progress.length === 0
  view.draft = null
  if (!firstAccept) return
  view.progress = view.revision!.plan.missions.map((mission) => ({
    ...projectFixture().progress[0]!,
    missionId: mission.id,
  }))
  view.availability = view.revision!.plan.missions.map((mission, index) => ({
    ...projectFixture().availability[0]!,
    missionId: mission.id,
    available: index === 0,
    reason: index === 0 ? null : 'dependency_pending',
    message: index === 0 ? null : 'Faça primeiro a missão anterior.',
  }))
  view.nextAction = {
    type: 'mission',
    missionId: view.revision!.plan.missions[0]!.id,
    destination: 'studio',
    mode: 'build',
  }
}

/** A mudança "trocar os animais por dinossauros": muda a missão 3 e pede reconferir a 8. */
function changeDraft(view: PensaProjectView) {
  candidate(view)
  const draft = view.draft!
  const missions = draft.plan!.missions
  draft.definition!.summary = 'Encontre os seis pares de dinossauros.'
  const third = missions[2]!
  third.objective = 'Agora com seis pares de dinossauros.'
  missions[7]!.objective = 'As cartas novas também precisam embaralhar no recomeço.'
  draft.impact = {
    addedMissionIds: [],
    removedMissionIds: [],
    changedMissionIds: [third.id],
    editorialMissionIds: [],
    reorderedMissionIds: [],
    reviewMissionIds: [missions[7]!.id],
    affectedRequirementIds: [],
  }
}

/** Avança o progresso do exemplo: as `done` primeiras missões ficam prontas. */
function withProgress(view: PensaProjectView, done: number) {
  const missions = view.revision!.plan.missions
  view.progress = missions.map((mission, index) => ({
    ...view.progress[0]!,
    missionId: mission.id,
    status: index < done ? 'completed' : 'planned',
    completedAt: index < done ? hoursAgo(48 - index) : null,
    completedByProfileId: index < done ? PROFILE_ID : null,
  }))
  view.availability = missions.map((mission, index) => ({
    ...view.availability[0]!,
    missionId: mission.id,
    available: index === done,
    reason: index < done ? 'completed' : index === done ? null : 'dependency_pending',
    message:
      index > done
        ? `Esta missão abre depois da missão ${index}, ${missions[index - 1]!.title}.`
        : null,
  }))
  const next = missions[done]
  view.nextAction = next
    ? { type: 'mission', missionId: next.id, destination: next.destination, mode: 'build' }
    : { type: 'completed' }
}

function withTeam(view: PensaProjectView) {
  view.team = {
    ...view.team,
    memberCount: 1,
    shareCode: 'ZAP-ABC123',
    artistProfileIds: [ANA_ID],
    people: [
      { profileId: PROFILE_ID, firstName: 'Lipe', photoUrl: null, owner: true, joinedAt: null },
      { profileId: ANA_ID, firstName: 'Ana', photoUrl: null, owner: false, joinedAt: hoursAgo(30) },
    ],
  }
}

function seed(scene: PlaygroundScene): PensaProjectView[] {
  if (scene === 'vazio') return []
  const main = demoProject()
  withTeam(main)
  withProgress(main, 3)
  main.project.updatedAt = hoursAgo(50)
  main.messages = [
    message(
      main,
      'assistant',
      'As cartas já aparecem embaralhadas. Agora a missão é deixar escolher duas de cada vez.',
      30,
    ),
    message(main, 'user', 'Posso trocar os animais por dinossauros?', 20),
    message(
      main,
      'assistant',
      'Pode. Isso muda as cartas da missão 3, que já está pronta. Se quiser, eu preparo a mudança para você conferir.',
      19,
    ),
  ]
  main.gameCreation = {
    tool: 'studio',
    profileId: PROFILE_ID,
    creationId: `pensa-${PROJECT_ID.replaceAll('-', '')}`,
    saveRevision: '4',
    contentFingerprint: null,
  }
  if (scene === 'projeto' || scene === 'suporte') return [main, ...others()]
  if (scene === 'lista') return [main, ...others(), archived()]
  if (scene === 'ideias') return [main]
  if (scene === 'pausado') {
    main.project.paused = true
    main.availability = main.availability.map((item) =>
      item.reason === 'completed'
        ? item
        : { ...item, available: false, reason: 'paused', message: 'O jogo está pausado.' },
    )
    return [main]
  }
  if (scene === 'pronto') {
    withProgress(main, main.revision!.plan.missions.length)
    return [main]
  }
  if (scene === 'esperando') {
    const fourth = main.revision!.plan.missions[3]!
    main.progress[3] = { ...main.progress[3]!, status: 'in_progress', assigneeProfileId: ANA_ID }
    main.availability[3] = {
      ...main.availability[3]!,
      available: false,
      reason: 'claimed',
      message: 'A Ana está com esta missão.',
    }
    main.nextAction = {
      type: 'waiting',
      missionId: fourth.id,
      reason: 'Quando a Ana conferir a missão Deixe escolher duas cartas, chega a sua vez.',
    }
    return [main]
  }
  if (scene === 'mudanca') {
    main.messages.push(message(main, 'user', 'Troque os animais por dinossauros.', 5))
    changeDraft(main)
    main.messages.push(message(main, 'assistant', 'Preparei a mudança para você conferir.', 4))
    return [main]
  }
  // Cenas antes do aceite: um jogo novo, ainda sem plano.
  const fresh = demoProject('20000000-0000-4000-8000-000000000001')
  fresh.project.name = 'Memória dos animais'
  const idea =
    'Um jogo da memória com doze cartas de animais. Eu viro duas cartas. Se forem iguais, ficam abertas.'
  fresh.messages = [message(fresh, 'user', idea, 2)]
  fresh.revision!.definition.originalIntent = idea
  if (scene === 'proposta') {
    candidate(fresh)
    const definition = fresh.draft!.definition!
    definition.requirements.at(-1)!.origin = 'suggestion'
    definition.requirements.at(-1)!.text = 'Um relógio de 60 segundos no canto da tela.'
    definition.adaptations = [
      {
        id: '20000000-0000-4000-8000-0000000000a9',
        originalIntent: 'As cartas giram em 3D quando viram.',
        limitation: 'Girar a carta em 3D ainda não abre para você no Estúdio.',
        alternative: 'A carta troca de desenho com um efeito de virar.',
        preserved: 'Virar duas cartas e procurar o par.',
        acceptedByProfileId: null,
        acceptedAt: null,
      },
    ]
  } else if (scene === 'pergunta') {
    candidate(fresh)
    fresh.draft!.status = 'needs_choice'
    fresh.draft!.pendingChoices = [
      {
        id: 'erro',
        kind: 'rule',
        question: 'Quando o jogador vira duas cartas diferentes, o que acontece?',
        options: [
          {
            id: 'fecha',
            label: 'Elas fecham sozinhas',
            description: 'Depois de um segundo, as duas viram de novo.',
          },
          {
            id: 'vida',
            label: 'Perde uma vida',
            description: 'São três vidas. Sem vidas, o jogo acaba.',
          },
          {
            id: 'tempo',
            label: 'Perde tempo',
            description: 'O relógio anda mais rápido por um instante.',
          },
        ],
      },
    ]
    fresh.messages.push(
      message(
        fresh,
        'assistant',
        'Gostei das cartas de animais. Para montar o plano, preciso saber uma coisa:',
        1,
      ),
    )
    fresh.nextAction = { type: 'define' }
  } else {
    fresh.draft = null
    fresh.nextAction = { type: 'define' }
    fresh.operation = {
      id: '20000000-0000-4000-8000-0000000000b1',
      projectId: fresh.project.id,
      draftId: null,
      kind: 'planning',
      step: 'outline',
      status: scene === 'tropeco' ? 'failed' : 'running',
      calls: 2,
      error: scene === 'tropeco' ? 'A conexão caiu. A sua ideia está guardada.' : null,
      createdAt: hoursAgo(0.05),
      updatedAt: now(),
    }
  }
  fresh.revision = null
  fresh.progress = []
  fresh.availability = []
  return [fresh]
}

function others(): PensaProjectView[] {
  const gato = demoProject('30000000-0000-4000-8000-000000000001')
  gato.project.name = 'Gato dos telhados'
  gato.revision!.definition.summary =
    'Um gato pula de telhado em telhado e pega peixes antes de a lua sumir.'
  candidate(gato)
  gato.revision = null
  gato.progress = []
  gato.availability = []
  gato.project.updatedAt = now()
  const corrida = demoProject('40000000-0000-4000-8000-000000000001')
  corrida.project.name = 'Corrida no espaço'
  corrida.revision!.definition.summary = 'Jogo da equipe da Bia. Você faz as artes.'
  withProgress(corrida, 5)
  corrida.team = { ...corrida.team, memberCount: 1 }
  corrida.project.updatedAt = hoursAgo(26)
  return [gato, corrida]
}

function archived(): PensaProjectView {
  const view = demoProject('50000000-0000-4000-8000-000000000001')
  view.project.name = 'Labirinto do robô'
  view.project.status = 'archived'
  view.revision!.definition.summary = 'Um robô procura a saída antes de a bateria acabar.'
  withProgress(view, 2)
  return view
}

export function demoProject(projectId = PROJECT_ID): PensaProjectView {
  const view = projectFixture()
  const revision = view.revision!
  const setup = revision.plan.missions[0]!
  const id = (value: number) => `${projectId.slice(0, 24)}${String(value).padStart(12, '0')}`
  view.project.id = projectId
  revision.projectId = projectId
  revision.id = id(3)
  setup.id = id(4)
  setup.stageId = id(5)
  setup.title = 'Prepare o Estúdio para o seu jogo'
  view.team.people[0]!.firstName = 'Lipe'
  revision.plan.stages = ['Preparar', 'Jogar', 'Finalizar', 'Conferir'].map((title, position) => ({
    id: id(position === 0 ? 5 : position + 8),
    title,
    position,
  }))
  const slotId = id(60)
  revision.definition.assetSlots = [
    {
      id: slotId,
      name: 'Cartas dos animais',
      kind: 'sprite',
      description: 'Doze cartas com seis animais diferentes.',
      source: 'create',
      existing: null,
    },
  ]
  revision.definition.playerExperience = 'Vire duas cartas e procure um par.'
  revision.definition.openChoices = [
    { id: 'verso', text: 'A cor do verso das cartas e o som de quando um par aparece.' },
  ]
  revision.definition.futureIdeas = [
    { id: id(70), text: 'Um relógio para contar o tempo da partida', origin: 'child' },
    { id: id(71), text: 'Cartas com sons dos animais', origin: 'zappy' },
  ]
  const specs = [
    [
      'Desenhe as cartas dos animais',
      'Seis animais, cada um numa carta, e um verso igual para todas.',
      'Abra os desenhos.',
      'Há seis animais diferentes e um verso.',
    ],
    [
      'Crie e distribua as cartas',
      'Prepare seis pares e embaralhe as posições.',
      'Comece uma partida.',
      'Há seis pares e todos começam com os desenhos escondidos.',
    ],
    [
      'Deixe escolher duas cartas',
      'O jogador escolhe duas cartas diferentes.',
      'Escolha duas cartas e tente uma terceira.',
      'Só as duas ficam abertas.',
    ],
    [
      'Mantenha os pares abertos',
      'Um par certo fica aberto até o fim da partida.',
      'Escolha duas cartas iguais.',
      'Elas ficam abertas e não entram nas próximas escolhas.',
    ],
    [
      'Esconda as cartas diferentes',
      'Depois de uma pausa, as cartas diferentes fecham.',
      'Escolha duas cartas diferentes e clique em outra durante a pausa.',
      'Nenhuma outra carta abre durante a pausa; depois as duas fecham.',
    ],
    [
      'Mostre quando terminar',
      'Avise quando todos os pares forem encontrados.',
      'Encontre os seis pares.',
      'A mensagem de vitória aparece só depois do último par.',
    ],
    [
      'Deixe jogar de novo',
      'Uma nova partida começa com tudo preparado de novo.',
      'Reinicie depois da vitória.',
      'As cartas embaralham, as escolhas somem e a vitória desaparece.',
    ],
    [
      'Jogue uma partida completa',
      'Confira as regras juntas do começo ao fim.',
      'Jogue uma partida, erre um par e depois vença e reinicie.',
      'Acertos, erros, pausa, vitória e reinício funcionam juntos.',
    ],
  ]
  revision.definition.requirements = specs.slice(0, -1).map((spec, index) => ({
    id: id(index + 100),
    text: spec[1]!,
    origin: 'child',
    category: index === 0 ? 'visual' : 'gameplay',
  }))
  const rules: Record<number, { id: string; text: string }[]> = {
    2: [{ id: 'clique', text: 'Um clique vira a carta. Só duas cartas ficam abertas por vez.' }],
    3: [
      { id: 'iguais', text: 'Duas cartas iguais ficam viradas para cima.' },
      { id: 'fora', text: 'Um par aberto não entra nas próximas escolhas.' },
    ],
  }
  const missions: PensaMission[] = [setup]
  for (const [index, [title, objective, action, expected]] of specs.entries()) {
    const base = {
      id: id(index + 20),
      contentRevision: 1,
      stageId: revision.plan.stages[index < 2 ? 0 : index < 5 ? 1 : index < 7 ? 2 : 3]!.id,
      position: index + 1,
      title: title!,
      objective: objective!,
      requirementIds:
        index === specs.length - 1
          ? revision.definition.requirements.map((item) => item.id)
          : [id(index + 100)],
      rules: rules[index] ?? [],
      checks: [{ id: 'result', action: action!, expected: expected! }],
      dependencyIds: [missions.at(-1)!.id],
    }
    missions.push(
      index === 0
        ? { ...base, kind: 'asset', destination: 'pinta', assetSlotIds: [slotId] }
        : index === 1
          ? { ...base, kind: 'integration', destination: 'studio', assetSlotIds: [slotId] }
          : index === specs.length - 1
            ? { ...base, kind: 'playtest', destination: 'studio', scope: 'project' }
            : { ...base, kind: 'feature', destination: 'studio' },
    )
  }
  revision.plan.missions = missions
  revision.technical.missionResources = missions.map((mission) => ({
    missionId: mission.id,
    blockIds: [],
    extensionIds: mission.destination === 'studio' ? ['game-2d-advanced'] : [],
    moldaToolIds: [],
    manualIds: [],
  }))
  view.progress = missions.map((mission) => ({ ...view.progress[0]!, missionId: mission.id }))
  view.availability = missions.map((mission, index) => ({
    ...view.availability[0]!,
    missionId: mission.id,
    available: index === 0,
    reason: index === 0 ? null : 'dependency_pending',
    message: index === 0 ? null : 'Faça primeiro a missão anterior.',
  }))
  view.nextAction = { type: 'mission', missionId: setup.id, destination: 'studio', mode: 'build' }
  return view
}
