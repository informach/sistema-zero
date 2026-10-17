import type { PensaMission, PensaProjectListItem, PensaProjectView } from '@sistemazero/core/pensa'
import type { PensaTransport } from '@sistemazero/pensa'
import { PROJECT_ID, projectFixture } from '../src/components/pensa.fixture'

/** Development-only server: exercises the final contract without a provider or account. */
export function createProjectServer(empty: boolean): PensaTransport {
  const projects = new Map<string, PensaProjectView>()
  if (!empty) {
    const example = demoProject()
    projects.set(example.project.id, example)
  }
  return {
    async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
      const method = init?.method ?? 'GET'
      const body = init?.body && typeof init.body === 'object' ? init.body : {}
      const parts = path.split('?')[0]!.split('/').filter(Boolean)
      let result: unknown
      if (parts[0] === 'credits') return { credits: null } as T
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
              needsReview: 0,
              lifecycle: view.revision ? 'building' : 'defining',
              memberCount: view.team.memberCount,
            }),
          )
      } else if (parts.length === 1 && method === 'POST') {
        const view = demoProject(crypto.randomUUID())
        if ('message' in body && typeof body.message === 'string')
          view.revision!.definition.originalIntent = body.message
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
          result = view
        } else if (parts[2] === 'messages') {
          if ('message' in body && typeof body.message === 'string')
            view.messages.push({
              id: crypto.randomUUID(),
              projectId: view.project.id,
              role: 'user',
              kind: 'planning',
              text: body.message,
              revision: 1,
              profileId: view.team.viewerProfileId,
              missionId: null,
              createdAt: new Date().toISOString(),
            })
          candidate(view)
          result = view
        } else if (parts[2] === 'draft' && parts[3] === 'accept') {
          const template = demoProject(view.project.id).revision!
          if (view.draft?.definition && view.draft.plan && view.draft.technical)
            view.revision = {
              ...template,
              projectId: view.project.id,
              definition: view.draft.definition,
              plan: view.draft.plan,
              technical: view.draft.technical,
            }
          view.draft = null
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
          result = view
        } else if (parts[2] === 'draft' && method === 'DELETE') {
          view.draft = null
          result = view
        } else if (parts[2] === 'share') {
          view.team.shareCode = method === 'DELETE' ? null : 'ZAP-ABC123'
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
        } else result = view
      }
      return structuredClone(result) as T
    },
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
    definition: source.definition,
    plan: source.plan,
    technical: source.technical,
    pendingChoices: [],
    impact: null,
    affectedProgressVersions: {},
    capabilitiesFingerprint: 'demo',
    acceptedRevisionId: null,
    updatedAt: new Date().toISOString(),
  }
  if (!view.revision) view.nextAction = { type: 'accept_draft', draftId: view.draft.id }
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
  revision.plan.stages = ['Preparar', 'Jogar', 'Finalizar', 'Conferir'].map((title, position) => ({
    id: id(position === 0 ? 5 : position + 8),
    title,
    position,
  }))
  const specs = [
    [
      'Organize a área das cartas',
      'Reserve espaço para doze cartas.',
      'Veja o tabuleiro.',
      'As doze cartas cabem sem ficar por cima umas das outras.',
    ],
    [
      'Crie e distribua as cartas',
      'Prepare seis pares e embaralhe suas posições.',
      'Comece uma partida.',
      'Há seis pares e todos começam com os desenhos escondidos.',
    ],
    [
      'Deixe escolher duas cartas',
      'O jogador pode escolher duas cartas diferentes.',
      'Escolha duas cartas e tente escolher uma terceira.',
      'Só duas cartas diferentes ficam abertas por vez.',
    ],
    [
      'Mantenha os pares encontrados abertos',
      'Um par certo permanece visível.',
      'Escolha duas cartas iguais.',
      'Elas permanecem abertas e não entram nas próximas escolhas.',
    ],
    [
      'Esconda as cartas diferentes',
      'Depois de uma pausa, as cartas diferentes fecham.',
      'Escolha duas cartas diferentes e clique em outra durante a pausa.',
      'Nenhuma outra carta abre durante a pausa; depois as duas fecham.',
    ],
    [
      'Mostre quando o jogo terminar',
      'Avise quando todos os pares forem encontrados.',
      'Encontre os seis pares.',
      'A mensagem de vitória aparece somente depois do último par.',
    ],
    [
      'Deixe jogar novamente',
      'Uma nova partida começa com tudo preparado de novo.',
      'Reinicie depois da vitória.',
      'Cartas são embaralhadas, escolhas anteriores são limpas e a vitória desaparece.',
    ],
    [
      'Experimente uma partida completa',
      'Confira as regras juntas do começo ao fim.',
      'Jogue uma partida, erre um par e depois vença e reinicie.',
      'Acertos, erros, pausa, vitória e reinício funcionam juntos.',
    ],
  ]
  revision.definition.requirements = specs.slice(0, -1).map((spec, index) => ({
    id: id(index + 100),
    text: spec[1]!,
    origin: 'child',
    category: 'gameplay',
  }))
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
      rules: [],
      checks: [{ id: 'result', action: action!, expected: expected! }],
      dependencyIds: [missions.at(-1)!.id],
    }
    missions.push(
      index === specs.length - 1
        ? { ...base, kind: 'playtest', destination: 'studio', scope: 'project' }
        : { ...base, kind: 'feature', destination: 'studio' },
    )
  }
  revision.plan.missions = missions
  revision.technical.missionResources = missions.map((mission) => ({
    missionId: mission.id,
    blockIds: [],
    extensionIds: ['game-2d-advanced'],
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
