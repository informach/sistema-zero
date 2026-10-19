import { expect, test } from 'bun:test'
import {
  analyzeKidsJourneyReadiness,
  compareKidsJourney,
  initialKidsJourneyPolicy,
  pauseKidsJourneyPolicy,
} from '@sistemazero/core/journey'
import {
  KidsPolicyRecordSchema,
  KidsPreparationSchema,
  KidsPreviewSchema,
} from '../src/lib/kids-journey-editor'

const policy = initialKidsJourneyPolicy()
const record = { phase: 'published', version: 1, policy, permissions: { canEdit: true } }

test('editor wire contract never turns missing, corrupt or initializing policy into a published default', () => {
  for (const value of [
    null,
    {},
    { ...record, policy: null },
    { ...record, version: 0 },
    { ...record, permissions: undefined },
    { ...record, permissions: { canEdit: 'true' } },
  ])
    expect(KidsPolicyRecordSchema.safeParse(value).success).toBe(false)
  expect(
    KidsPolicyRecordSchema.parse({ ...record, phase: 'initializing', version: 0 }),
  ).toMatchObject({ phase: 'initializing', version: 0 })
  expect(
    KidsPolicyRecordSchema.parse({ ...record, permissions: { canEdit: false } }).permissions
      .canEdit,
  ).toBe(false)
})

test('editor wire contract retains a mode-only server comparison even when no requirement changed', () => {
  const paused = pauseKidsJourneyPolicy(policy)
  const impact = compareKidsJourney({
    policy,
    proposedPolicy: paused,
    policyVersion: 1,
    catalog: [],
    earned: {
      level: 'noob',
      capabilities: [],
      courseAccess: { entry: [], expanded: [], reward: [] },
    },
    milestones: [],
  })
  const preview = KidsPreviewSchema.parse({
    baseVersion: 1,
    scope: 'selected-profiles',
    readiness: analyzeKidsJourneyReadiness({ policy: paused, catalog: [] }),
    newLearner: impact,
    sample: [],
  })
  expect(preview.newLearner.changes).toEqual([])
  expect(preview.newLearner.before.mode).toBe('active')
  expect(preview.newLearner.after.mode).toBe('paused')
})

test('editor preparation preserves server CAS data and refuses bootstrap rows on the human publication path', () => {
  const prepared = {
    id: '11111111-1111-4111-8111-111111111111',
    origin: 'configuration',
    expectedVersion: 1,
    candidatePolicy: policy,
    draftHash: 'a'.repeat(64),
    catalogHash: 'b'.repeat(64),
    cohortHash: null,
    status: 'capturing',
    processed: 0,
    reason: 'Revisão',
    actorKind: 'user',
    actorId: '22222222-2222-4222-8222-222222222222',
    updatedAt: '2026-10-19T12:00:00.000Z',
  }
  expect(KidsPreparationSchema.parse(prepared)).toMatchObject({
    draftHash: prepared.draftHash,
    cohortHash: null,
    expectedVersion: 1,
  })
  expect(
    KidsPreparationSchema.safeParse({
      ...prepared,
      origin: 'seed',
      actorKind: 'system',
      actorId: null,
    }).success,
  ).toBe(false)
  expect(KidsPreparationSchema.safeParse({ ...prepared, draftHash: 'invented' }).success).toBe(
    false,
  )
})
