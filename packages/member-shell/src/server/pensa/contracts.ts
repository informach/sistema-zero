import {
  PENSA_LIMITS,
  PensaGameDefinitionSchema,
  PensaPlanSchema,
  PensaTechnicalPlanSchema,
  PensaWorkManifestSchema,
} from '@sistemazero/core/pensa'
import { z } from 'zod'

const key = z.string().trim().min(1).max(80)
const text = (max: number) => z.string().trim().min(1).max(max)
const keys = (max: number) => z.array(key).max(max)

export const DefinitionReplySchema = z.strictObject({
  title: text(100),
  summary: text(1000),
  playerExperience: text(1000),
  dimension: z.enum(['2d', '3d']),
  requirements: z
    .array(
      z.strictObject({
        key,
        text: text(600),
        origin: z.enum(['child', 'suggestion']),
        category: z.enum(['gameplay', 'visual', 'interface', 'content']),
      }),
    )
    .min(1)
    .max(PENSA_LIMITS.requirements),
  removedRequirements: z
    .array(z.strictObject({ key, reason: text(300) }))
    .max(PENSA_LIMITS.requirements),
  assetSlots: z
    .array(
      z.strictObject({
        key,
        name: text(120),
        kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'texture', 'sky']),
        description: text(1000),
        source: z.enum(['create', 'existing', 'editor']),
        existingInventoryKey: key.nullable(),
      }),
    )
    .max(PENSA_LIMITS.assetSlots),
  openChoices: z.array(z.strictObject({ key, text: text(600) })).max(30),
  futureIdeas: z
    .array(z.strictObject({ key, text: text(2000), origin: z.enum(['child', 'zappy']) }))
    .max(80),
  adaptations: z
    .array(
      z.strictObject({
        key,
        originalIntent: text(1000),
        limitation: text(600),
        alternative: text(1000),
        preserved: text(600),
      }),
    )
    .max(40),
  pendingChoices: z
    .array(
      z.strictObject({
        key,
        kind: z.enum(['adaptation', 'rule', 'scope', 'format']),
        question: text(600),
        options: z
          .array(z.strictObject({ key, label: text(100), description: text(600) }))
          .min(2)
          .max(4),
      }),
    )
    .max(20),
})

export const OutlineReplySchema = z.strictObject({
  runtimeExtensionId: key.nullable(),
  stages: z
    .array(z.strictObject({ key, title: text(120) }))
    .min(1)
    .max(PENSA_LIMITS.stages),
  missions: z
    .array(
      z.strictObject({
        key,
        stageKey: key,
        kind: z.enum(['setup', 'feature', 'asset', 'integration', 'playtest']),
        destination: z.enum(['studio', 'pinta', 'molda']),
        title: text(120),
        objective: text(600),
        requirementKeys: keys(PENSA_LIMITS.requirements),
        dependencyKeys: keys(PENSA_LIMITS.missions),
        assetKeys: keys(PENSA_LIMITS.assetSlots),
        scope: z.enum(['stage', 'project']).nullable(),
        blockIds: keys(160),
        extensionIds: keys(80),
        moldaToolIds: keys(80),
        manualIds: keys(80),
      }),
    )
    .min(1)
    .max(PENSA_LIMITS.missions),
})

export const MissionCardsReplySchema = z.strictObject({
  missions: z
    .array(
      z.strictObject({
        key,
        title: text(120),
        objective: text(600),
        rules: z.array(z.strictObject({ key, text: text(300) })).max(6),
        checks: z
          .array(z.strictObject({ key, action: text(300), expected: text(300) }))
          .min(1)
          .max(6),
        recommendation: text(600).nullable(),
      }),
    )
    .min(1)
    .max(PENSA_LIMITS.batchMissions),
})

export const ReviewReplySchema = z.strictObject({
  approved: z.boolean(),
  issues: z
    .array(
      z.strictObject({
        missionKey: key.nullable(),
        requirementKey: key.nullable(),
        message: text(500),
      }),
    )
    .max(80),
  corrections: z
    .array(MissionCardsReplySchema.shape.missions.element)
    .max(PENSA_LIMITS.batchMissions),
  summary: text(1000),
})
export const HelpReplySchema = z.strictObject({ text: text(3000), referenceIds: keys(6) })

export const PlanningStateSchema = z.strictObject({
  definition: PensaGameDefinitionSchema,
  aliases: z.record(key, z.uuid()),
  outline: OutlineReplySchema.nullable(),
  manifest: PensaWorkManifestSchema.nullable(),
  unitIndex: z.number().int().nonnegative(),
  unitKey: key,
  cards: z.array(MissionCardsReplySchema.shape.missions.element).max(PENSA_LIMITS.missions),
  plan: PensaPlanSchema.nullable(),
  technical: PensaTechnicalPlanSchema.nullable(),
  reviewed: z
    .array(
      z.strictObject({
        unitId: key,
        missionIds: z.array(z.uuid()),
        contentRevisions: z.array(z.number().int().positive()),
        summary: text(1000),
      }),
    )
    .max(24),
  completedUnitIds: z.array(key).max(24).default([]),
})
export type PlanningState = z.infer<typeof PlanningStateSchema>
export type OutlineReply = z.infer<typeof OutlineReplySchema>
export type DefinitionReply = z.infer<typeof DefinitionReplySchema>
export type MissionCardsReply = z.infer<typeof MissionCardsReplySchema>
