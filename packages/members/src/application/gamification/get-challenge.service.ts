import type { CourseAudience } from '../../domain/course/course'
import {
  challengeForMonth,
  challengeSourceId,
  currentChallengeKey,
} from '../../domain/gamification/challenges'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

export interface ChallengeMeView {
  challenge: {
    /** `m:YYYY-MM` (mês civil de SP) — a MESMA chave que o hub valida no publish. */
    key: string
    slug: string
    emoji: string
    title: string
    description: string
    suggestedKit: string
  }
  /** O perfil já tem o marco `challenge_entry` deste mês (publicou no desafio). */
  entered: boolean
}

/**
 * Desafio MENSAL (game jam): tema do mês (determinístico e global) + se o perfil
 * já participou. A POSSE (Clube+Estúdio) não é checada aqui — o kids gateia o
 * card via `/members/access` e o gate REAL do publish é o do hub.
 */
export class GetChallengeService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<ChallengeMeView> {
    const key = currentChallengeKey(this.clock())
    const theme = challengeForMonth(key)
    const entered = await this.repo.hasXpEvent(
      userId,
      audience,
      'challenge_entry',
      challengeSourceId(key),
    )
    return { challenge: { key, ...theme }, entered }
  }
}
