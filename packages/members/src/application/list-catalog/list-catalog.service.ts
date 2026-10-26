import type { CourseAudience } from '../../domain/course/course'
import { independentCourseAccessReason } from '../../domain/entitlement/independent-course-access'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import { journeyLockViews } from '../journey-course-locking/journey-course-locking'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'
import { type CatalogCourseView, toCatalogCourseView } from '../mappers/views'

/**
 * Catálogo "Todos os cursos": todo curso `published` da AUDIÊNCIA pedida + flag
 * `hasAccess` do aluno (matrícula ativa de curso). Quem NÃO tem acesso vê o
 * card bloqueado e o front usa `salesPageUrl` para levar à página de vendas.
 * 3 queries (cursos + matrículas + snapshot do ledger Kids) — sem N+1.
 */
export class ListCatalogService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly gamification: GamificationRepository,
    private readonly clock: () => Date,
    private readonly kidsJourney: Pick<KidsJourneyQueryService, 'courseState'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'courseState'>,
  ) {}

  async execute(
    userId: string,
    privileged = false,
    audience: CourseAudience = 'adult',
    accountId?: string,
  ): Promise<CatalogCourseView[]> {
    // `hasAccess` resolve a matrícula pela CONTA (sessão de perfil → accountId).
    // Normal Kids locks/badges use one policy/ledger snapshot; team bypass keeps only actual badges.
    const [published, active, staffMilestones] = await Promise.all([
      this.courses.listPublishedCourses(audience),
      this.entitlements.listActiveByUser(accountId ?? userId, this.clock()),
      audience === 'kids' && privileged
        ? this.gamification.listCourseMilestones(userId, audience)
        : Promise.resolve(null),
    ])
    const journeyState =
      audience === 'kids' && !privileged
        ? await this.kidsJourney.courseState(
            { userId, accountId: accountId ?? userId },
            published.map((course) => course.id),
          )
        : audience === 'adult' && !privileged
          ? await this.adultJourney?.courseState(
              userId,
              published.map((course) => course.id),
            )
          : null
    const milestones = journeyState?.milestones ?? staffMilestones ?? new Map()

    // Chave-mestra POR AUDIÊNCIA destrava a vitrine inteira (atuais e futuros):
    // `all_courses` na adulta, `all_kids_courses` na kids (cada uma só na sua).
    // Equipe interna (`privileged`) destrava as duas — chave-mestra virtual.
    const masterType = audience === 'adult' ? 'all_courses' : 'all_kids_courses'
    const hasMaster = privileged || active.some((e) => e.accessType === masterType)
    const owned = new Set<string>()
    for (const e of active) {
      if (e.accessType === 'course' && e.courseRef) owned.add(e.courseRef)
    }

    const journeyLocks = journeyLockViews(published, journeyState?.locks ?? null)
    return published.map((course) => {
      const directAccess = independentCourseAccessReason(course.slug, active, this.clock())
      const lock = directAccess ? { locked: false } : journeyLocks.get(course.id)
      return {
        ...toCatalogCourseView(
          course,
          hasMaster || owned.has(course.slug),
          lock,
          milestones.get(course.id),
        ),
        curriculum: journeyState?.courseContexts.get(course.id),
        accessReason: privileged ? ('staff' as const) : (directAccess ?? ('journey' as const)),
      }
    })
  }
}
