import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  CLUBE_ACCESS_REF,
  ESTUDIO_ACCESS_REF,
  type MissionAccessPredicate,
  type MissionDef,
  monthlyPeriodKey,
  periodBoundsFor,
  periodKeyFor,
  weeklyPeriodKey,
} from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { MissionsMeView, MissionView } from '../mappers/views'

/**
 * Missões do aluno NA VITRINE: set diário + semanal + mensal (determinísticos por
 * perfil/período), com progresso DERIVADO do ledger (conta eventos no período) e flag
 * de resgate. Sem hook no award — a leitura é a fonte do progresso. Missões GATED
 * (Clube) só entram no sorteio de quem tem o produto (posse resolvida pela CONTA).
 */
export class GetMissionsService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly accessCheck: AccessCheckService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    privileged = false,
  ): Promise<MissionsMeView> {
    const today = localDateSaoPaulo(this.clock())
    const weekKey = weeklyPeriodKey(today)
    const monthKey = monthlyPeriodKey(today)
    const hasAccess = await this.resolveAccess(accountId, privileged)
    const daily = assignDailyMissions(userId, today, hasAccess)
    const weekly = assignWeeklyMissions(userId, weekKey, hasAccess)
    const monthly = assignMonthlyMissions(userId, monthKey, hasAccess)
    const claimed = await this.repo.listClaimedMissions(userId, audience, [
      today,
      weekKey,
      monthKey,
    ])

    const build = async (m: MissionDef): Promise<MissionView> => {
      const { from, to } = periodBoundsFor(m, today)
      const periodKey = periodKeyFor(m, today)
      const count = await this.repo.countEventsInPeriod(userId, audience, [m.goalType], from, to)
      const progress = Math.min(count, m.target)
      return {
        slug: m.slug,
        cadence: m.cadence,
        goalType: m.goalType,
        target: m.target,
        progress,
        completed: count >= m.target,
        claimed: claimed.has(`${m.slug}:${periodKey}`),
        rewardXp: m.rewardXp,
        rewardCoins: m.rewardCoins,
        periodKey,
      }
    }

    const [dailyViews, weeklyViews, monthlyViews] = await Promise.all([
      Promise.all(daily.map(build)),
      Promise.all(weekly.map(build)),
      Promise.all(monthly.map(build)),
    ])
    return { daily: dailyViews, weekly: weeklyViews, monthly: monthlyViews }
  }

  /**
   * Predicado de posse p/ podar missões GATED do pool. Equipe (privileged) libera
   * tudo (passe livre). Resolve pela CONTA — mesma régua da rota `/members/access`
   * (grant específico OU comunidade) — as DUAS refs gated (Clube + Estúdio) numa ida.
   */
  private async resolveAccess(
    accountId: string,
    privileged: boolean,
  ): Promise<MissionAccessPredicate> {
    if (privileged) return () => true
    const result = await this.accessCheck.execute(accountId, [CLUBE_ACCESS_REF, ESTUDIO_ACCESS_REF])
    const owned = new Set<string>([...result.grants, ...result.communities])
    return (ref: string) => owned.has(ref)
  }
}
