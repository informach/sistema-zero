import { z } from 'zod'
import { PENSA_LIMITS } from './limits'

const id = z.uuid()
const text = (max: number) => z.string().trim().min(1).max(max)
const note = (max = 2_000) => z.string().max(max)
const itemId = text(120)
const date = z.iso.datetime({ offset: true })
const revision = z.number().int().nonnegative()
const positive = z.number().int().positive()
const ids = (max: number = PENSA_LIMITS.missions) => z.array(id).max(max)
const resourceIds = (max = 2_000) => z.array(text(160)).max(max)

export const PensaDestinationSchema = z.enum(['studio', 'pinta', 'molda'])
export const PensaAuthoringSchema = z.enum(['blocks', 'code'])
export const PensaActorSchema = z.strictObject({
  audience: z.enum(['adult', 'kids']).optional(),
  profileId: id,
  accountId: id,
  privileged: z.boolean(),
})
export const PensaCreationRefSchema = z.strictObject({
  tool: PensaDestinationSchema,
  profileId: id,
  creationId: text(120),
  saveRevision: text(120),
  contentFingerprint: text(200).nullable(),
})
export const PensaCheckSchema = z.strictObject({
  id: itemId,
  action: text(300),
  expected: text(300),
})
export const PensaRequirementSchema = z.strictObject({
  id,
  text: text(600),
  origin: z.enum(['child', 'suggestion', 'accepted_suggestion']),
  category: z.enum(['gameplay', 'visual', 'interface', 'content']),
})
export const PensaAssetSlotSchema = z.strictObject({
  id,
  name: text(120),
  kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'texture', 'sky']),
  description: text(1_000),
  source: z.enum(['create', 'existing', 'editor']),
  existing: PensaCreationRefSchema.nullable(),
})
export const PensaAdaptationSchema = z.strictObject({
  id,
  originalIntent: text(1_000),
  limitation: text(600),
  alternative: text(1_000),
  preserved: text(600),
  acceptedByProfileId: id.nullable(),
  acceptedAt: date.nullable(),
})
export const PensaIdeaSchema = z.strictObject({
  id,
  text: text(2_000),
  origin: z.enum(['child', 'zappy']),
})
export const PensaGameDefinitionSchema = z.strictObject({
  title: text(100),
  summary: text(1_000),
  originalIntent: text(PENSA_LIMITS.messageChars),
  playerExperience: text(1_000),
  dimension: z.enum(['2d', '3d']),
  requirements: z.array(PensaRequirementSchema).min(1).max(PENSA_LIMITS.requirements),
  assetSlots: z.array(PensaAssetSlotSchema).max(PENSA_LIMITS.assetSlots),
  openChoices: z.array(z.strictObject({ id: itemId, text: text(600) })).max(30),
  futureIdeas: z.array(PensaIdeaSchema).max(80),
  adaptations: z.array(PensaAdaptationSchema).max(40),
})
const missionBase = {
  id,
  contentRevision: positive,
  stageId: id,
  position: revision,
  title: text(120),
  objective: text(600),
  requirementIds: ids(PENSA_LIMITS.requirements),
  rules: z.array(z.strictObject({ id: itemId, text: text(300) })).max(6),
  checks: z.array(PensaCheckSchema).min(1).max(6),
  dependencyIds: ids(),
}
export const PensaMissionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...missionBase,
    kind: z.literal('setup'),
    destination: z.literal('studio'),
    setup: z.strictObject({
      type: z.literal('extensions'),
      authoring: z.literal('blocks'),
      runtimeExtensionId: text(160),
      requiredAuxiliaryExtensionIds: resourceIds(20),
      recommendation: text(600),
    }),
  }),
  z.strictObject({
    ...missionBase,
    kind: z.literal('feature'),
    destination: z.literal('studio'),
  }),
  z.strictObject({
    ...missionBase,
    kind: z.literal('asset'),
    destination: z.enum(['pinta', 'molda']),
    assetSlotIds: ids(PENSA_LIMITS.assetSlots),
  }),
  z.strictObject({
    ...missionBase,
    kind: z.literal('integration'),
    destination: z.literal('studio'),
    assetSlotIds: ids(PENSA_LIMITS.assetSlots),
  }),
  z.strictObject({
    ...missionBase,
    kind: z.literal('playtest'),
    destination: z.literal('studio'),
    scope: z.enum(['stage', 'project']),
  }),
])
export const PensaPlanSchema = z.strictObject({
  stages: z
    .array(z.strictObject({ id, title: text(120), position: revision }))
    .min(1)
    .max(PENSA_LIMITS.stages),
  missions: z.array(PensaMissionSchema).min(1).max(PENSA_LIMITS.missions),
})
export const PensaKnowledgeReferenceSchema = z.strictObject({
  kind: z.enum(['lesson', 'help', 'manual']),
  id: text(200),
  title: text(200),
  href: text(1_000).nullable(),
})
export const PensaMissionResourcesSchema = z.strictObject({
  missionId: id,
  blockIds: resourceIds(),
  extensionIds: resourceIds(80),
  moldaToolIds: resourceIds(80),
  manualIds: resourceIds(80),
})
export const PensaTechnicalPlanSchema = z.strictObject({
  capabilitiesFingerprint: text(128),
  catalogVersion: text(128),
  authoring: PensaAuthoringSchema,
  runtimeExtensionId: text(160).nullable(),
  extensions: z.array(z.strictObject({ id: text(160), name: text(160) })).max(80),
  missionResources: z.array(PensaMissionResourcesSchema).max(PENSA_LIMITS.missions),
  references: z.array(PensaKnowledgeReferenceSchema).max(80),
})
export const PensaParticipantCapabilitiesSchema = z.strictObject({
  profileId: id,
  // Explicit team preview has no learner rank; existing learner snapshots keep their string.
  rank: text(100).nullable(),
  studio: z.boolean(),
  studioAuthoring: PensaAuthoringSchema,
  pinta: z.boolean(),
  molda: z.boolean(),
  dimensions: z.array(z.enum(['2d', '3d'])).max(2),
  blockIds: resourceIds(),
  extensionIds: resourceIds(80),
  moldaTools: resourceIds(80),
  tutor: z.boolean(),
})
export const PensaCapabilitiesSchema = z.strictObject({
  fingerprint: text(128),
  catalogVersion: text(128),
  programmerProfileId: id,
  participants: z.array(PensaParticipantCapabilitiesSchema).min(1).max(PENSA_LIMITS.teamPeople),
  observedGame: z
    .strictObject({
      creation: PensaCreationRefSchema,
      authoring: PensaAuthoringSchema,
      dimension: z.enum(['2d', '3d']),
      runtimeExtensionId: text(160).nullable(),
      installedExtensionIds: resourceIds(80),
    })
    .nullable(),
})
export const PensaDeliverySchema = z.strictObject({
  assetSlotId: id.nullable(),
  creation: PensaCreationRefSchema,
})
export const PensaMissionVerificationSchema = z.strictObject({
  missionContentRevision: positive,
  source: z.enum(['child', 'saved_configuration']),
  note: note(),
  verifiedAt: date,
  verifiedByProfileId: id,
})
export const PensaMissionProgressSchema = z.strictObject({
  missionId: id,
  progressRevision: revision,
  status: z.enum(['planned', 'in_progress', 'completed']),
  validity: z.enum(['current', 'needs_review']),
  assigneeProfileId: id.nullable(),
  completedByProfileId: id.nullable(),
  deliveries: z.array(PensaDeliverySchema).max(PENSA_LIMITS.assetSlots),
  verification: PensaMissionVerificationSchema.nullable(),
  resumeNote: note().nullable(),
  startedAt: date.nullable(),
  completedAt: date.nullable(),
})
export const PensaProjectRevisionSchema = z.strictObject({
  id,
  projectId: id,
  number: positive,
  previousRevisionId: id.nullable(),
  definition: PensaGameDefinitionSchema,
  plan: PensaPlanSchema,
  technical: PensaTechnicalPlanSchema,
  acceptedByProfileId: id,
  acceptedAt: date,
})
export const PensaChangeImpactSchema = z.strictObject({
  addedMissionIds: ids(),
  removedMissionIds: ids(),
  changedMissionIds: ids(),
  editorialMissionIds: ids(),
  reorderedMissionIds: ids(),
  reviewMissionIds: ids(),
  affectedRequirementIds: ids(PENSA_LIMITS.requirements),
})
export const PensaPendingChoiceSchema = z.strictObject({
  id: itemId,
  kind: z.enum(['adaptation', 'rule', 'scope', 'format']),
  question: text(600),
  options: z
    .array(z.strictObject({ id: itemId, label: text(100), description: text(600) }))
    .min(2)
    .max(4),
})
export const PensaPlanDraftSchema = z.strictObject({
  id,
  projectId: id,
  revision,
  baseRevisionId: id.nullable(),
  status: z.enum(['collecting', 'needs_choice', 'ready', 'accepted', 'discarded']),
  definition: PensaGameDefinitionSchema.nullable(),
  plan: PensaPlanSchema.nullable(),
  technical: PensaTechnicalPlanSchema.nullable(),
  pendingChoices: z.array(PensaPendingChoiceSchema).max(20),
  impact: PensaChangeImpactSchema.nullable(),
  affectedProgressVersions: z.record(id, revision),
  capabilitiesFingerprint: text(128).nullable(),
  acceptedRevisionId: id.nullable(),
  updatedAt: date,
})
export const PensaProjectMetadataSchema = z.strictObject({
  audience: z.enum(['adult', 'kids']).optional(),
  id,
  name: text(100),
  status: z.enum(['active', 'archived']),
  paused: z.boolean(),
  ownerProfileId: id,
  createdAt: date,
  updatedAt: date,
  metadataRevision: revision,
  teamRevision: revision,
  executionRevision: revision,
})
export const PensaTeamPersonSchema = z.strictObject({
  profileId: id,
  firstName: text(100).nullable(),
  photoUrl: text(2_000).nullable(),
  owner: z.boolean(),
  joinedAt: date.nullable(),
})
export const PensaTeamViewSchema = z.strictObject({
  viewerProfileId: id,
  ownerProfileId: id,
  programmerProfileId: id,
  artistProfileIds: ids(PENSA_LIMITS.teamPeople),
  memberCount: z
    .number()
    .int()
    .min(0)
    .max(PENSA_LIMITS.teamPeople - 1),
  people: z.array(PensaTeamPersonSchema).min(1).max(PENSA_LIMITS.teamPeople),
  shareCode: text(20).nullable(),
  codeLocked: z.boolean(),
})
export const PensaMissionAvailabilitySchema = z.strictObject({
  missionId: id,
  available: z.boolean(),
  mode: z.enum(['build', 'reconfirm']),
  reason: z
    .enum([
      'completed',
      'dependency_pending',
      'not_your_mission',
      'claimed',
      'resources_unavailable',
      'not_applicable',
      'paused',
      'archived',
    ])
    .nullable(),
  message: text(600).nullable(),
  eligibleProfileIds: ids(PENSA_LIMITS.teamPeople),
})
export const PensaNextActionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('mission'),
    missionId: id,
    mode: z.enum(['build', 'reconfirm']),
    destination: PensaDestinationSchema,
  }),
  z.strictObject({ type: z.literal('waiting'), missionId: id.nullable(), reason: text(600) }),
  z.strictObject({ type: z.literal('define') }),
  z.strictObject({ type: z.literal('accept_draft'), draftId: id }),
  z.strictObject({ type: z.literal('completed') }),
])
export const PensaOperationStepSchema = z.enum([
  'understanding',
  'outline',
  'missions',
  'review',
  'choice',
  'answer',
  'copy',
  'commit',
])
export const PensaOperationViewSchema = z.strictObject({
  id,
  projectId: id,
  draftId: id.nullable(),
  kind: z.enum(['planning', 'help', 'checkpoint', 'restore']),
  step: PensaOperationStepSchema,
  status: z.enum(['queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled']),
  calls: revision,
  error: text(1_000).nullable(),
  /**
   * Só numa falha: `false` quando a parte já gastou as tentativas e "Tentar de novo" seria
   * recusado (a saída é um pedido novo da criança). Ausente = servidor anterior, tenta.
   */
  retryable: z.boolean().optional(),
  createdAt: date,
  updatedAt: date,
})
export const PensaMessageSchema = z.strictObject({
  id,
  projectId: id,
  role: z.enum(['user', 'assistant']),
  kind: z.enum(['planning', 'help']),
  text: text(6_000),
  revision: positive,
  profileId: id,
  missionId: id.nullable(),
  createdAt: date,
})
export const PensaMessagePageSchema = z.strictObject({
  items: z.array(PensaMessageSchema).max(100),
  nextCursor: id.nullable(),
})
export const PensaProjectViewSchema = z.strictObject({
  project: PensaProjectMetadataSchema,
  revision: PensaProjectRevisionSchema.nullable(),
  progress: z.array(PensaMissionProgressSchema).max(PENSA_LIMITS.missions),
  availability: z.array(PensaMissionAvailabilitySchema).max(PENSA_LIMITS.missions),
  nextAction: PensaNextActionSchema,
  draft: PensaPlanDraftSchema.nullable(),
  operation: PensaOperationViewSchema.nullable(),
  team: PensaTeamViewSchema,
  studioAuthoring: PensaAuthoringSchema,
  messages: z.array(PensaMessageSchema).max(100),
  gameCreation: PensaCreationRefSchema.nullable(),
  restoredSaveRevision: text(120).nullable(),
})
export const PensaProjectListItemSchema = z.strictObject({
  project: PensaProjectMetadataSchema,
  summary: text(1_000).nullable(),
  completedMissions: revision,
  totalMissions: revision,
  needsReview: revision,
  lifecycle: z.enum(['defining', 'building', 'reviewing', 'completed']),
  memberCount: revision,
})
export const PensaProjectListSchema = z.array(PensaProjectListItemSchema)
export const PensaMissionHandoffSchema = z.strictObject({
  project: PensaProjectMetadataSchema,
  projectRevisionId: id,
  mission: PensaMissionSchema,
  progress: PensaMissionProgressSchema,
  availability: PensaMissionAvailabilitySchema,
  nextAction: PensaNextActionSchema,
  studioProjectId: text(120),
  studioAuthoring: PensaAuthoringSchema,
  team: PensaTeamViewSchema,
  assetSlots: z.array(PensaAssetSlotSchema).max(PENSA_LIMITS.assetSlots),
  extensions: z.array(z.strictObject({ id: text(160), name: text(160) })).max(80),
  references: z.array(PensaKnowledgeReferenceSchema).max(80),
  gameCreation: PensaCreationRefSchema.nullable(),
  restoredSaveRevision: text(120).nullable(),
})
export const PensaCheckpointSchema = z.strictObject({
  id,
  projectId: id,
  projectRevisionId: id,
  creation: PensaCreationRefSchema,
  status: z.enum(['copying', 'ready', 'failed']),
  createdAt: date,
})
export const PensaTeamArtItemSchema = z.strictObject({
  missionId: id,
  slot: PensaAssetSlotSchema,
  creation: PensaCreationRefSchema,
  completedByProfileId: id,
})
export const PensaTeamArtListSchema = z.strictObject({
  items: z.array(PensaTeamArtItemSchema).max(PENSA_LIMITS.assetSlots),
})
export const PensaNarratableRefSchema = z.discriminatedUnion('origin', [
  z.strictObject({
    origin: z.literal('pensa_definition'),
    projectId: id,
    projectRevisionId: id,
    section: z.enum(['summary', 'playerExperience']),
  }),
  z.strictObject({
    origin: z.literal('pensa_draft'),
    projectId: id,
    draftId: id,
    draftRevision: revision,
    section: z.enum(['summary', 'playerExperience']),
  }),
  z.strictObject({
    origin: z.literal('pensa_mission'),
    missionId: id,
    contentRevision: positive,
    section: z.enum(['objective', 'rule', 'check', 'setup']),
    itemId: itemId.nullable(),
  }),
  z.strictObject({
    origin: z.literal('pensa_message'),
    projectId: id,
    messageId: id,
    messageRevision: positive,
  }),
])
export const PensaJsonObjectSchema = z.record(z.string(), z.json())
export const PensaOperationBudgetSchema = z.strictObject({
  dialogueCalls: revision,
  roundCalls: revision,
  planningCalls: revision,
  helpCalls: revision,
  unitAttempts: z.record(z.string(), revision),
})
export const PensaOperationWorkSchema = PensaOperationViewSchema.extend({
  actor: PensaActorSchema,
  baseRevisionId: id.nullable(),
  baseTeamRevision: revision,
  input: PensaJsonObjectSchema,
  output: PensaJsonObjectSchema,
  budget: PensaOperationBudgetSchema,
  leaseId: id,
  leaseUntil: date,
})
export const PensaOperationStepResultSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('step'),
    step: PensaOperationStepSchema,
    output: PensaJsonObjectSchema,
  }),
  z.strictObject({
    type: z.literal('question'),
    definition: PensaGameDefinitionSchema,
    pendingChoices: z.array(PensaPendingChoiceSchema).min(1).max(20),
    text: text(2_000),
  }),
  z.strictObject({
    type: z.literal('draft'),
    definition: PensaGameDefinitionSchema,
    plan: PensaPlanSchema,
    technical: PensaTechnicalPlanSchema,
  }),
  z.strictObject({ type: z.literal('answer'), text: text(6_000) }),
])

