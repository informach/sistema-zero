import type { CourseRatingRepository } from '../../domain/ports/course-rating-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress, resolveContinueLesson } from '../../domain/progress/progress'
import type { CheckAccessService } from '../access/check-access.service'
import { lockedLessonSetForCourse } from '../lesson-locking/lesson-locking'
import { type CourseDetailView, toCourseDetailView, toCourseProgressView } from '../mappers/views'

/** Detalhe do curso (módulos + aulas resumidas + flags de conclusão) — exige acesso. */
export class GetMyCourseService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly ratings: CourseRatingRepository,
    private readonly gamification: GamificationRepository,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    privileged = false,
    accountId?: string,
  ): Promise<CourseDetailView> {
    // Acesso pela CONTA (sessão de perfil → x-auth-account-id); progresso pelo userId.
    const { course, entitlement } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    // Aluno só vê aulas PUBLICADAS — outline e progresso idem.
    const [
      outline,
      completedIds,
      last,
      lastAccessed,
      myRating,
      careerState,
      showcaseLessonIds,
      materialLessonIds,
    ] = await Promise.all([
      this.courses.findOutline(course.id, { publishedOnly: true }),
      this.progress.listCompletedLessonIds(userId, course.id),
      this.progress.lastCompletedAt(userId, course.id),
      this.positions.lastAccessedLessonId(userId, course.id),
      this.ratings.find(userId, course.id),
      course.audience === 'kids' ? this.gamification.listCareerCourseState(userId, 'kids') : null,
      course.audience === 'kids' ? this.courses.listShowcaseLessonIds(course.id) : [],
      this.courses.listMaterialLessonIds(course.id),
    ])
    // Baú de fim de unidade: só a vitrine kids tem trilha. Depende dos ids do
    // outline, então vem depois dele. A linha `unit_complete` do ledger É o carimbo
    // de "já aberto" — inclusive para quem ganhou o XP no modelo antigo, em que ele
    // caía sozinho ao concluir a última aula. Por isso não há backfill nenhum.
    const claimedUnitIds =
      course.audience === 'kids'
        ? await this.gamification.listClaimedUnits(
            userId,
            'kids',
            outline.map((m) => m.id),
          )
        : null
    const completedSet = new Set(completedIds)
    // Numerador e denominador derivados do MESMO outline publicado: conclusões de
    // aulas hoje despublicadas não contam (e não infla o percentual).
    const publishedLessonIds = outline.flatMap((m) => m.lessons.map((l) => l.id))
    const completedPublished = publishedLessonIds.filter((id) => completedSet.has(id)).length
    const progressView = toCourseProgressView(
      computeProgress(completedPublished, publishedLessonIds.length),
      last,
    )
    // Trava sequencial: só calcula quando o curso a tem ligada E o ator não é equipe
    // interna (privileged navega tudo destravado, como a chave-mestra virtual).
    const lockedSet = lockedLessonSetForCourse(course, publishedLessonIds, completedSet, privileged)
    const continueLessonId = resolveContinueLesson(outline, completedSet, lastAccessed, lockedSet)
    const view = toCourseDetailView(
      course,
      outline,
      completedSet,
      entitlement,
      progressView,
      continueLessonId,
      myRating,
      lockedSet,
      claimedUnitIds,
    )
    return {
      ...view,
      milestones: careerState
        ? (careerState.milestones.get(course.id) ?? { completed: false, showcased: false })
        : undefined,
      materialLessonIds: materialLessonIds.filter((id) => !lockedSet.has(id)),
      showcaseLessonId: showcaseLessonIds.find((id) => !lockedSet.has(id)) ?? null,
    }
  }
}
