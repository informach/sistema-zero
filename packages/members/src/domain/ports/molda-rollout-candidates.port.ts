export interface MoldaRolloutCandidate {
  userId: string
  subscriptionId: string
  offerSlug: string
  grantedAt: Date
  expiresAt: Date | null
}

/** Leitura operacional dos assinantes da Comunidade ainda elegíveis ao rollout. */
export interface MoldaRolloutCandidateSource {
  listActive(now: Date): Promise<MoldaRolloutCandidate[]>
}
