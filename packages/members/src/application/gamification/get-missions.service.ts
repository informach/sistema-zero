import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  assignDailyMissions,
  assignWeeklyMissions,
  type MissionDef,
  periodBoundsFor,
  periodKeyFor,
  weeklyPeriodKey,
} from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { MissionsMeView, MissionView } from '../mappers/views'

/**
 * Missões do aluno NA VITRINE: set diário + semanal (determinísticos por perfil/período),
 * com progresso DERIVADO do ledger (conta eventos no período) e flag de resgate. Sem hook
 * no award — a leitura é a fonte do progresso.
 */
export class GetMissionsService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<MissionsMeView> {
    const today = localDateSaoPaulo(this.clock())
    const weekKey = weeklyPeriodKey(today)
    const daily = assignDailyMissions(userId, today)
    const weekly = assignWeeklyMissions(userId, weekKey)
    const claimed = await this.repo.listClaimedMissions(userId, audience, [today, weekKey])

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

    const [dailyViews, weeklyViews] = await Promise.all([
      Promise.all(daily.map(build)),
      Promise.all(weekly.map(build)),
    ])
    return { daily: dailyViews, weekly: weeklyViews }
  }
}
