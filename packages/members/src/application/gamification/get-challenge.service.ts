import type { CourseAudience } from '../../domain/course/course'
import {
  challengeSourceId,
  currentChallengeKey,
  resolveChallengeTheme,
} from '../../domain/gamification/challenges'
import type { ChallengeConfigRepository } from '../../domain/ports/challenge-config-repository.port'
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
 * Desafio MENSAL (game jam): tema do mês (definido pelo professor no admin ou,
 * sem definição, o sorteio determinístico como fallback — global: todo mundo vê
 * o mesmo) + se o perfil já participou. A POSSE (Clube+Estúdio) não é checada
 * aqui — o kids gateia o card via `/members/access` e o gate REAL do publish é
 * o do hub.
 */
export class GetChallengeService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly challengeConfig: ChallengeConfigRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<ChallengeMeView> {
    const key = currentChallengeKey(this.clock())
    const override = await this.challengeConfig.findOverrideWithTheme(key)
    const { theme } = resolveChallengeTheme(key, override)
    const entered = await this.repo.hasXpEvent(
      userId,
      audience,
      'challenge_entry',
      challengeSourceId(key),
    )
    return { challenge: { key, ...theme }, entered }
  }
}
