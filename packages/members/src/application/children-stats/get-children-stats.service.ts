import type { CourseAudience } from '../../domain/course/course'
import { effectiveStreak, localDateSaoPaulo } from '../../domain/gamification/gamification'
import { weekBoundsUtc, weeklyPeriodKey } from '../../domain/gamification/missions'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import {
  type GamificationRepository,
  MAX_STREAK_FREEZES,
} from '../../domain/ports/gamification-repository.port'
import type { HubGateway } from '../../domain/ports/hub-gateway.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'

/** Janela "Esta semana" (semana civil SP corrente, parcial) de um filho. */
export interface ChildWeekStatsView {
  xpEarned: number
  lessonsCompleted: number
  quizzesPassed: number
  badgesUnlocked: number
  submissionsSubmitted: number
  /** @deprecated Compatibilidade temporária com clientes anteriores ao bloco Pinta. */
  projectsSubmitted: number
}

/** Jogo publicado no Mural na semana (title + link público de jogar). */
export interface ChildWeekGameView {
  title: string
  playId: string | null
  publishedAt: string
}

/** Resumo de progresso de UM filho (perfil) para a área dos pais. */
export interface ChildStatsView {
  profileId: string
  xp: number
  streak: { current: number; best: number }
  badgesCount: number
  coursesInProgress: number
  coursesCompleted: number
  /** Entregas de atividades (Estúdio ou Pinta) feitas pela criança. */
  submissionsCount: number
  /** @deprecated Compatibilidade temporária; use `submissionsCount`. */
  projectsCount: number
  /** Colocação no ranking da vitrine (null = conta sem matrícula na audiência). */
  rankingPosition: number | null
  /** "Esta semana" (semana civil SP corrente, parcial — seg→agora). */
  week: ChildWeekStatsView
  /**
   * Jogos publicados no Mural nesta semana. `null` = hub indisponível (o report
   * degrada sem a lista; NUNCA falha por causa dela).
   */
  games: ChildWeekGameView[] | null
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
    private readonly clock: () => Date,
    /** Jogos da semana no Mural (S2S direto, best-effort — `null` degrada). */
    private readonly hub?: HubGateway,
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
    const authorizedIds = authorized.map((rec) => rec.userId)

    // 2) Cursos publicados da vitrine UMA vez (denominador compartilhado entre os filhos).
    const published = await this.courses.listPublishedCourses(audience)
    const courseIds = published.map((c) => c.id)
    const totals = courseIds.length
      ? await this.courses.countPublishedLessonsByCourseIds(courseIds)
      : new Map<string, number>()

    // 3) Ranking de TODOS os filhos numa só passada (coorte da audiência resolvida UMA
    //    vez) — evita o fan-out de N `getRanking`, cada um re-derivando a mesma coorte.
    const now = this.clock()
    const today = localDateSaoPaulo(now)
    const positions = await this.gamification.rankProfiles(accountId, authorizedIds, audience, now)

    // 3b) Janela "Esta semana" (semana civil SP CORRENTE, parcial: seg → agora — o
    //     report de sexta fala de "essa semana"). XP em 1 ida p/ todos os filhos;
    //     jogos do Mural em 1 ida ao hub (best-effort → null degrada, nunca falha).
    const weekKey = weeklyPeriodKey(today)
    const { from: weekFrom } = weekBoundsUtc(weekKey)
    const [weekXpByProfile, weekGames] = await Promise.all([
      this.gamification.sumWeeklyXp(audience, authorizedIds, weekFrom, now),
      this.hub
        ? this.hub.listShowcaseByAuthors(authorizedIds, weekFrom, now)
        : Promise.resolve(null),
    ])

    // 4) Por filho (em paralelo): badges + progresso + entregas + contadores da semana.
    return Promise.all(
      authorized.map(async (rec) => {
        const profileId = rec.userId
        const [
          badges,
          completedByCourse,
          submissionsCount,
          weekLessons,
          weekQuizzes,
          weekBadges,
          weekSubmissions,
        ] = await Promise.all([
          this.gamification.listBadges(profileId, audience),
          courseIds.length
            ? this.progress.countCompletedPublishedByCourseIds(profileId, courseIds)
            : Promise.resolve(new Map<string, number>()),
          this.studio.countByUserAndAudience(profileId, audience),
          this.gamification.countEventsInPeriod(
            profileId,
            audience,
            ['lesson_complete'],
            weekFrom,
            now,
          ),
          this.gamification.countEventsInPeriod(
            profileId,
            audience,
            ['quiz_passed'],
            weekFrom,
            now,
          ),
          this.gamification.countBadgesUnlockedInPeriod(profileId, audience, weekFrom, now),
          this.studio.countSubmittedInPeriodByAudience(profileId, audience, weekFrom, now),
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
          // Streak de EXIBIÇÃO (igual ao `GetGamificationService`): projeta o freeze grátis do
          // mês e as férias/freezes p/ não mostrar ao pai um streak "vivo" que já quebrou (nem
          // culpar à toa um que a próxima atividade ainda cobriria). Cru (`streakCurrent`) mentia.
          streak: {
            current: effectiveStreak(
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
            ),
            best: rec.streakBest,
          },
          badgesCount: badges.length,
          coursesInProgress,
          coursesCompleted,
          submissionsCount,
          // Alias de rollout: o BFF antigo ainda lê este nome. O valor já tem semântica
          // neutra de entrega e será removido quando todos os consumidores migrarem.
          projectsCount: submissionsCount,
          rankingPosition: positions.get(profileId) ?? null,
          week: {
            xpEarned: weekXpByProfile.get(profileId) ?? 0,
            lessonsCompleted: weekLessons,
            quizzesPassed: weekQuizzes,
            badgesUnlocked: weekBadges,
            submissionsSubmitted: weekSubmissions,
            projectsSubmitted: weekSubmissions,
          },
          games: weekGames
            ? weekGames
                .filter((g) => g.authorId === profileId)
                .map((g) => ({ title: g.title, playId: g.playId, publishedAt: g.createdAt }))
            : null,
        }
      }),
    )
  }
}