export const PensaCreateProjectRequestSchema = z.strictObject({
  requestId: id,
  message: text(PENSA_LIMITS.messageChars),
})
export const PensaMessageRequestSchema = z.strictObject({
  requestId: id,
  kind: z.enum(['planning', 'help']),
  message: text(PENSA_LIMITS.messageChars),
  baseRevisionId: id.nullable(),
  missionId: id.nullable(),
  choice: z.strictObject({ choiceId: itemId, optionId: itemId }).nullable(),
})
export const PensaMetadataRequestSchema = z.strictObject({
  requestId: id,
  expectedMetadataRevision: revision,
  name: text(100).optional(),
  paused: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional(),
})
export const PensaDraftAcceptRequestSchema = z.strictObject({
  requestId: id,
  draftId: id,
  draftRevision: revision,
  baseRevisionId: id.nullable(),
  affectedProgressVersions: z.record(id, revision),
})
export const PensaDraftEditRequestSchema = z.strictObject({
  requestId: id,
  expectedDraftRevision: revision,
  baseRevisionId: id.nullable(),
  definition: PensaGameDefinitionSchema,
  plan: PensaPlanSchema,
})
const missionRequest = {
  requestId: id,
  baseRevisionId: id,
  contentRevision: positive,
  expectedProgressRevision: revision,
}
export const PensaMissionStartRequestSchema = z.strictObject(missionRequest)
export const PensaMissionDeliveriesRequestSchema = z.strictObject({
  ...missionRequest,
  deliveries: z.array(PensaDeliverySchema).max(PENSA_LIMITS.assetSlots),
})
export const PensaMissionCompleteRequestSchema = z.strictObject({
  ...missionRequest,
  deliveries: z.array(PensaDeliverySchema).max(PENSA_LIMITS.assetSlots),
  confirmed: z.literal(true),
  note: note(),
})
export const PensaMissionReopenRequestSchema = z.strictObject(missionRequest)
export const PensaMissionNoteRequestSchema = z.strictObject({
  requestId: id,
  expectedProgressRevision: revision,
  note: note(),
})
export const PensaRestoreRequestSchema = z.strictObject({
  requestId: id,
  baseRevisionId: id,
  saveRevision: text(120),
})
export const PensaCheckpointPrepareRequestSchema = z.strictObject({
  requestId: id,
  baseRevisionId: id,
  saveRevision: text(120),
})
export const PensaJoinRequestSchema = z.strictObject({ requestId: id, code: text(20) })
export const PensaRolesRequestSchema = z.strictObject({
  requestId: id,
  expectedTeamRevision: revision,
  programmerProfileId: id,
  artistProfileIds: ids(PENSA_LIMITS.teamPeople),
})
export const PensaWorkManifestSchema = z
  .strictObject({
    id,
    units: z
      .array(
        z.strictObject({
          id: itemId,
          kind: z.enum(['outline', 'produce', 'review_local', 'review_cross', 'audit']),
          missionIds: ids(),
          requirementIds: ids(PENSA_LIMITS.requirements),
          maxInputBytes: z.number().int().positive().max(PENSA_LIMITS.promptBytes),
          maxOutputTokens: z.number().int().positive().max(PENSA_LIMITS.outputTokens),
        }),
      )
      .min(1)
      .max(PENSA_LIMITS.planningCalls / PENSA_LIMITS.attemptsPerUnit),
    maxCalls: z.number().int().positive().max(PENSA_LIMITS.planningCalls),
  })
  .superRefine((manifest, context) => {
    if (new Set(manifest.units.map((unit) => unit.id)).size !== manifest.units.length) {
      context.addIssue({
        code: 'custom',
        path: ['units'],
        message: 'Cada parte do plano precisa ter uma identificação diferente.',
      })
    }
    if (
      manifest.maxCalls < manifest.units.length ||
      manifest.maxCalls > manifest.units.length * PENSA_LIMITS.attemptsPerUnit
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxCalls'],
        message: 'O limite precisa cobrir o plano e respeitar as tentativas permitidas.',
      })
    }
  })
