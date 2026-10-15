import {
  canWorkOnPensaMission,
  effectivePensaRoles,
  type PensaDestination,
  type PensaJourneyTeam,
  type PensaTeamRoles,
} from '@sistemazero/core/pensa'
import { PensaMissionTakenError, PensaNotYourMissionError } from './pensa.errors'

/**
 * Equipe no Pensa v2 (14/10/2026). As REGRAS das funções moram no core (`effectivePensaRoles`,
 * `canWorkOnPensaMission`); aqui só a ponte entre as linhas cruas do banco e elas, usada pelo
 * Drizzle, pelo fake e pelos serviços (uma régua só para os três).
 */

/** Teto de pessoas nas artes num `PUT …/roles` (a equipe tem até 6: a dona + 5 que entraram). */
export const MAX_ART_ROLES = 6

/** Uma linha de `pensa_project_roles`. */
export interface PensaRoleRow {
  profileId: string
  role: 'code' | 'art'
}

/** Os papéis EFETIVOS do plano a partir das linhas cruas (quem saiu da equipe cai fora). */
export function pensaTeamRoles(
  ownerProfileId: string,
  memberProfileIds: readonly string[],
  rows: readonly PensaRoleRow[],
): PensaTeamRoles {
  return effectivePensaRoles({
    ownerProfileId,
    memberProfileIds,
    code: rows.find((row) => row.role === 'code')?.profileId ?? null,
    art: rows.filter((row) => row.role === 'art').map((row) => row.profileId),
  })
}

/** O `team` da `PensaJourneyView` (papéis efetivos, sem nomes). */
export function pensaJourneyTeam(input: {
  viewerProfileId: string
  ownerProfileId: string
  memberProfileIds: readonly string[]
  shareCode: string | null
  rows: readonly PensaRoleRow[]
}): PensaJourneyTeam {
  return {
    viewerProfileId: input.viewerProfileId,
    ownerProfileId: input.ownerProfileId,
    memberCount: input.memberProfileIds.length,
    shareEnabled: input.shareCode !== null,
    roles: pensaTeamRoles(input.ownerProfileId, input.memberProfileIds, input.rows),
  }
}

export interface PensaMissionState {
  destination: PensaDestination
  status: 'planned' | 'in_progress' | 'completed'
  assigneeProfileId: string | null
}

/**
 * Por que a pessoa NÃO pode trabalhar na missão agora (`null` = pode). `reason` é a frase que o
 * guia da missão mostra no lugar dos botões (`capability.blockedReason` do handoff).
 *
 * "Pega" = começada por OUTRA pessoa que ainda tem a função. Se quem começou saiu da equipe ou
 * perdeu a função, a missão fica livre para quem tem a função agora (senão ela travaria o plano
 * para sempre); sair e trocar as funções também limpam o `assignee` das missões não concluídas.
 */
export function pensaMissionBlock(
  mission: PensaMissionState,
  profileId: string,
  roles: PensaTeamRoles,
): { kind: 'role' | 'taken'; reason: string } | null {
  if (!canWorkOnPensaMission(mission.destination, profileId, roles))
    return {
      kind: 'role',
      reason:
        mission.destination === 'studio'
          ? 'Essa missão é de quem programa o jogo.'
          : 'Essa missão é de quem cuida das artes.',
    }
  if (
    mission.status !== 'planned' &&
    mission.assigneeProfileId !== null &&
    mission.assigneeProfileId !== profileId &&
    canWorkOnPensaMission(mission.destination, mission.assigneeProfileId, roles)
  )
    return { kind: 'taken', reason: 'Outra pessoa da equipe já está fazendo essa missão.' }
  return null
}

/** A mesma régua, lançando os erros da rota de progresso (403 e 409). */
export function assertPensaMissionWorker(
  mission: PensaMissionState,
  profileId: string,
  roles: PensaTeamRoles,
): void {
  const block = pensaMissionBlock(mission, profileId, roles)
  if (block?.kind === 'role') throw new PensaNotYourMissionError()
  if (block?.kind === 'taken') throw new PensaMissionTakenError()
}

/**
 * O que gravar de `assignee`/`completed_by` numa mudança de progresso de missão v2: ao sair de
 * `planned` a missão fica com quem a mexeu; concluir grava quem concluiu; fora de `completed`,
 * `completed_by` volta a `null`.
 */
export function pensaMissionOwnership(
  current: { assigneeProfileId: string | null; completedByProfileId: string | null },
  nextStatus: 'planned' | 'in_progress' | 'completed',
  profileId: string,
): { assigneeProfileId: string | null; completedByProfileId: string | null } {
  return {
    assigneeProfileId: nextStatus === 'planned' ? current.assigneeProfileId : profileId,
    completedByProfileId: nextStatus === 'completed' ? profileId : null,
  }
}
