import { DomainError, ValidationError } from '@sistemazero/core/errors'
import {
  ADULT_CREATOR_CAPABILITIES,
  type AdultCreatorCapability,
  AdultJourneyPolicySchema,
  type AdultJourneyView,
  EMPTY_ADULT_JOURNEY_POLICY,
  projectAdultJourney,
} from '@sistemazero/core/journey'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { AdultJourneyRepository } from '../../domain/ports/adult-journey-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'

export class AdultJourneyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor() {
    super('A configuração mudou. Atualize a página antes de salvar novamente.')
  }
}

export class AdultJourneyService {
  constructor(
    private readonly repository: AdultJourneyRepository,
    private readonly courses: Pick<CourseRepository, 'findCourseById'>,
    private readonly clock: () => Date,
  ) {}

  async policy() {
    return (await this.repository.getPolicy()) ?? { version: 0, policy: EMPTY_ADULT_JOURNEY_POLICY }
  }

  async configure(input: unknown, expectedVersion: number) {
    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0 ||
      expectedVersion > 2_147_483_646
    )
      throw new ValidationError('Versão de configuração inválida.')
    const parsed = AdultJourneyPolicySchema.safeParse(input)
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Política inválida.')
    const policy = parsed.data
    const ids = [
      ...new Set(
        policy.stages.flatMap((stage) =>
          stage.requirements.map((requirement) => requirement.courseId),
        ),
      ),
    ]
    const courses = new Map<string, Awaited<ReturnType<CourseRepository['findCourseById']>>>()
    for (let offset = 0; offset < ids.length; offset += 16) {
      for (const [id, course] of await Promise.all(
        ids
          .slice(offset, offset + 16)
          .map(async (id) => [id, await this.courses.findCourseById(id)] as const),
      ))
        courses.set(id, course)
    }
    for (const course of courses.values()) {
      if (course?.audience !== 'adult' || course.modality !== 'recorded')
        throw new ValidationError('A jornada adulta aceita somente cursos adultos gravados.')
    }
    let advancedCompleted = false
    for (const stage of policy.stages) {
      advancedCompleted ||= stage.requirements.some(
        (requirement) => courses.get(requirement.courseId)?.level === 'avancado',
      )
      if (
        stage.capabilities.some((capability) => capability === 'ai' || capability === 'pensa') &&
        !advancedCompleted
      )
        throw new ValidationError(
          'Recursos de IA exigem a conclusão de um curso adulto avançado nesta etapa ou numa anterior.',
        )
    }
    const saved = await this.repository.savePolicy(policy, expectedVersion, this.clock())
    if (!saved) throw new AdultJourneyConflictError()
    return saved
  }

  async get(userId: string, privileged = false): Promise<AdultJourneyView> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const [record, milestones, frozen] = await Promise.all([
        this.policy(),
        this.repository.listMilestones(userId),
        this.repository.listGranted(userId),
      ])
      const result = projectAdultJourney(record.policy, record.version, milestones, frozen)
      const newlyEarned = result.capabilities.filter((capability) => !frozen.includes(capability))
      if (
        newlyEarned.length &&
        !(await this.repository.freezeGranted(userId, record.version, newlyEarned, this.clock()))
      )
        continue
      return privileged ? { ...result, capabilities: [...ADULT_CREATOR_CAPABILITIES] } : result
    }
    throw new AdultJourneyConflictError()
  }

  async assert(userId: string, capability: AdultCreatorCapability, privileged = false) {
    if (privileged) return
    const view = await this.get(userId)
    if (!view.capabilities.includes(capability))
      throw new AccessDeniedError('Conclua a etapa que libera esta ferramenta na jornada adulta.')
  }
}
