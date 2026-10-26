import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  type CreatorMasteriesResponse,
  type CreatorMasteryEvidenceResponse,
  type CreatorMasteryReviewDetail,
  type CreatorMasteryReviewQueue,
  type CreatorMasterySubmission,
  evaluateCreatorMasteries,
  MasteryReviewInputSchema,
  MasterySubmissionInputSchema,
} from '@sistemazero/core/journey'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type {
  MasteryContext,
  MasteryOwner,
  MasteryRepository,
  MasteryReviewRecord,
  MasterySubmissionProgressRecord,
} from '../../domain/ports/mastery-repository.port'
import {
  masteryDefinitionCourseIds,
  masteryJourneyFacts,
} from '../creator-journey/mastery-journey-facts'

export class MasteryConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor() {
    super('Esta entrega já foi revisada ou substituída. Atualize a página.')
  }
}
const approved = (review: MasteryReviewRecord) =>
  review.criteria.every((c) => c.result === 'approved')
function view(
  submission: MasterySubmissionProgressRecord,
  review: MasteryReviewRecord | null,
): CreatorMasterySubmission {
  return {
    id: submission.id,
    evidenceId: submission.evidence.id,
    evidenceTitle: submission.evidence.title,
    masteryId: submission.masteryId,
    level: submission.level,
    policyVersion: submission.policyVersion,
    rubricVersion: submission.definition.rubric.version,
    submittedAt: submission.submittedAt.toISOString(),
    message: submission.message,
    status: review ? (approved(review) ? 'approved' : 'changes-requested') : 'pending',
    feedback: review?.feedback ?? null,
    criteria: review?.criteria ?? [],
    credits: review?.credits ?? [],
    reviewedAt: review?.reviewedAt.toISOString() ?? null,
  }
}

