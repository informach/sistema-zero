import type { LiveRewardsPort } from '../../domain/ports/live-rewards.port'
import type { AwardGamificationService } from './award-gamification.service'

/**
 * A implementação do `LiveRewardsPort` na gamificação: grava o marco `live_encounter` (amount 0)
 * da criança, que deriva a conquista `live-first-encounter` e alimenta a missão semanal
 * `live_encounter`. O award é FAIL-OPEN (loga `gamification.award_failed` e segue), então a
 * chamada nunca lança: a sala não pode cair por causa de uma conquista.
 *
 * ⚠️ A ligação no `LiveService` (opção `liveRewards`) é feita no composition-root pela
 * integração do lote dos cursos ao vivo.
 */
export class LiveRewardsService implements LiveRewardsPort {
  constructor(private readonly award: AwardGamificationService) {}

  async encounterAttended(input: {
    learnerId: string
    accountId: string
    occurrenceId: string
    courseId: string
    audience: 'adult' | 'kids'
  }): Promise<void> {
    await this.award.awardLiveEncounter({
      userId: input.learnerId,
      accountId: input.accountId,
      occurrenceId: input.occurrenceId,
      audience: input.audience,
    })
  }
}
