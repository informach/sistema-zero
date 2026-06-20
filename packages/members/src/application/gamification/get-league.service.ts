import type { CourseAudience } from '../../domain/course/course'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  DEFAULT_LEAGUE_TIER,
  isLeagueTier,
  type LeagueTier,
  promotionCount,
  relegationCount,
  resolveTier,
} from '../../domain/gamification/league'
import { weekBoundsUtc, weeklyPeriodKey } from '../../domain/gamification/missions'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { LeagueMeView } from '../mappers/views'

/**
 * Liga semanal do aluno. Resolve o tier da semana de forma LAZY (sem cron): se ainda
 * não há membership, fecha a semana anterior (coloca o aluno pela XP da semana na coorte
 * do mesmo tier) e promove/rebaixa. Depois monta o board da semana corrente (XP DERIVADO
 * do ledger). Privacidade: o board NÃO expõe userId de terceiros — só posição/XP + `isMe`.
 */
export class GetLeagueService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  /** Colocação 1-based de `userId` na coorte por XP da semana (empate → competition rank). */
  private rankOf(userId: string, xpByUser: Map<string, number>): number {
    const mine = xpByUser.get(userId) ?? 0
    let ahead = 0
    for (const [id, xp] of xpByUser) {
      if (id !== userId && xp > mine) ahead++
    }
    return ahead + 1
  }

  /** Resolve (criando se preciso) o tier da semana corrente — fechamento lazy. */
  private async ensureTier(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    weekKey: string,
    now: Date,
  ): Promise<LeagueTier> {
    const existing = await this.repo.getLeagueMembership(userId, audience, weekKey)
    if (existing) return isLeagueTier(existing.tier) ? existing.tier : DEFAULT_LEAGUE_TIER

    const prev = await this.repo.getMostRecentLeagueMembership(userId, audience, weekKey)
    let tier: LeagueTier = DEFAULT_LEAGUE_TIER
    if (prev) {
      const prevTier = isLeagueTier(prev.tier) ? prev.tier : DEFAULT_LEAGUE_TIER
      const cohort = await this.repo.listLeagueCohort(audience, prev.weekKey, prevTier, now)
      const { from, to } = weekBoundsUtc(prev.weekKey)
      const xpByUser = await this.repo.sumWeeklyXp(audience, cohort, from, to)
      tier = resolveTier(prevTier, this.rankOf(userId, xpByUser), cohort.length)
    }
    await this.repo.createLeagueMembership(userId, accountId, audience, weekKey, tier, now)
    return tier
  }

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    privileged = false,
  ): Promise<LeagueMeView> {
    const now = this.clock()
    if (privileged || !(await this.repo.hasActiveAudienceAccess(accountId, audience, now))) {
      throw new AccessDeniedError('Você não tem matrícula ativa nesta vitrine')
    }
    const today = localDateSaoPaulo(now)
    const weekKey = weeklyPeriodKey(today)
    const tier = await this.ensureTier(userId, accountId, audience, weekKey, now)

    const cohort = await this.repo.listLeagueCohort(audience, weekKey, tier, now)
    const { from, to } = weekBoundsUtc(weekKey)
    const xpByUser = await this.repo.sumWeeklyXp(audience, cohort, from, to)

    // Ordena por XP desc; empate desempata pelo userId (determinístico, sem vazar o id).
    const ranked = [...cohort].sort((a, b) => {
      const dx = (xpByUser.get(b) ?? 0) - (xpByUser.get(a) ?? 0)
      return dx !== 0 ? dx : a.localeCompare(b)
    })
    const entries = ranked.map((id, i) => ({
      position: i + 1,
      weeklyXp: xpByUser.get(id) ?? 0,
      isMe: id === userId,
    }))
    const myPosition = entries.find((e) => e.isMe)?.position ?? entries.length + 1

    return {
      tier,
      weekKey,
      promotionCount: promotionCount(cohort.length),
      relegationCount: relegationCount(cohort.length),
      entries,
      myPosition,
    }
  }
}
