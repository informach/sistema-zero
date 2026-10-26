import { DomainError, ValidationError } from '@sistemazero/core/errors'
import {
  ADULT_CREATOR_CAPABILITIES,
  type AdultCreatorCapability,
  type AdultJourneyPolicy,
  AdultJourneyPolicySchema,
  type AdultJourneyPosition,
  type AdultJourneyView,
  adultJourneyPosition,
  creatorJourneyCourseIds,
  creatorJourneyOpenCourseIds,
  EMPTY_ADULT_JOURNEY_POLICY,
  type JourneyCourseLock,
  projectAdultJourney,
  resolveCreatorJourneyCourseLock,
  withCreatorMasteryDefinitions,
} from '@sistemazero/core/journey'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { AdultJourneyRepository } from '../../domain/ports/adult-journey-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import { creatorCourseContexts } from '../creator-journey/course-context'
import {
  type MasteryJourneyFactsReader,
  masteryDefinitionCourseIds,
  noMasteryJourneyFacts,
} from '../creator-journey/mastery-journey-facts'

export class AdultJourneyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor() {
    super('A configuração mudou. Atualize a página antes de salvar novamente.')
  }
}

export class AdultJourneyService {
  constructor(
    private readonly repository: AdultJourneyRepository,
    private readonly courses: Pick<CourseRepository, 'findCourseById' | 'findCoursesByIds'>,
    private readonly clock: () => Date,
    private readonly readMasteryFacts: MasteryJourneyFactsReader = noMasteryJourneyFacts,
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
    const policy = await this.validate(input)
    const saved = await this.repository.savePolicy(policy, expectedVersion, this.clock())
    if (!saved) throw new AdultJourneyConflictError()
    return saved
  }

  /**
   * Grava a política SÓ se ainda não houver nenhuma (versão 0), pela mesma validação do Admin. É o
   * caminho do seed automático: nunca sobrescreve a configuração do Admin nem a de um seed anterior.
   * Devolve `null` quando já existe política (inclusive se outra instância gravou antes).
   */
  async seedIfAbsent(input: unknown) {
    const policy = await this.validate(input)
    return this.repository.insertPolicyIfAbsent(policy, this.clock())
  }

