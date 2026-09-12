import { EXPLORATION_MISSIONS, LEARNING_SCENES, PLATFORM_ACTIONS } from '@sistemazero/core/learning'
import { t } from 'elysia'

const Id = t.String({ format: 'uuid' })
const Label = t.String({ minLength: 1, maxLength: 2000 })
const Choices = t.Array(t.Object({ id: t.String({ minLength: 1, maxLength: 80 }), label: Label }), {
  minItems: 2,
  maxItems: 20,
})
const Media = t.Object({ label: Label, url: t.String({ maxLength: 4000 }), alt: Label })
export const InteractiveBlockSchema = t.Object({
  kind: t.Literal('interactive'),
  title: t.String({ minLength: 1, maxLength: 200 }),
  instructions: t.String({ minLength: 1, maxLength: 10000 }),
  hints: t.Array(t.String({ maxLength: 10000 }), { maxItems: 10 }),
  required: t.Boolean(),
  activity: t.Union([
    t.Object({
      type: t.Literal('exploration'),
      version: t.Literal(2),
      mission: t.Union(EXPLORATION_MISSIONS.map((mission) => t.Literal(mission))),
      instructionAudioUrl: t.Optional(t.String({ maxLength: 4000 })),
      initialImpulse: t.Optional(t.Integer({ minimum: 5, maximum: 14 })),
    }),
    t.Object({
      type: t.Literal('simulation'),
      version: t.Literal(1),
      scene: t.Union(LEARNING_SCENES.map((scene) => t.Literal(scene))),
      parameters: t.Optional(t.Record(t.String(), t.Number(), { maxProperties: 10 })),
    }),
    t.Object({ type: t.Literal('checkpoint') }),
    t.Object({
      type: t.Literal('prediction'),
      choices: Choices,
      outcome: t.String({ minLength: 1, maxLength: 10000 }),
    }),
    t.Object({ type: t.Literal('comparison'), left: Media, right: Media }),
    t.Object({
      type: t.Literal('sequence'),
      items: Choices,
      mode: t.Union([t.Literal('order'), t.Literal('match')]),
      solution: t.Array(t.String({ maxLength: 80 }), { maxItems: 20 }),
      targets: t.Array(Label, { maxItems: 20 }),
    }),
    t.Object({
      type: t.Literal('experiment'),
      preset: t.Union([t.Literal('motion'), t.Literal('population'), t.Literal('collision')]),
      parameters: t.Record(t.String(), t.Number(), { maxProperties: 10 }),
    }),
    t.Object({ type: t.Literal('html'), html: t.String({ minLength: 1, maxLength: 500000 }) }),
  ]),
  checkpoint: t.Optional(
    t.Object({
      prompt: t.String({ minLength: 1, maxLength: 5000 }),
      choices: Choices,
      correctChoiceId: t.String({ maxLength: 80 }),
      explanation: t.String({ minLength: 1, maxLength: 5000 }),
    }),
  ),
})
const SectionRule = t.Union([
  t.Object({ type: t.Literal('usesLoop') }),
  t.Object({
    type: t.Literal('usesBlock'),
    blockType: t.String({ maxLength: 200 }),
    area: t.Optional(
      t.Union(
        (['structure', 'appearance', 'molds', 'start', 'events', 'loops'] as const).map((area) =>
          t.Literal(area),
        ),
      ),
    ),
    withinBlock: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    fields: t.Optional(
      t.Record(t.String(), t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]), {
        maxProperties: 20,
      }),
    ),
    inputs: t.Optional(
      t.Record(t.String(), t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]), {
        maxProperties: 20,
      }),
    ),
  }),
  ...(['declaresVariable', 'definesFunction', 'callsFunction'] as const).map((type) =>
    t.Object({ type: t.Literal(type), name: t.String({ maxLength: 200 }) }),
  ),
])
export const SectionCompletionSchema = t.Object({
  version: t.Literal(1),
  blockIds: t.Array(Id, { maxItems: 200 }),
  platformAction: t.Optional(t.Union(PLATFORM_ACTIONS.map((action) => t.Literal(action)))),
  projectChecks: t.Optional(
    t.Array(
      t.Object({
        id: t.String({ minLength: 1, maxLength: 200 }),
        label: t.String({ maxLength: 200 }),
        rule: SectionRule,
      }),
      { maxItems: 20 },
    ),
  ),
})
export const SectionProjectParams = t.Object({ lessonId: Id, sectionId: Id })
export const SectionProjectBody = t.Object({ revision: Id, project: t.Unknown() })
export const LessonSectionSchema = t.Object({
  id: Id,
  title: t.String({ minLength: 1, maxLength: 200 }),
  objective: t.String({ maxLength: 2000 }),
  intent: t.Union([
    t.Literal('presentation'),
    t.Literal('demonstration'),
    t.Literal('exploration'),
    t.Literal('explanation'),
    t.Literal('application'),
    t.Literal('delivery'),
    t.Literal('material'),
    t.Literal('closing'),
  ]),
  blockIds: t.Array(Id, { maxItems: 200 }),
  workspaceBlockId: t.Nullable(Id),
  externalTool: t.Nullable(t.Union([t.Literal('estudio'), t.Literal('pinta')])),
  completion: t.Optional(SectionCompletionSchema),
  pendingMedia: t.Array(t.String({ minLength: 1, maxLength: 2000 }), { maxItems: 20 }),
})
export const LearningStructureBody = t.Object({
  expectedRevision: t.Nullable(Id),
  sections: t.Array(LessonSectionSchema, { minItems: 1, maxItems: 60 }),
})
export const LearningLessonParams = t.Object({ lessonId: Id })
export const LearningBlockParams = t.Object({ lessonId: Id, blockId: Id })
export const LearningNavigationBody = t.Object({ sectionId: Id })
export const LearningHelpBody = t.Object({
  requestId: t.Optional(t.String({ format: 'uuid' })),
  sectionId: Id,
  body: t.String({ minLength: 1, maxLength: 8000 }),
})
const Answers = t.Record(
  t.String({ pattern: '^[a-zA-Z][\\w-]{0,79}$' }),
  t.Union([
    t.String({ maxLength: 8000 }),
    t.Number(),
    t.Boolean(),
    t.Null(),
    t.Array(t.String({ maxLength: 10000 }), { maxItems: 100 }),
    t.Record(t.String(), t.Number(), { maxProperties: 20 }),
  ]),
  { maxProperties: 40 },
)
const ProgressFields = {
  revision: t.String({ minLength: 1, maxLength: 32 }),
  answers: Answers,
  hintsUsed: t.Integer({ minimum: 0, maximum: 10 }),
}
export const LearningProgressBody = t.Object({
  ...ProgressFields,
  positionSeconds: t.Nullable(t.Integer({ minimum: 0, maximum: 86400 })),
})
export const LearningAttemptBody = t.Object({ ...ProgressFields, id: Id })
export const LearningReportQuery = t.Object({ userId: Id, accountId: Id })
export const LearningImportPreviewBody = t.Object({ document: t.Unknown() })
export const LearningImportApplyBody = t.Object({
  operationId: Id,
  document: t.Unknown(),
  // Import preview returns the same UUID revision used by draft writes/publication.
  expectedFingerprint: Id,
})
