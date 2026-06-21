import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  MissionNotCompletedError,
  MissionNotFoundError,
} from '../../domain/gamification/gamification.errors'
import {
  assignDailyMissions,
  assignWeeklyMissions,
  MISSIONS_BY_SLUG,
  periodBoundsFor,
  periodKeyFor,
  weeklyPeriodKey,
} from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { MissionClaimView } from '../mappers/views'

/**
 * Resgata o prêmio (XP + moedas) de uma missão concluída. REVALIDA a conclusão no
 * servidor (reconta o ledger no período) — o cliente nunca decide a conclusão. O grant
 * é idempotente (mission_claims) e as moedas contam no teto diário. Não move o streak.
 */
export class ClaimMissionService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience, slug: string): Promise<MissionClaimView> {
    const mission = MISSIONS_BY_SLUG.get(slug)
    if (!mission) throw new MissionNotFoundError()

    const today = localDateSaoPaulo(this.clock())
    // A missão precisa estar ATRIBUÍDA a este perfil no período. O catálogo tem 8 missões,
    // mas cada aluno só recebe um subconjunto determinístico (3 diárias / 2 semanais — o
    // `GetMissionsService` só mostra essas). Várias missões compartilham `goalType` com alvos
    // diferentes (ex.: `daily-aula` alvo 1 e `daily-aulas-3` alvo 3 = `lesson_complete`), então
    // sem este guard um aluno resgataria, via POST direto, o prêmio de uma missão NUNCA oferecida
    // cujo alvo ele tenha cumprido — farm de XP (sem teto) e moeda fora do que foi atribuído.
    const assigned =
      mission.cadence === 'daily'
        ? assignDailyMissions(userId, today)
        : assignWeeklyMissions(userId, weeklyPeriodKey(today))
    if (!assigned.some((m) => m.slug === slug)) throw new MissionNotFoundError()

    const { from, to } = periodBoundsFor(mission, today)
    const count = await this.repo.countEventsInPeriod(
      userId,
      audience,
      [mission.goalType],
      from,
      to,
    )
    if (count < mission.target) throw new MissionNotCompletedError()

    const result = await this.repo.claimMission({
      userId,
      audience,
      missionSlug: mission.slug,
      periodKey: periodKeyFor(mission, today),
      rewardXp: mission.rewardXp,
      rewardCoins: mission.rewardCoins,
      today,
      now: this.clock(),
    })
    return {
      claimed: result.claimed,
      xpAwarded: result.xpAwarded,
      coinsAwarded: result.coinsAwarded,
      coinBalance: result.coinBalance,
    }
  }
}
