import type { CourseAudience } from '../../domain/course/course'
import { BADGE_SLUGS } from '../../domain/gamification/badges'
import { effectiveStreak, localDateSaoPaulo } from '../../domain/gamification/gamification'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { GamificationMeView } from '../mappers/views'

/**
 * Perfil de gamificação do aluno NA VITRINE pedida (XP/streak/badges são
 * segregados por audiência — `?audience=`, default `adult` como nas listagens).
 * Sem perfil ainda → zeros e catálogo todo bloqueado. O streak devolvido é o
 * de EXIBIÇÃO (0 quando quebrado) — o valor cru persiste e recomeça na próxima
 * atividade. `withRanking` → inclui a colocação no ranking de XP da MESMA
 * vitrine (cálculo extra — só a página de perfil pede).
 */
export class GetGamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    opts: { audience: CourseAudience; withRanking?: boolean },
  ): Promise<GamificationMeView> {
    const [profile, badges, ranking] = await Promise.all([
      this.repo.getProfile(userId, opts.audience),
      this.repo.listBadges(userId, opts.audience),
      opts.withRanking ? this.repo.getRanking(userId, opts.audience) : null,
    ])
    const today = localDateSaoPaulo(this.clock())
    const unlockedBySlug = new Map(badges.map((b) => [b.badgeSlug, b.unlockedAt]))
    return {
      xp: profile?.xp ?? 0,
      streak: {
        current: profile
          ? effectiveStreak(
              {
                streakCurrent: profile.streakCurrent,
                streakBest: profile.streakBest,
                lastActivityDate: profile.lastActivityDate,
              },
              today,
            )
          : 0,
        best: profile?.streakBest ?? 0,
        activeToday: profile?.lastActivityDate === today,
      },
      badges: BADGE_SLUGS.map((slug) => ({
        slug,
        unlockedAt: unlockedBySlug.get(slug)?.toISOString() ?? null,
      })),
      ...(ranking ? { ranking } : {}),
    }
  }
}
