import { ValidationError } from '@sistemazero/core/errors'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import {
  analyzeKidsJourneyReadiness,
  compareKidsJourney,
  type KidsJourneyImpact,
  KidsJourneyPolicySchema,
} from '@sistemazero/core/journey'
import { z } from 'zod'
import {
  KidsJourneyConflictError,
  KidsJourneyPreparationMissingError,
  KidsJourneyUnavailableError,
} from '../../domain/kids-journey/kids-journey.errors'
import type {
  KidsJourneyOwner,
  KidsJourneyPreparation,
  KidsJourneyRepository,
  KidsJourneySnapshot,
} from '../../domain/ports/kids-journey-repository.port'

const Version = z.number().int().min(1).max(2_147_483_646)
const Owner = z.strictObject({ userId: IdentityUuidSchema, accountId: IdentityUuidSchema })
const Draft = z.strictObject({
  expectedVersion: Version,
  policy: KidsJourneyPolicySchema,
})
const PreparationInput = Draft.extend({
  actorId: IdentityUuidSchema,
  reason: z.string().trim().min(1).max(500),
})
const PublicationInput = z.strictObject({
  preparationId: IdentityUuidSchema,
  expectedVersion: Version,
  draftHash: z.string().regex(/^[a-f0-9]{64}$/),
  catalogHash: z.string().regex(/^[a-f0-9]{64}$/),
  cohortHash: z.string().regex(/^[a-f0-9]{64}$/),
  actorId: IdentityUuidSchema,
})
const ADVANCE_OPERATIONS_MAX = 20

type Port = Pick<
  KidsJourneyRepository,
  | 'readSnapshot'
  | 'createPreparation'
  | 'getPreparation'
  | 'advanceCapture'
  | 'advancePreparation'
  | 'publishPrepared'
  | 'listHistory'
>

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success)
    throw new ValidationError(result.error.issues[0]?.message ?? 'Configuração inválida.')
  return result.data
}
function assertVersion(snapshot: KidsJourneySnapshot, expectedVersion: number) {
  if (snapshot.policy.phase !== 'published' || snapshot.policy.version < 1)
    throw new KidsJourneyUnavailableError()
  if (snapshot.policy.version !== expectedVersion) throw new KidsJourneyConflictError()
}

/** Global pedagogical configuration. HTTP RBAC and actor identity stay in the trusted route. */
export class KidsJourneyConfigurationService {
  constructor(private readonly repository: Port) {}

  async policy() {
    const snapshot = await this.repository.readSnapshot([])
    return { ...snapshot.policy, catalog: snapshot.catalog }
  }

  /** Explicit sample + a labelled new-learner simulation. No freeze, preparation or grant writes. */
  async preview(input: unknown, inputOwners: readonly KidsJourneyOwner[] = []) {
    const draft = parse(Draft, input)
    const owners = parse(z.array(Owner).max(20), inputOwners)
    const snapshot = await this.repository.readSnapshot(owners)
    assertVersion(snapshot, draft.expectedVersion)
    const simulate = (
      earned: Parameters<typeof compareKidsJourney>[0]['earned'],
      milestones: Parameters<typeof compareKidsJourney>[0]['milestones'],
    ): KidsJourneyImpact =>
      compareKidsJourney({
        policy: snapshot.policy.policy,
        proposedPolicy: draft.policy,
        policyVersion: snapshot.policy.version,
        catalog: snapshot.catalog,
        earned,
        milestones,
      })
    const sample = owners.map((owner) => {
      const profile = snapshot.profiles.get(owner.userId)
      if (
        !profile?.registered ||
        profile.accountId !== owner.accountId ||
        profile.userId !== owner.userId
      )
        throw new KidsJourneyUnavailableError()
      return { owner, impact: simulate(profile.earned, profile.milestones) }
    })
    return {
      baseVersion: snapshot.policy.version,
      readiness: analyzeKidsJourneyReadiness({ policy: draft.policy, catalog: snapshot.catalog }),
      newLearner: simulate(
        { level: 'noob', capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] } },
        [],
      ),
      sample,
      scope: 'selected-profiles' as const,
    }
  }

  async prepare(input: unknown) {
    const parsed = parse(PreparationInput, input)
    const snapshot = await this.repository.readSnapshot([])
    assertVersion(snapshot, parsed.expectedVersion)
    const readiness = analyzeKidsJourneyReadiness({
      policy: parsed.policy,
      catalog: snapshot.catalog,
    })
    const error = readiness.issues.find(
      (issue) => issue.severity === 'error' || issue.severity === 'unavailable',
    )
    if (error) throw new ValidationError(error.message)
    const result = await this.repository.createPreparation({
      expectedVersion: parsed.expectedVersion,
      candidatePolicy: parsed.policy,
      actor: { kind: 'user', id: parsed.actorId },
      reason: parsed.reason,
    })
    if (!result) throw new KidsJourneyConflictError()
    return result
  }

  async preparation(inputId: string) {
    const id = parse(IdentityUuidSchema, inputId)
    const result = await this.repository.getPreparation(id)
    if (!result || result.origin !== 'configuration') throw new KidsJourneyPreparationMissingError()
    return result
  }

  /** Bounded explicit advance. Every individual owner/hash/cursor step has its own atomic CAS. */
  async advance(inputId: string): Promise<{
    status: 'advanced' | 'conflict' | 'stale' | 'unowned' | 'missing'
    preparation: KidsJourneyPreparation
  }> {
    const id = parse(IdentityUuidSchema, inputId)
    let current = await this.preparation(id)
    for (let count = 0; count < ADVANCE_OPERATIONS_MAX; count++) {
      if (current.status === 'stale') return { status: 'stale', preparation: current }
      if (current.status !== 'capturing' && current.status !== 'preparing')
        return { status: 'advanced', preparation: current }
      if (current.status === 'capturing') {
        if (current.captureStage === 'auth') throw new KidsJourneyUnavailableError()
        const next = await this.repository.advanceCapture(
          id,
          current.captureStage,
          current.captureCursor,
        )
        if (!next) return { status: 'conflict', preparation: await this.preparation(id) }
        current = next
      } else {
        const progress = await this.repository.advancePreparation(id, current.cursor)
        if (progress.status !== 'advanced')
          return { status: progress.status, preparation: await this.preparation(id) }
        current = progress.preparation
      }
    }
    return { status: 'advanced', preparation: current }
  }

  async publish(input: unknown) {
    const captured = parse(PublicationInput, input)
    // Never accept a caller-selected system actor or bootstrap preparation on the Admin path.
    await this.preparation(captured.preparationId)
    const published = await this.repository.publishPrepared({
      preparationId: captured.preparationId,
      expectedVersion: captured.expectedVersion,
      draftHash: captured.draftHash,
      catalogHash: captured.catalogHash,
      cohortHash: captured.cohortHash,
      actor: { kind: 'user', id: captured.actorId },
    })
    if (!published) throw new KidsJourneyConflictError()
    return published
  }

  history(input: { beforeVersion?: number; limit?: number } = {}) {
    const captured = parse(
      z.strictObject({
        beforeVersion: Version.optional(),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      input,
    )
    return this.repository.listHistory(captured.beforeVersion, captured.limit)
  }
}
