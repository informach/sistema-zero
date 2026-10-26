import type { CreatorMasteryJourneyFacts } from '@sistemazero/core/journey'
import type {
  MasteryOwner,
  MasteryReviewRecord,
  MasterySubmissionProgressRecord,
} from '../../domain/ports/mastery-repository.port'

export type MasteryJourneyFactsReader = (owner: MasteryOwner) => Promise<CreatorMasteryJourneyFacts>
export const noMasteryJourneyFacts: MasteryJourneyFactsReader = async () => ({
  masteryAwards: [],
  masteryApprovals: [],
  masteryAdmissions: [],
  masteryDefinitions: [],
})

/** The repository has already verified owner/account/audience; project payloads are unnecessary. */
export function masteryJourneyFacts(records: {
  submissions: readonly Pick<
    MasterySubmissionProgressRecord,
    'id' | 'masteryId' | 'level' | 'definition' | 'submittedAt'
  >[]
  reviews: readonly MasteryReviewRecord[]
  awards: CreatorMasteryJourneyFacts['masteryAwards']
}): CreatorMasteryJourneyFacts {
  const ordered = [...records.submissions].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.id.localeCompare(b.id),
  )
  const definitions = new Map<string, CreatorMasteryJourneyFacts['masteryDefinitions'][number]>()
  const reviews = new Map(records.reviews.map((review) => [review.submissionId, review]))
  const approvals: CreatorMasteryJourneyFacts['masteryApprovals'][number][] = []
  for (const submission of ordered) {
    const key = `${submission.masteryId}:${submission.level}`
    if (!definitions.has(key))
      definitions.set(key, { masteryId: submission.masteryId, definition: submission.definition })
    const review = reviews.get(submission.id)
    if (!review) continue
    approvals.push({
      masteryId: submission.masteryId,
      level: submission.level,
      rubricVersion: submission.definition.rubric.version,
      submissionId: submission.id,
      decision: review.criteria.every((criterion) => criterion.result === 'approved')
        ? 'approved'
        : 'changes-requested',
      approvedCriteriaIds: review.criteria
        .filter((criterion) => criterion.result === 'approved')
        .map((criterion) => criterion.criterionId),
      nucleusEquivalent: review.credits.some((credit) => credit.requirementId === 'nucleus'),
      workshopCredits: review.credits
        .filter((credit) => credit.requirementId !== 'nucleus')
        .map((credit) => credit.requirementId),
    })
  }
  return {
    masteryAwards: records.awards,
    masteryApprovals: approvals,
    masteryAdmissions: [...definitions.values()].map(({ masteryId, definition }) => ({
      masteryId,
      level: definition.level,
    })),
    masteryDefinitions: [...definitions.values()],
  }
}

export function masteryDefinitionCourseIds(
  facts: Pick<CreatorMasteryJourneyFacts, 'masteryDefinitions'>,
): string[] {
  return [
    ...new Set(
      facts.masteryDefinitions.flatMap(({ definition }) => [
        ...definition.nucleusCourseIds,
        ...definition.workshops.flatMap((workshop) => workshop.courseIds),
        ...(definition.projectCourseId ? [definition.projectCourseId] : []),
      ]),
    ),
  ]
}
