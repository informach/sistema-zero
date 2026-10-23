import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  ESTUDIO_ACCESS_REF,
  type MissionDef,
  monthlyPeriodKey,
  periodBoundsFor,
  periodKeyFor,
  weeklyPeriodKey,
} from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { HubGateway } from '../../domain/ports/hub-gateway.port'
import type { LiveLessonAccessPort } from '../../domain/ports/live-lesson-access.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'
import type { ListMyCoursesService } from '../list-my-courses/list-my-courses.service'
import type { MissionsMeView, MissionView } from '../mappers/views'
import { resolveMissionAccess } from './mission-access'

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
    private readonly listMyCourses: ListMyCoursesService,
    private readonly kidsJourney: Pick<KidsJourneyQueryService, 'get' | 'staffPreview'>,
    /** Vaga nas oficinas ao vivo (missão `live_encounter`). Ausente = a missão não entra. */
    private readonly liveSeats?: Pick<LiveLessonAccessPort, 'hasActiveSeat'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'get'>,
    private readonly hub?: Pick<HubGateway, 'canUseAdultShowcase'>,
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
    const hasAccess = await resolveMissionAccess({
      accessCheck: this.accessCheck,
      liveSeats: this.liveSeats,
      accountId,
      userId,
      audience,
      privileged,
      now: this.clock(),
    })
    // Kids `privileged` = the team preview admitted by `resolveKidsStaffPreviewActor` (staff
    // account or a profile of its OWN account, never support); progress stays on `userId`.
    const kidsCapabilities =
      audience !== 'kids'
        ? null
        : privileged
          ? (await this.kidsJourney.staffPreview()).capabilities
          : (await this.kidsJourney.get({ userId, accountId })).earned.capabilities
    const adult = audience === 'adult' ? await this.adultJourney?.get(userId, privileged) : null
    const freeCreation =
      audience === 'adult'
        ? Boolean(adult?.capabilities.includes('studio') && hasAccess(ESTUDIO_ACCESS_REF))
        : Boolean(kidsCapabilities?.includes('studio') && hasAccess(ESTUDIO_ACCESS_REF))
    const communityAvailable =
      audience === 'adult'
        ? privileged || (await this.hub?.canUseAdultShowcase?.(userId, accountId)) === true
        : true
    const daily = assignDailyMissions(userId, today, hasAccess)
    const weekly = assignWeeklyMissions(userId, weekKey, hasAccess)
    const monthly = assignMonthlyMissions(userId, monthKey, hasAccess)
    const opportunities = await this.repo.listContentMissionOpportunities(
      userId,
      audience,
      (await this.listMyCourses.execute(userId, privileged, audience, accountId))
        .filter((course) => !course.careerLock.locked)
        .map((course) => course.courseSlug),
    )
    const claimed = await this.repo.listClaimedMissions(userId, audience, [
      today,
      weekKey,
      monthKey,
    ])

    const build = async (m: MissionDef): Promise<MissionView | null> => {
      const { from, to } = periodBoundsFor(m, today)
      const periodKey = periodKeyFor(m, today)
      const count = await this.repo.countEventsInPeriod(userId, audience, [m.goalType], from, to)
      const remaining = opportunities.get(m.goalType)
      // Filter AFTER assignment so earning a rank never reshuffles in-progress missions.
      // Completed/claimed legacy missions remain redeemable even if eligibility changes.
      if (
        (((!freeCreation || !communityAvailable) &&
          (m.goalType === 'studio_published' || m.goalType === 'studio_remix')) ||
          (!communityAvailable && m.goalType === 'mural_comment')) &&
        count < m.target &&
        !claimed.has(`${m.slug}:${periodKey}`)
      )
        return null
      if (
        typeof remaining === 'number' &&
        count + remaining < m.target &&
        !claimed.has(`${m.slug}:${periodKey}`)
      )
        return null
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
    const available = (mission: MissionView | null): mission is MissionView => mission !== null
    return {
      ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
      daily: dailyViews.filter(available),
      weekly: weeklyViews.filter(available),
      monthly: monthlyViews.filter(available),
    }
  }
}
