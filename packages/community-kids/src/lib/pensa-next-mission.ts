import {
  nextPensaMissionFor,
  type PensaJourneyView,
  type PensaTeamMissionProgress,
} from '@sistemazero/core/pensa'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { PensaStageView } from '@sistemazero/pensa'

/** Para onde a próxima missão leva: uma oficina, ou `null` = de volta ao plano. */
export type PensaNextDestination = PensaStageView['tasks'][number]['destination'] | null

export interface PensaNextMission {
  path: string
  destination: PensaNextDestination
  /**
   * Plano EM EQUIPE sem nenhuma missão desta criança agora (a próxima é da colega, ou ela está
   * esperando a arte de alguém): o botão diz "Voltar ao plano", onde ela vê quem está fazendo o
   * quê. Ausente no plano solo, que segue com o rótulo de sempre.
   */
  backToPlan?: true
}

type StageTask = PensaStageView['tasks'][number]

/**
 * O andamento de uma missão para a régua da equipe (`nextPensaMissionFor` do core). A pessoa que
 * COMEÇOU a missão (`assigneeProfileId`) chega no handoff/etapa a partir do servidor da equipe;
 * servidor anterior (sem o campo) = ninguém começou, e a régua cai na de papéis.
 */
function teamProgress(task: StageTask): PensaTeamMissionProgress {
  const assignee = (task as StageTask & { assigneeProfileId?: unknown }).assigneeProfileId
  return {
    id: task.id,
    dependencies: task.dependencies ?? [],
    status: task.progress?.status ?? 'planned',
    evidenceCurrent: true,
    destination: task.destination,
    assigneeProfileId: typeof assignee === 'string' ? assignee : null,
  }
}

function missionPath(task: StageTask): string {
  return `/${task.destination === 'studio' ? 'estudio' : task.destination}?tarefa=${encodeURIComponent(task.id)}`
}

/**
 * Descobre a próxima missão SEM navegar. O guia usa isto para dizer o destino no botão
 * ("Continuar no Pinta") antes do clique, e o clique usa de novo (o plano pode ter mudado).
 *
 * ⭐ Em EQUIPE (14/10/2026) a próxima missão é a próxima que é DESTA criança pelos papéis do
 * plano (`nextPensaMissionFor` com os papéis da view): a artista nunca é levada à missão do
 * Estúdio de quem programa (o servidor a recusaria), e sem missão dela o caminho é o plano.
 */
export async function resolveNextPensaMission(projectId: string): Promise<PensaNextMission> {
  const read = await sessionFetch(`/api/pensa/v2/projects/${encodeURIComponent(projectId)}`)
  if (!read.ok) throw new Error('Não consegui abrir seu caminho.')
  const view = (await read.json()) as PensaJourneyView
  const planner = `/pensa?plano=${encodeURIComponent(projectId)}`
  if (
    view.project.status !== 'active' ||
    view.journey.paused ||
    view.journey.stage !== 'building'
  ) {
    return { path: planner, destination: null }
  }
  const response = await sessionFetch(`/api/pensa/cycles/${view.journey.cycleId}/stages/z`)
  if (!response.ok) throw new Error('Não consegui abrir a próxima missão.')
  const stage = (await response.json()) as PensaStageView
  const team = view.team
  if (team && team.memberCount > 0) {
    const missions = stage.tasks.filter((t) => view.journey.missionIds.includes(t.id))
    const { mine } = nextPensaMissionFor(
      missions.map(teamProgress),
      team.viewerProfileId,
      team.roles,
    )
    const next = missions.find((t) => t.id === mine)
    if (!next) return { path: planner, destination: null, backToPlan: true }
    return { path: missionPath(next), destination: next.destination }
  }
  const next = stage.tasks.find(
    (t) => t.id === stage.nextTaskId && view.journey.missionIds.includes(t.id),
  )
  if (!next) return { path: planner, destination: null }
  return { path: missionPath(next), destination: next.destination }
}

export async function openNextPensaMission(projectId: string, navigate: (path: string) => void) {
  const next = await resolveNextPensaMission(projectId)
  navigate(next.path)
}

/**
 * O rótulo do botão quando a próxima missão é em OUTRA oficina. Na mesma oficina (ou de volta
 * ao plano) o guia usa o rótulo de sempre ("Continuar meu caminho"): `undefined`. Em equipe sem
 * missão desta criança (`backToPlan`), o botão diz para onde vai: "Voltar ao plano".
 */
export function nextMissionLabel(
  destination: PensaNextDestination,
  current: 'studio' | 'pinta' | 'molda',
  options?: { backToPlan?: boolean },
): string | undefined {
  if (options?.backToPlan) return 'Voltar ao plano'
  if (!destination || destination === current) return undefined
  if (destination === 'studio') return 'Continuar no Estúdio'
  if (destination === 'pinta') return 'Continuar no Pinta'
  if (destination === 'molda') return 'Continuar no Molda'
  return undefined
}
