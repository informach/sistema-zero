import {
  nextPensaMission,
  nextPensaMissionFor,
  type PensaJourneyTeam,
  pensaCodeTransitionInstructions,
} from '@sistemazero/core/pensa'
import type { PensaTaskView } from '../../lib/types'

/**
 * Qual missão é a de AGORA (full review de 14/10/2026). Puro: o Pensa (ajuda) e o tutor do
 * Estúdio leem a mesma régua, e nenhum dos dois pode escolher "a última missão do Estúdio" (era o
 * que o tutor fazia quando a próxima era do Pinta: a criança abria a integração do desenho e o
 * Zappy falava do teste final do jogo).
 */

/** A próxima elegível, preferindo a que já está em andamento (régua do core). */
export function currentPensaTask(
  tasks: readonly PensaTaskView[],
  team?: PensaJourneyTeam,
): PensaTaskView | null {
  if (team && team.memberCount > 0) {
    const next = nextPensaMissionFor(
      tasks.map((task) => ({
        id: task.id,
        dependencies: task.dependencies,
        status: task.progress.status,
        evidenceCurrent: true,
        destination: task.destination,
        assigneeProfileId: task.assigneeProfileId ?? null,
      })),
      team.viewerProfileId,
      team.roles,
    )
    return tasks.find((task) => task.id === next.mine) ?? null
  }
  const id = nextPensaMission(
    tasks.map((task) => ({
      id: task.id,
      dependencies: task.dependencies,
      status: task.progress.status,
      evidenceCurrent: true,
    })),
  )
  return tasks.find((task) => task.id === id) ?? null
}

/**
 * A missão do Estúdio que o tutor deve conhecer: a que a criança ABRIU (`pensaTaskId`, só se for
 * deste plano e do Estúdio) ou, sem ela, a PRIMEIRA do Estúdio ainda não concluída na ordem do
 * plano. Com tudo concluído não há missão de agora, e o tutor responde sem ela.
 */
export function studioTutorTask(
  tasks: readonly PensaTaskView[],
  pensaTaskId?: string | null,
): PensaTaskView | null {
  const opened = pensaTaskId
    ? tasks.find((task) => task.id === pensaTaskId && task.destination === 'studio')
    : undefined
  if (opened) return opened
  return (
    [...tasks]
      .filter((task) => task.destination === 'studio' && task.progress.status !== 'completed')
      .sort((a, b) => a.position - b.position)[0] ?? null
  )
}

const clip = (value: string | null | undefined, max: number) =>
  Array.from(value ?? '')
    .slice(0, max)
    .join('')

/** A missão e os passos do guia dela, curtos, para o modelo. */
export function missionForModel(
  task: PensaTaskView,
  studioAuthoring: 'blocks' | 'code' = 'blocks',
) {
  const transition =
    studioAuthoring === 'code' &&
    task.context.kind === 'studio' &&
    task.context.authoring !== 'code'
  return {
    title: clip(task.title, 120),
    result: clip(task.summary, 300),
    destination: task.destination,
    status: task.progress.status,
    authoring: task.context.kind === 'studio' ? studioAuthoring : undefined,
    steps: (transition ? pensaCodeTransitionInstructions() : task.guide.steps)
      .slice(0, 8)
      .map((step) => ({
        action: clip(step.text, 180),
        hint: clip(step.hint, 300),
      })),
    test: task.guide.criteria.slice(0, 2).map((criterion) => ({
      action: clip(criterion.text, 200),
      expected: clip(criterion.hint, 200),
    })),
  }
}