  /** A validação do Admin, a mesma para o seed: cursos adultos gravados e IA só após avançado. */
  private async validate(input: unknown): Promise<AdultJourneyPolicy> {
    const parsed = AdultJourneyPolicySchema.safeParse(input)
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Política inválida.')
    const policy = parsed.data
    const ids = [
      ...new Set([
        ...policy.stages.flatMap((stage) =>
          stage.requirements.map((requirement) => requirement.courseId),
        ),
        ...(policy.curriculum ? creatorJourneyCourseIds(policy.curriculum) : []),
      ]),
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
    // The new curriculum grants capabilities at explicit teaching milestones. Legacy
    // stage policies retain their original advanced-course restriction.
    if (policy.curriculum) return policy
    let advancedCompleted = false
    for (const stage of policy.stages) {
      advancedCompleted ||= stage.requirements.some(
        (requirement) => courses.get(requirement.courseId)?.level === 'avancado',
      )
      if (
        stage.requirements.length > 0 &&
        stage.capabilities.some((capability) => capability === 'ai' || capability === 'pensa') &&
        !advancedCompleted
      )
        throw new ValidationError(
          'Recursos de IA exigem a conclusão de um curso adulto avançado nesta etapa ou numa anterior.',
        )
    }
    return policy
  }

  /**
   * A jornada da pessoa. Capacidades novas são congeladas e o piso da posição sobe (nunca desce) no
   * mesmo ponto, sob a versão da política em que foram calculados: editar a política depois não
   * tira ferramenta nem faz a pessoa voltar de etapa. Etapas abaixo do piso aparecem concluídas.
   */
  async get(userId: string, privileged = false): Promise<AdultJourneyView> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const [record, milestones, frozen, reached, retainedCourseIds] = await Promise.all([
        this.policy(),
        this.repository.listMilestones(userId),
        this.repository.listGranted(userId),
        this.repository.getReached(userId),
        this.repository.listCourseGrants(userId),
      ])
      const masteryFacts = record.policy.curriculum
        ? await this.readMasteryFacts({ userId, accountId: userId, audience: 'adult' })
        : await noMasteryJourneyFacts({ userId, accountId: userId, audience: 'adult' })
      const catalog = record.policy.curriculum
        ? await this.courses.findCoursesByIds([
            ...new Set([
              ...creatorJourneyCourseIds(record.policy.curriculum),
              ...masteryDefinitionCourseIds(masteryFacts),
            ]),
          ])
        : undefined
      const result = projectAdultJourney(
        record.policy,
        record.version,
        milestones,
        frozen,
        reached,
        { catalog, ...masteryFacts, retainedCourseIds },
      )
      const courseGrants =
        record.policy.curriculum && result.curriculum
          ? creatorJourneyOpenCourseIds(record.policy.curriculum, result.curriculum).filter(
              (id) => !retainedCourseIds.includes(id),
            )
          : []
      const newlyEarned = result.capabilities.filter((capability) => !frozen.includes(capability))
      const position = adultJourneyPosition(result)?.position ?? null
      const raisesFloor = position !== null && position > (reached ?? 1)
      if (
        (newlyEarned.length || raisesFloor || courseGrants.length) &&
        !(await this.repository.freezeGranted(
          userId,
          record.version,
          newlyEarned,
          this.clock(),
          raisesFloor ? position : null,
          courseGrants,
        )) &&
        // Só capacidade nova exige a gravação; subir o piso sozinho é melhor esforço (a próxima
        // leitura tenta de novo) e não pode transformar uma leitura comum em conflito.
        (newlyEarned.length || courseGrants.length)
      )
        continue
      return privileged ? { ...result, capabilities: [...ADULT_CREATOR_CAPABILITIES] } : result
    }
    throw new AdultJourneyConflictError()
  }

  /**
   * A etapa de VÁRIAS pessoas: a política uma vez, os marcos e os pisos numa consulta cada. Só
   * leitura (não congela nem sobe piso) e vazia sem jornada configurada. Usa o mesmo piso da
   * leitura individual, então a lista nunca mostra alguém numa etapa abaixo da que já alcançou.
   */
  async positions(userIds: readonly string[]): Promise<Map<string, AdultJourneyPosition>> {
    const out = new Map<string, AdultJourneyPosition>()
    const unique = [...new Set(userIds)]
    if (unique.length === 0) return out
    const record = await this.policy()
    if (record.policy.stages.length === 0 && !record.policy.curriculum) return out
    const [milestones, reached] = await Promise.all([
      this.repository.listMilestonesForUsers(unique),
      this.repository.listReachedForUsers(unique),
    ])
    const catalog = record.policy.curriculum
      ? await this.courses.findCoursesByIds(creatorJourneyCourseIds(record.policy.curriculum))
      : undefined
    for (const userId of unique) {
      const position = adultJourneyPosition(
        projectAdultJourney(
          record.policy,
          record.version,
          milestones.get(userId) ?? [],
          [],
          reached.get(userId) ?? null,
          { catalog },
        ),
      )
      if (position) out.set(userId, position)
    }
    return out
  }

  /** The same projection that supplies the journey also authorizes course navigation. */
  async masteryContext(userId: string, extraCourseIds: readonly string[] = []) {
    const [record, milestones, frozen, reached, retainedCourseIds] = await Promise.all([
      this.policy(),
      this.repository.listMilestones(userId),
      this.repository.listGranted(userId),
      this.repository.getReached(userId),
      this.repository.listCourseGrants(userId),
    ])
    const masteryFacts = record.policy.curriculum
      ? await this.readMasteryFacts({ userId, accountId: userId, audience: 'adult' })
      : await noMasteryJourneyFacts({ userId, accountId: userId, audience: 'adult' })
    const curriculum = record.policy.curriculum
      ? withCreatorMasteryDefinitions(record.policy.curriculum, masteryFacts.masteryDefinitions)
      : null
    const catalog = curriculum
      ? await this.courses.findCoursesByIds([
          ...new Set([...creatorJourneyCourseIds(curriculum), ...extraCourseIds]),
        ])
      : []
    const projected = projectAdultJourney(
      record.policy,
      record.version,
      milestones,
      frozen,
      reached,
      { catalog, ...masteryFacts, retainedCourseIds },
    )
    return {
      policyVersion: record.version,
      curriculum,
      catalog,
      view: projected.curriculum ?? null,
      milestones,
    }
  }

  /** The same projection that supplies the journey also authorizes course navigation. */
  async courseState(userId: string, courseIds: readonly string[]) {
    const [record, milestones, frozen, reached, retainedCourseIds] = await Promise.all([
      this.policy(),
      this.repository.listMilestones(userId),
      this.repository.listGranted(userId),
      this.repository.getReached(userId),
      this.repository.listCourseGrants(userId),
    ])
    const masteryFacts = record.policy.curriculum
      ? await this.readMasteryFacts({ userId, accountId: userId, audience: 'adult' })
      : await noMasteryJourneyFacts({ userId, accountId: userId, audience: 'adult' })
    const curriculum = record.policy.curriculum
      ? withCreatorMasteryDefinitions(record.policy.curriculum, masteryFacts.masteryDefinitions)
      : undefined
    const catalog = curriculum
      ? await this.courses.findCoursesByIds(creatorJourneyCourseIds(curriculum))
      : undefined
    const projected = projectAdultJourney(
      record.policy,
      record.version,
      milestones,
      frozen,
      reached,
      { catalog, ...masteryFacts, retainedCourseIds },
    )
    return {
      curriculum,
      courseContexts: creatorCourseContexts(curriculum),
      locks: new Map(
        courseIds.map((courseId): [string, JourneyCourseLock] => [
          courseId,
          curriculum && projected.curriculum
            ? resolveCreatorJourneyCourseLock({ curriculum, view: projected.curriculum, courseId })
            : { locked: false },
        ]),
      ),
      milestones: new Map(
        milestones.map((fact) => [
          fact.courseId,
          {
            completed: fact.completed,
            showcased: fact.showcased,
          },
        ]),
      ),
    }
  }

  async assert(userId: string, capability: AdultCreatorCapability, privileged = false) {
    if (privileged) return
    const view = await this.get(userId)
    if (!view.capabilities.includes(capability))
      throw new AccessDeniedError('Conclua a etapa que libera esta ferramenta na jornada adulta.')
  }
}
