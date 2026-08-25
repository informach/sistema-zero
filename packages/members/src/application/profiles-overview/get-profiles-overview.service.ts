import type { CourseAudience } from '../../domain/course/course'
import { effectiveStreak, localDateSaoPaulo } from '../../domain/gamification/gamification'
import {
  computeStudentLevel,
  emptyQualifyingByTier,
  type StudentLevelSlug,
} from '../../domain/gamification/levels'
import {
  type GamificationRepository,
  MAX_STREAK_FREEZES,
} from '../../domain/ports/gamification-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'

/** Uma linha da LISTAGEM de crianças do painel (batch por página do auth). */
export interface ProfileOverviewView {
  profileId: string
  xp: number
  levelSlug: StudentLevelSlug
  /** Streak de EXIBIÇÃO (projeta freeze grátis do mês + férias — o cru mentia). */
  streakCurrent: number
  /** Data civil SP (`YYYY-MM-DD`) da última atividade que rendeu XP; null = nunca. */
  lastActivityDate: string | null
  /** Entregas pendentes (mesma régua da fila global: nem respondida nem conferida). */
  pendingSubmissions: number
}

/**
 * Enriquecimento em LOTE dos perfis de uma página da listagem de CRIANÇAS do
 * painel (os ids vêm da busca no auth): nível/XP/ofensiva/última atividade +
 * pendências de entrega — 3 idas ao banco para a página inteira, nunca N+1.
 * TODO id pedido volta no array (sem linha de gamificação → zeros/noob), na
 * ordem pedida — régua das rotas em lote (`/members/avatars`).
 */
export class GetProfilesOverviewService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly studioSubmissions: StudioSubmissionRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    profileIds: string[],
    audience: CourseAudience = 'kids',
  ): Promise<{ profiles: ProfileOverviewView[] }> {
    const ids = [...new Set(profileIds)]
    if (ids.length === 0) return { profiles: [] }

    const [records, qualifying, pending] = await Promise.all([
      this.gamification.listByUserIds(ids, audience),
      this.gamification.listQualifyingCareerSlotsForProfiles(ids, audience),
      this.studioSubmissions.countPendingByUsers(ids, audience),
    ])
    const byId = new Map(records.map((r) => [r.userId, r]))
    const today = localDateSaoPaulo(this.clock())

    return {
      profiles: ids.map((profileId) => {
        const rec = byId.get(profileId)
        return {
          profileId,
          xp: rec?.xp ?? 0,
          levelSlug: computeStudentLevel(qualifying.get(profileId) ?? emptyQualifyingByTier()).slug,
          // Streak de EXIBIÇÃO — a mesma projeção do dashboard dos pais (freeze
          // grátis do mês + férias); o `streakCurrent` cru mostraria "vivo" um
          // streak que já quebrou.
          streakCurrent: rec
            ? effectiveStreak(
                {
                  streakCurrent: rec.streakCurrent,
                  streakBest: rec.streakBest,
                  lastActivityDate: rec.lastActivityDate,
                  freezes: Math.min(
                    MAX_STREAK_FREEZES,
                    rec.streakFreezes + (rec.freezeGrantedMonth !== today.slice(0, 7) ? 1 : 0),
                  ),
                  vacationFrom: rec.vacationFrom,
                  vacationTo: rec.vacationTo,
                },
                today,
              )
            : 0,
          lastActivityDate: rec?.lastActivityDate ?? null,
          pendingSubmissions: pending.get(profileId) ?? 0,
        }
      }),
    }
  }
}
