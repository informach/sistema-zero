import type { CourseAudience } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'

/** Resumo de progresso de UM filho (perfil) para a área dos pais. */
export interface ChildStatsView {
  profileId: string
  xp: number
  streak: { current: number; best: number }
  badgesCount: number
  coursesInProgress: number
  coursesCompleted: number
  /** Projetos do Estúdio que a criança ENTREGOU. */
  projectsCount: number
  /** Colocação no ranking da vitrine (null = conta sem matrícula na audiência). */
  rankingPosition: number | null
}

/**
 * Resumo de progresso de CADA FILHO (perfil) p/ a área dos pais (kids). Escopo-CONTA:
 * só devolve os perfis cujo `account_id` (na gamificação) bate com o `accountId` pedido
 * — perfil de OUTRA conta (ou sem nenhuma atividade) NÃO volta, nada de progresso vaza.
 * Por filho: xp/streak/badges + cursos (em andamento/concluídos, sobre os cursos
 * publicados da vitrine) + projetos do Estúdio + colocação no ranking.
 */
export class GetChildrenStatsService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly studio: StudioSubmissionRepository,
  ) {}

  async execute(
    accountId: string,
    profileIds: string[],
    opts: { audience: CourseAudience },
  ): Promise<ChildStatsView[]> {
    if (profileIds.length === 0) return []
    const { audience } = opts

    // 1) AUTORIZA + xp/streak num passo: só perfis da CONTA (account_id). Perfil de
    //    outra conta não volta (defesa em profundidade); sem atividade tb não volta.
    const authorized = await this.gamification.listByAccount(accountId, profileIds, audience)
    if (authorized.length === 0) return []

    // 2) Cursos publicados da vitrine UMA vez (denominador compartilhado entre os filhos).
    const published = await this.courses.listPublishedCourses(audience)
    const courseIds = published.map((c) => c.id)
    const totals = courseIds.length
      ? await this.courses.countPublishedLessonsByCourseIds(courseIds)
      : new Map<string, number>()

    // 3) Por filho (em paralelo): badges + progresso + projetos + ranking.
    return Promise.all(
      authorized.map(async (rec) => {
        const profileId = rec.userId
        const [badges, completedByCourse, projectsCount, ranking] = await Promise.all([
          this.gamification.listBadges(profileId, audience),
          courseIds.length
            ? this.progress.countCompletedPublishedByCourseIds(profileId, courseIds)
            : Promise.resolve(new Map<string, number>()),
          this.studio.countByUserAndAudience(profileId, audience),
          this.gamification.getRanking(profileId, accountId, audience),
        ])

        let coursesInProgress = 0
        let coursesCompleted = 0
        for (const id of courseIds) {
          const total = totals.get(id) ?? 0
          if (total === 0) continue
          const done = completedByCourse.get(id) ?? 0
          if (done >= total) coursesCompleted++
          else if (done > 0) coursesInProgress++
        }

        return {
          profileId,
          xp: rec.xp,
          streak: { current: rec.streakCurrent, best: rec.streakBest },
          badgesCount: badges.length,
          coursesInProgress,
          coursesCompleted,
          projectsCount,
          rankingPosition: ranking?.position ?? null,
        }
      }),
    )
  }
}
