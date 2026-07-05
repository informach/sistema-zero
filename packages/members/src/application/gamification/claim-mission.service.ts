import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  MissionNotCompletedError,
  MissionNotFoundError,
} from '../../domain/gamification/gamification.errors'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  CLUBE_ACCESS_REF,
  MISSIONS_BY_SLUG,
  type MissionAccessPredicate,
  monthlyPeriodKey,
  periodBoundsFor,
  periodKeyFor,
  weeklyPeriodKey,
} from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { MissionClaimView } from '../mappers/views'

/**
 * Resgata o prêmio (XP + moedas) de uma missão concluída. REVALIDA a conclusão no
 * servidor (reconta o ledger no período) — o cliente nunca decide a conclusão. O grant
 * é idempotente (mission_claims) e as moedas contam no teto diário. Não move o streak.
 */
export class ClaimMissionService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly accessCheck: AccessCheckService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    slug: string,
    privileged = false,
  ): Promise<MissionClaimView> {
    const mission = MISSIONS_BY_SLUG.get(slug)
    if (!mission) throw new MissionNotFoundError()

    const today = localDateSaoPaulo(this.clock())
    // A missão precisa estar ATRIBUÍDA a este perfil no período. O catálogo tem muitas
    // missões, mas cada aluno só recebe um subconjunto determinístico (o `GetMissionsService`
    // só mostra essas) — e o pool é PODADO por posse (missão gated de quem não tem o produto
    // não é atribuída). Várias missões compartilham `goalType` com alvos diferentes (ex.:
    // `daily-aula` alvo 1 × `weekly-aulas-5` alvo 5 = `lesson_complete`), então sem este guard
    // um aluno resgataria, via POST direto, o prêmio de uma missão NUNCA oferecida cujo alvo
    // ele tenha cumprido — farm de XP/moeda fora do atribuído, ou de missão de produto que não tem.
    const hasAccess = await this.resolveAccess(accountId, privileged)
    const assigned =
      mission.cadence === 'daily'
        ? assignDailyMissions(userId, today, hasAccess)
        : mission.cadence === 'monthly'
          ? assignMonthlyMissions(userId, monthlyPeriodKey(today), hasAccess)
          : assignWeeklyMissions(userId, weeklyPeriodKey(today), hasAccess)
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

  /** Predicado de posse p/ podar missões GATED (espelha o `GetMissionsService`). */
  private async resolveAccess(
    accountId: string,
    privileged: boolean,
  ): Promise<MissionAccessPredicate> {
    if (privileged) return () => true
    const result = await this.accessCheck.execute(accountId, [CLUBE_ACCESS_REF])
    const owned = new Set<string>([...result.grants, ...result.communities])
    return (ref: string) => owned.has(ref)
  }
}