/** Account/profile identity is supplied by the authenticated HTTP boundary, never from a request body. */
export class MasteryService {
  constructor(
    private readonly repository: MasteryRepository,
    private readonly context: (
      owner: MasteryOwner,
      extraCourseIds?: readonly string[],
    ) => Promise<MasteryContext>,
    private readonly entitlements: Pick<EntitlementRepository, 'listActiveByUser'>,
    private readonly clock: () => Date = () => new Date(),
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  private async access(owner: MasteryOwner) {
    const active = await this.entitlements.listActiveByUser(owner.accountId, this.clock())
    const masterType = owner.audience === 'kids' ? 'all_kids_courses' : 'all_courses'
    return active.some((entitlement) => entitlement.accessType === masterType)
  }

  async get(owner: MasteryOwner): Promise<CreatorMasteriesResponse> {
    return this.readState(owner, true)
  }

  private async readState(
    owner: MasteryOwner,
    reconcile: boolean,
  ): Promise<CreatorMasteriesResponse> {
    const [records, hasAccess] = await Promise.all([
      this.repository.list(owner),
      this.access(owner),
    ])
    const facts = masteryJourneyFacts(records)
    const historicalCourseIds = masteryDefinitionCourseIds(facts)
    const context = await this.context(owner, historicalCourseIds)
    if (!context.curriculum || !context.view)
      return { configured: false, policyVersion: context.policyVersion, hasAccess, areas: [] }
    const reviews = new Map(records.reviews.map((r) => [r.submissionId, r]))
    const reviewed = records.submissions.flatMap((s) => {
      const review = reviews.get(s.id)
      return review ? [{ submission: s, review }] : []
    })
    const awards = [...records.awards]
    const project = () =>
      evaluateCreatorMasteries({
        curriculum: context.curriculum!,
        ...facts,
        completedCourseIds: context.milestones.filter((m) => m.completed).map((m) => m.courseId),
        earnedLevel: context.view?.level,
        retainedCourseIds: context.view?.retainedCourseIds,
        catalog: context.catalog,
        audience: owner.audience,
        paused: context.paused,
        masteryAwards: awards,
        pairCompletedLevels: context
          .view!.stages.filter((s) => (s.available && s.pairCompleted) || s.earned)
          .map((s) => s.level),
      })
    // Course completion can finish a previously approved delivery; reconciliation is idempotent.
    for (const area of reconcile ? project() : [])
      for (const level of area.levels) {
        if (!level.completed || level.earned) continue
        const accepted = reviewed.find((r) => r.submission.id === level.approvedSubmissionId)
        if (!accepted) continue
        const award = {
          ...owner,
          masteryId: area.id,
          level: level.level,
          submissionId: accepted.submission.id,
          reviewId: accepted.review.id,
          capabilities: accepted.submission.definition.grants ?? [],
          awardedAt: this.clock(),
        }
        const result = await this.repository.award(award, { policyVersion: context.policyVersion })
        // A concurrent policy edit/pause must not leak the obsolete projection into the response.
        // The review already committed; refresh once without another write attempt.
        if (result.status === 'deferred') return this.readState(owner, false)
        awards.push(result.award)
      }
    return {
      configured: true,
      policyVersion: context.policyVersion,
      hasAccess,
      areas: project().map((area) => ({
        ...area,
        levels: area.levels.map((level) => {
          const latest = records.submissions.findLast(
            (s) => s.masteryId === area.id && s.level === level.level,
          )
          return {
            ...level,
            submission: latest ? view(latest, reviews.get(latest.id) ?? null) : null,
          }
        }),
      })),
    }
  }

  async evidence(owner: MasteryOwner): Promise<CreatorMasteryEvidenceResponse> {
    const rows = await this.repository.listEvidence(owner)
    return {
      evidence: rows.map((e) => ({
        id: e.id,
        title: e.title,
        createdAt: e.createdAt.toISOString(),
        lessonId: e.lessonId,
        kind: e.kind,
      })),
    }
  }

  async submit(owner: MasteryOwner, masteryId: string, levelNumber: number, input: unknown) {
    const parsed = MasterySubmissionInputSchema.safeParse(input)
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Entrega inválida.')
    const [context, state, evidence] = await Promise.all([
      this.context(owner),
      this.get(owner),
      this.repository.findEvidence(owner, parsed.data.evidenceId),
    ])
    if (!state.hasAccess)
      throw new ForbiddenError(
        'Uma assinatura ativa desta comunidade é necessária para enviar a Maestria.',
      )
    const area = context.curriculum?.masteries.find((a) => a.id === masteryId)
    const level = area?.levels.find((l) => l.level === levelNumber)
    const progress = state.areas
      .find((a) => a.id === masteryId)
      ?.levels.find((l) => l.level === levelNumber)
    if (!area || !level || !progress?.available)
      throw new ForbiddenError('Conclua o par de entrada e o nível anterior desta Maestria.')
    if (!evidence) throw new ValidationError('Escolha uma entrega sua, desta comunidade.')
    if (
      !evidence.payload ||
      typeof evidence.payload !== 'object' ||
      !('project' in evidence.payload) ||
      !evidence.payload.project
    )
      throw new ValidationError(
        'Esta evidência não contém um projeto. Envie o projeto na aula antes de selecioná-lo.',
      )
    const prior = (await this.repository.list(owner)).submissions.findLast(
      (s) => s.masteryId === area.id && s.level === level.level,
    )
    const saved = await this.repository.submit({
      ...owner,
      id: this.nextId(),
      masteryId: area.id,
      areaTitle: area.title,
      level: level.level,
      policyVersion: prior?.policyVersion ?? context.policyVersion,
      definition: prior?.definition ?? level,
      evidence,
      message: parsed.data.message || null,
      submittedAt: this.clock(),
    })
    return view(saved, await this.repository.findReview(saved.id))
  }

  async queue(filter: {
    audience: 'kids' | 'adult'
    status: 'pending' | 'reviewed' | 'all'
    limit: number
    offset: number
  }): Promise<CreatorMasteryReviewQueue> {
    const rows = await this.repository.listQueue(filter)
    return {
      limit: filter.limit,
      offset: filter.offset,
      submissions: rows.map(({ submission, review }) => ({
        ...view(submission, review),
        userId: submission.userId,
        accountId: submission.accountId,
        audience: submission.audience,
        areaTitle: submission.areaTitle,
      })),
    }
  }

  async detail(submissionId: string): Promise<CreatorMasteryReviewDetail> {
    const submission = await this.repository.findSubmission(submissionId)
    if (!submission) throw new ValidationError('Entrega não encontrada.')
    return {
      submission: view(submission, await this.repository.findReview(submissionId)),
      userId: submission.userId,
      accountId: submission.accountId,
      audience: submission.audience,
      areaTitle: submission.areaTitle,
      definition: submission.definition,
      evidence: {
        payload: submission.evidence.payload,
        revision: submission.evidence.revision,
        createdAt: submission.evidence.createdAt.toISOString(),
      },
    }
  }

  async review(submissionId: string, reviewerId: string, input: unknown) {
    const parsed = MasteryReviewInputSchema.safeParse(input)
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Revisão inválida.')
    const submission = await this.repository.findSubmission(submissionId)
    if (!submission) throw new ValidationError('Entrega não encontrada.')
    if (reviewerId === submission.userId || reviewerId === submission.accountId)
      throw new ForbiddenError('A revisão precisa ser feita por outra pessoa da equipe.')
    const expected = submission.definition.rubric.criteria.map((c) => c.id)
    if (
      parsed.data.criteria.length !== expected.length ||
      parsed.data.criteria.some((c) => !expected.includes(c.criterionId))
    )
      throw new ValidationError(
        'Revise todos os critérios da versão enviada, sem acrescentar ou omitir critérios.',
      )
    const validCredits = ['nucleus', ...submission.definition.workshops.map((w) => w.id)]
    if (parsed.data.credits.some((c) => !validCredits.includes(c.requirementId)))
      throw new ValidationError(
        'O crédito precisa corresponder ao núcleo ou a uma oficina deste nível.',
      )
    if (parsed.data.credits.length && parsed.data.criteria.some((c) => c.result !== 'approved'))
      throw new ValidationError(
        'Conceda equivalências quando a entrega estiver aprovada em todos os critérios.',
      )
    const record = {
      ...parsed.data,
      id: this.nextId(),
      submissionId,
      reviewerId,
      reviewedAt: this.clock(),
    }
    if (!(await this.repository.review(record))) throw new MasteryConflictError()
    await this.get(submission)
    return view(submission, record)
  }
}
