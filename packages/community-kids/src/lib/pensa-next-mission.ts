import type { PensaJourneyView } from '@sistemazero/core/pensa'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { PensaStageView } from '@sistemazero/pensa'

/** Para onde a próxima missão leva: uma oficina, ou `null` = de volta ao plano. */
export type PensaNextDestination = PensaStageView['tasks'][number]['destination'] | null

export interface PensaNextMission {
  path: string
  destination: PensaNextDestination
}

/**
 * Descobre a próxima missão SEM navegar. O guia usa isto para dizer o destino no botão
 * ("Continuar no Pinta") antes do clique, e o clique usa de novo (o plano pode ter mudado).
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
  const next = stage.tasks.find(
    (t) => t.id === stage.nextTaskId && view.journey.missionIds.includes(t.id),
  )
  if (!next) return { path: planner, destination: null }
  return {
    path: `/${next.destination === 'studio' ? 'estudio' : next.destination}?tarefa=${encodeURIComponent(next.id)}`,
    destination: next.destination,
  }
}

export async function openNextPensaMission(projectId: string, navigate: (path: string) => void) {
  const next = await resolveNextPensaMission(projectId)
  navigate(next.path)
}

/**
 * O rótulo do botão quando a próxima missão é em OUTRA oficina. Na mesma oficina (ou de volta
 * ao plano) o guia usa o rótulo de sempre ("Continuar meu caminho"): `undefined`.
 */
export function nextMissionLabel(
  destination: PensaNextDestination,
  current: 'studio' | 'pinta' | 'molda',
): string | undefined {
  if (!destination || destination === current) return undefined
  if (destination === 'studio') return 'Continuar no Estúdio'
  if (destination === 'pinta') return 'Continuar no Pinta'
  if (destination === 'molda') return 'Continuar no Molda'
  return undefined
}
