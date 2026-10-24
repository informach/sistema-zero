import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioProjectIdSchema } from '../studio/project-document'
import { StudioSha256Schema } from '../studio/project-environment'
import { copyStudioProjectJson } from '../studio/project-json'
import {
  EXECUTION_LIMITS,
  type ExecutionObservation,
  executionObservationUnavailableReason,
  executionRuleBudgetMs,
  isExecutionJson,
  isSectionExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from './project-execution'

export type PythonProjectExecutionRule = Exclude<SectionExecutionRule, { type: 'script' }>
export type PythonProjectExecutionObjective = {
  id: string
  rule: PythonProjectExecutionRule
  stdin?: string[]
}

/** Python uses the canonical comparisons; DOM, JS validators and JS kit state do not apply. */
export function isPythonProjectExecutionRule(raw: unknown): raw is PythonProjectExecutionRule {
  if (!isSectionExecutionRule(raw, 'final', 'python') || raw.type === 'script') return false
  if (raw.type === 'functionReturns') return true
  return (
    ['value', 'console', 'spritePosition'].includes(raw.expect.target.kind) &&
    Object.keys(raw.expect).every((key) => ['target', 'compare', 'value'].includes(key)) &&
    raw.steps.every((step) => step.action !== 'clickTarget')
  )
}

const identitySchema = z.strictObject({
  projectId: StudioProjectIdSchema,
  revision: StudioSha256Schema,
  runtimeManifestSha256: StudioSha256Schema,
  runId: z.uuid(),
  objectivesSha256: StudioSha256Schema,
})
const error = z.string().min(1).max(2000)
const observed = z
  .strictObject({
    found: z.boolean(),
    value: z.unknown().refine(isExecutionJson).optional(),
    error: error.optional(),
  })
  .refine(
    (item) =>
      item.found
        ? Object.hasOwn(item, 'value') && item.value !== undefined && !item.error
        : !Object.hasOwn(item, 'value'),
    'A observação precisa dizer se há um valor completo.',
  )
const sample = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  frame: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  generation: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  errors: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  paused: z.boolean(),
})
const observationSchema = z.discriminatedUnion('type', [
  z.strictObject({
    id: z.string().min(1).max(100),
    type: z.literal('behavior'),
    initial: observed.optional(),
    final: observed.optional(),
    motion: z
      .strictObject({
        baselineInitial: sample,
        baselineFinal: sample,
        actionInitial: sample,
        actionFinal: sample,
      })
      .optional(),
    errors: z.array(error).max(20).optional(),
    error: error.optional(),
  }),
  z.strictObject({
    id: z.string().min(1).max(100),
    type: z.literal('functionReturns'),
    missing: z.boolean().optional(),
    cases: z
      .array(
        z
          .strictObject({
            ok: z.boolean(),
            value: z.unknown().refine(isExecutionJson).optional(),
            error: error.optional(),
          })
          .refine(
            (item) =>
              !item.ok || (Object.hasOwn(item, 'value') && item.value !== undefined && !item.error),
            'Um retorno válido precisa ter valor completo e não pode conter erro.',
          ),
      )
      .max(EXECUTION_LIMITS.maxCases)
      .optional(),
    errors: z.array(error).max(20).optional(),
    error: error.optional(),
  }),
])
const reportSchema = z.strictObject({
  version: z.literal(1),
  identity: identitySchema,
  observations: z.array(observationSchema).min(1).max(EXECUTION_LIMITS.maxObjectives),
})

export {
  identitySchema as PythonProjectExecutionIdentitySchema,
  observed as PythonExecutionObservedValueSchema,
  reportSchema as PythonProjectExecutionReportSchema,
  sample as PythonExecutionMotionSampleSchema,
}
export const PythonFunctionExecutionObservationSchema = observationSchema.options[1]
const objectivesSchema = z
  .array(
    z.strictObject({
      id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
      rule: z.custom<PythonProjectExecutionRule>(isPythonProjectExecutionRule),
      stdin: z
        .array(
          z
            .string()
            .max(4096)
            .regex(/^[^\r\n]*$/),
        )
        .max(4)
        .optional(),
    }),
  )
  .min(1)
  .max(EXECUTION_LIMITS.maxObjectives)
