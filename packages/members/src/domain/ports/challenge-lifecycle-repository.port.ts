export const CHALLENGE_BEHAVIOR_MESSAGE_KINDS = [
  'not_activated',
  'not_started',
  'day_one_complete',
  'completed',
] as const

export type ChallengeBehaviorMessageKind = (typeof CHALLENGE_BEHAVIOR_MESSAGE_KINDS)[number]

/**
 * Estado agregado de uma compra do Desafio. Progresso só entra quando o perfil
 * possui uma relação explícita e não ambígua com `accountId` dentro do Members.
 */
export interface ChallengeLifecycleCandidate {
  entitlementId: string
  accountId: string
  grantedAt: Date
  expiresAt: Date
  courseRef: string
  started: boolean
  dayOneComplete: boolean
  completed: boolean
  sentKinds: ChallengeBehaviorMessageKind[]
}

export interface ChallengeLifecycleRepository {
  listCandidates(now: Date, limit: number): Promise<ChallengeLifecycleCandidate[]>
  markMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: ChallengeBehaviorMessageKind,
    now: Date,
  ): Promise<void>
}
