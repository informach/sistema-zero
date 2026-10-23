import { IdentityUuidSchema } from '@sistemazero/core/identity'
import {
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  KIDS_CREATOR_CAPABILITIES,
  KIDS_JOURNEY_ISSUE_CODES,
  KidsJourneyEarnedSchema,
  KidsJourneyPolicySchema,
  KidsRequirementSchema,
} from '@sistemazero/core/journey'
import { z } from 'zod'

// Display identities only. Requirements, rewards and access come from the published record.
export const KIDS_POST_LABELS = {
  noob: 'Faísca',
  coder: 'Construtor(a)',
  hacker: 'Inventor(a)',
  explorer: 'Explorador(a) de Mundos',
  elite: 'Mestre dos Jogos',
  architect: 'Arquiteto(a) de Mundos',
  champion: 'Gênio da Criação',
  god: 'Lenda',
} as const
export const KIDS_TIER_LABELS = {
  'primeiros-passos-2d': 'Primeiros passos (2D)',
  'iniciante-2d': 'Iniciante 2D',
  'iniciante-3d': 'Iniciante 3D',
  'intermediario-2d': 'Intermediário 2D',
  'intermediario-3d': 'Intermediário 3D',
  'avancado-2d': 'Avançado 2D',
  'avancado-3d': 'Avançado 3D',
} as const
export const KIDS_TOOL_LABELS = {
  studio: 'Estúdio livre',
  pinta: 'Pinta',
  ai: 'Recursos de IA',
  pensa: 'Pensa',
  molda: 'Molda',
  'molda-intermediate': 'Molda intermediário',
  'molda-professional': 'Molda profissional',
  bridge: 'Ponte: blocos e código',
  pro: 'Modo Pro',
} as const

const version = z.number().int().min(1).max(2_147_483_646)
const publishedVersion = z.number().int().min(1).max(2_147_483_647)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const time = z.string().datetime()
export const KidsPolicyRecordSchema = z
  .object({
    phase: z.enum(['initializing', 'published']),
    version: z.number().int().min(0).max(2_147_483_647),
    policy: KidsJourneyPolicySchema,
    permissions: z.object({ canEdit: z.boolean() }),
  })
  .superRefine((record, context) => {
    if ((record.phase === 'initializing') !== (record.version === 0))
      context.addIssue({ code: 'custom', message: 'Versão da jornada inválida.' })
  })
export type KidsPolicyRecord = z.infer<typeof KidsPolicyRecordSchema>

export const KidsPreparationSchema = z.object({
  id: IdentityUuidSchema,
  origin: z.literal('configuration'),
  expectedVersion: version,
  candidatePolicy: KidsJourneyPolicySchema,
  draftHash: hash,
  catalogHash: hash,
  cohortHash: hash.nullable(),
  status: z.enum(['capturing', 'preparing', 'ready', 'stale', 'published']),
  processed: z.number().int().min(0),
  reason: z.string().min(1).max(500),
  actorKind: z.literal('user'),
  actorId: IdentityUuidSchema,
  updatedAt: time,
})
export type KidsPreparation = z.infer<typeof KidsPreparationSchema>
export const KidsAdvanceSchema = z.object({
  status: z.enum(['advanced', 'conflict', 'stale', 'unowned', 'missing']),
  preparation: KidsPreparationSchema,
})

const readiness = z.object({
  status: z.enum(['ready', 'incomplete', 'unavailable']),
  horizon: z.enum(JOURNEY_LEVEL_SLUGS).nullable(),
  issues: z.array(
    z.object({
      code: z.enum(KIDS_JOURNEY_ISSUE_CODES),
      severity: z.enum(['error', 'warning', 'unavailable']),
      message: z.string(),
      level: z.enum(JOURNEY_LEVEL_SLUGS).nullable(),
      requirementIndex: z.number().int().min(0).nullable(),
    }),
  ),
})
const projectedSummary = z.object({
  mode: z.enum(['active', 'paused']),
  earned: KidsJourneyEarnedSchema,
})
const accessRule = z.object({
  tier: z.enum(JOURNEY_COURSE_TIERS),
  opensAt: z.enum(JOURNEY_LEVEL_SLUGS),
  completedAt: z.enum(JOURNEY_LEVEL_SLUGS),
  foundation: z.object({
    slot: z.literal(1),
    milestone: z.enum(['complete', 'showcase']),
    whenMissing: z.enum(['open', 'locked']),
  }),
})
export const KidsPreviewSchema = z.object({
  baseVersion: version,
  scope: z.literal('selected-profiles'),
  readiness,
  newLearner: z.object({
    before: projectedSummary,
    after: projectedSummary,
    changes: z.array(
      z.object({
        level: z.enum(JOURNEY_LEVEL_SLUGS),
        requirementsAdded: KidsRequirementSchema.array(),
        requirementsRemoved: KidsRequirementSchema.array(),
        requirementsChanged: z.array(
          z.object({ before: KidsRequirementSchema, after: KidsRequirementSchema }),
        ),
        capabilitiesAdded: z.array(z.enum(KIDS_CREATOR_CAPABILITIES)),
        capabilitiesRemoved: z.array(z.enum(KIDS_CREATOR_CAPABILITIES)),
      }),
    ),
    tierAccessChanges: z.array(z.object({ before: accessRule, after: accessRule })),
  }),
})
export type KidsPreview = z.infer<typeof KidsPreviewSchema>
export const KidsPublicationSchema = z.object({
  phase: z.literal('published'),
  version: publishedVersion,
  policy: KidsJourneyPolicySchema,
})
export const KidsHistorySchema = z
  .array(
    KidsPublicationSchema.extend({
      previousVersion: z.number().int().min(0),
      preparationId: IdentityUuidSchema,
      actorKind: z.enum(['system', 'user']),
      actorId: IdentityUuidSchema.nullable(),
      reason: z.string().min(1).max(500),
      updatedAt: time,
    }),
  )
  .max(100)
export type KidsHistory = z.infer<typeof KidsHistorySchema>

export function kidsEditorError(error: unknown): string {
  if (error instanceof z.ZodError)
    return 'Não foi possível conferir a resposta da jornada. Atualize e tente novamente.'
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return 'Não foi possível carregar a jornada. Tente novamente.'
}