const jsonLimits = { nodes: 20_000, textChars: 128_000, depth: 64 }
export type PythonProjectExecutionReport = z.infer<typeof reportSchema>

/** Host-only plan. Never serialize this object into the learner frame or worker. */
export interface PythonProjectExecutionPlan {
  identity: z.infer<typeof identitySchema>
  objectives: PythonProjectExecutionObjective[]
}

function freezeJson<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child)
    Object.freeze(value)
  }
  return value
}

export async function preparePythonProjectExecution(
  identity: Omit<PythonProjectExecutionPlan['identity'], 'objectivesSha256'>,
  input: readonly PythonProjectExecutionObjective[],
): Promise<PythonProjectExecutionPlan> {
  // Capture before the first await: caller edits cannot change rules midway through the run.
  const captured = objectivesSchema.parse(copyStudioProjectJson(input, jsonLimits))
  const capturedIdentity = identitySchema.omit({ objectivesSha256: true }).parse(identity)
  if (
    new Set(captured.map((item) => item.id)).size !== captured.length ||
    captured.reduce(
      (sum, item) => sum + executionRuleBudgetMs(item.rule) + (item.stdin?.length ?? 0) * 1000,
      0,
    ) > EXECUTION_LIMITS.maxSectionWaitMs
  )
    throw new Error('Os objetivos de execução Python são inválidos ou excedem o orçamento.')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson(captured)),
  )
  const objectivesSha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return freezeJson({
    identity: identitySchema.parse({ ...capturedIdentity, objectivesSha256 }),
    objectives: captured,
  })
}

/** Only actions, observation selectors and function arguments cross into the learner context. */
export function pythonProjectExecutionProbes(plan: PythonProjectExecutionPlan) {
  return plan.objectives.map(({ id, rule }) =>
    rule.type === 'functionReturns'
      ? {
          id,
          type: rule.type,
          name: rule.name,
          ...(rule.module ? { module: rule.module } : {}),
          args: rule.cases.map((item) => copyStudioProjectJson(item.args)),
        }
      : {
          id,
          type: rule.type,
          steps: copyStudioProjectJson(rule.steps),
          target: copyStudioProjectJson(rule.expect.target),
          ...(rule.observation ? { observation: { ...rule.observation } } : {}),
        },
  )
}

/** S2S evidence only. A browser-supplied report must never enter this boundary. */
export function judgePythonProjectExecution(plan: PythonProjectExecutionPlan, rawReport: unknown) {
  const report = reportSchema.parse(copyStudioProjectJson(rawReport, jsonLimits))
  if (canonicalJson(report.identity) !== canonicalJson(plan.identity))
    throw new Error('A execução não pertence a esta revisão, tentativa e conjunto de objetivos.')
  const byId = new Map(report.observations.map((item) => [item.id, item]))
  if (byId.size !== plan.objectives.length || byId.size !== report.observations.length)
    throw new Error('A execução não relatou exatamente os objetivos solicitados.')
  return plan.objectives.map(({ id, rule }) => {
    const observation: ExecutionObservation | undefined = byId.get(id)
    if (!observation || observation.type !== rule.type)
      throw new Error('A execução omitiu ou trocou um objetivo.')
    if (observation.errors?.length)
      return { id, passed: false, detail: 'O programa relatou erro durante a execução.' }
    if (
      rule.type === 'behavior' &&
      (observation.final?.found === false ||
        (['increased', 'decreased'].includes(rule.expect.compare) &&
          (observation.initial?.found === false ||
            (observation.initial?.found && typeof observation.initial.value !== 'number') ||
            (observation.final?.found && typeof observation.final.value !== 'number'))))
    )
      return { id, passed: false, detail: 'O programa não produziu o valor ou a posição esperada.' }
    const unavailable = executionObservationUnavailableReason(rule, observation)
    if (unavailable) throw new Error(unavailable)
    if (
      rule.type === 'functionReturns' &&
      !observation.missing &&
      observation.cases?.length !== rule.cases.length
    )
      throw new Error('A execução omitiu ou acrescentou casos de teste.')
    return {
      id,
      ...judgeExecutionObservation(rule, observation),
    }
  })
}
