import { z } from 'zod'
import { StudioCatalogIdSchema } from './project-environment'
import { copyStudioProjectJson } from './project-json'
import {
  type StudioPythonStructureRule,
  StudioPythonStructureRuleSchema,
} from './python-activity-structure'
import { StudioPythonPlaytestRecipeSchema } from './python-playtest'

export const STUDIO_PYTHON_ACTIVITY_LIMITS = Object.freeze({
  checks: 50,
  cases: 50,
  jsonNodes: 20_000,
  jsonDepth: 24,
  textChars: 256_000,
  definitionBytes: 256 * 1024,
  messageChars: 2000,
})

export type StudioPythonActivityJsonValue =
  | string
  | number
  | boolean
  | null
  | StudioPythonActivityJsonValue[]
  | { [key: string]: StudioPythonActivityJsonValue }

function isJsonValue(value: unknown): value is StudioPythonActivityJsonValue {
  // Only called on the bounded descriptor-checked copy below.
  const pending = [value]
  while (pending.length) {
    const item = pending.pop()
    if (item === null || typeof item === 'boolean') continue
    if (typeof item === 'number' && Number.isFinite(item)) continue
    if (typeof item === 'string' && item.length <= 16_000) continue
    if (!item || typeof item !== 'object') return false
    const keys = Object.keys(item)
    if (keys.length > 1000 || (!Array.isArray(item) && keys.some((key) => key.length > 256)))
      return false
    pending.push(...Object.values(item))
  }
  return true
}

// Zod record parsing discards __proto__. These are literal Python dictionaries:
// preserve all accepted keys through descriptor-based copying instead.
const json = z.unknown().transform((raw, context) => {
  try {
    const value = copyStudioProjectJson(raw, {
      nodes: STUDIO_PYTHON_ACTIVITY_LIMITS.jsonNodes,
      depth: STUDIO_PYTHON_ACTIVITY_LIMITS.jsonDepth,
      textChars: STUDIO_PYTHON_ACTIVITY_LIMITS.textChars,
    })
    if (isJsonValue(value)) return value
  } catch {
    /* The same bounded validation error below covers malformed or oversized JSON. */
  }
  context.addIssue({
    code: 'custom',
    message: 'Use um valor JSON dentro dos limites da tarefa.',
  })
  return z.NEVER
})
const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)
// Python normalizes identifiers with NFKC. Names are dictionary lookups, never evaluated expressions.
const identifier = z
  .string()
  .min(1)
  .max(128)
  .transform((value) => value.normalize('NFKC'))
  .pipe(
    z
      .string()
      .min(1)
      .max(128)
      .regex(/^[\p{ID_Start}_][\p{ID_Continue}]*$/u),
  )
const base = {
  id,
  label: z.string().trim().min(1).max(500),
  hint: z.string().max(2000).optional(),
  weight: z.number().min(0.001).max(1000).optional(),
}
const numeric = z.number().min(-1e9).max(1e9)
const tolerance = z.number().min(0).max(1000).optional()
export const StudioPythonTurtlePredicateSchema = z.discriminatedUnion('property', [
  z.strictObject({
    property: z.literal('position'),
    expected: z.tuple([numeric, numeric]),
    tolerance,
  }),
  z.strictObject({ property: z.literal('heading'), expected: numeric, tolerance }),
  z.strictObject({ property: z.literal('penDown'), expected: z.boolean() }),
  z.strictObject({ property: z.literal('visible'), expected: z.boolean() }),
  z.strictObject({ property: z.literal('shape'), expected: z.string().min(1).max(240) }),
  z.strictObject({ property: z.literal('penColor'), expected: z.string().min(1).max(128) }),
  z.strictObject({ property: z.literal('fillColor'), expected: z.string().min(1).max(128) }),
])
export const StudioPythonBehaviorRuleSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('consoleContains'), text: z.string().min(1).max(4000) }),
  z.strictObject({ type: z.literal('globalEquals'), name: identifier, value: json }),
  z.strictObject({
    type: z.literal('turtleState'),
    /** Creation order in Screen.turtles(); no evaluation of a learner expression. */
    turtleIndex: z.number().int().min(0).max(999).default(0),
    predicate: StudioPythonTurtlePredicateSchema,
  }),
])
export const StudioPythonActivityCheckSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...base, kind: z.literal('structure'), rule: StudioPythonStructureRuleSchema }),
  z.strictObject({ ...base, kind: z.literal('behavior'), rule: StudioPythonBehaviorRuleSchema }),
  z.strictObject({
    ...base,
    kind: z.literal('testcase'),
    functionName: identifier,
    cases: z
      .array(
        z.strictObject({
          id: id.optional(),
          args: z.array(json).max(32),
          expected: json,
        }),
      )
      .min(1)
      .max(STUDIO_PYTHON_ACTIVITY_LIMITS.cases),
  }),
  z.strictObject({
    ...base,
    kind: z.literal('code'),
    /** Python function body with ctx, returning exactly True or False. Never executed by the server. */
    source: z.string().trim().min(1).max(20_000),
  }),
])
export type StudioPythonActivityCheck = z.infer<typeof StudioPythonActivityCheckSchema>

const definition = z
  .strictObject({
    version: z.literal(1),
    programmingLanguage: z.literal('python'),
    profileId: StudioCatalogIdSchema,
    instructions: z.string().max(32_000),
    checks: z.array(StudioPythonActivityCheckSchema).max(STUDIO_PYTHON_ACTIVITY_LIMITS.checks),
    passingScore: z.number().int().min(0).max(100).optional(),
    recipe: StudioPythonPlaytestRecipeSchema.optional(),
  })
  .superRefine((activity, context) => {
    const ids = new Set<string>()
    activity.checks.forEach((check, index) => {
      if (ids.has(check.id))
        context.addIssue({
          code: 'custom',
          path: ['checks', index, 'id'],
          message: 'Há checagens com id repetido.',
        })
      ids.add(check.id)
      if (check.kind === 'testcase') {
        const caseIds = check.cases.flatMap((item) => (item.id ? [item.id] : []))
        if (new Set(caseIds).size !== caseIds.length)
          context.addIssue({
            code: 'custom',
            path: ['checks', index, 'cases'],
            message: 'Há casos com id repetido.',
          })
      }
    })
    if (activity.passingScore !== undefined) {
      const total = activity.checks.reduce((sum, check) => sum + (check.weight ?? 1), 0)
      const structure = activity.checks.filter((check) => check.kind === 'structure')
      const structuralWeight = structure.reduce((sum, check) => sum + (check.weight ?? 1), 0)
      if (
        !structure.length ||
        Math.round(((total - structuralWeight) / total) * 100) >= activity.passingScore
      )
        context.addIssue({
          code: 'custom',
          path: ['passingScore'],
          message:
            'A aprovação precisa de peso estrutural suficiente: resultados reportados pelo cliente não podem atingir sozinhos a nota de corte.',
        })
    }
    if (
      new TextEncoder().encode(JSON.stringify(activity)).byteLength >
      STUDIO_PYTHON_ACTIVITY_LIMITS.definitionBytes
    )
      context.addIssue({ code: 'custom', message: 'A tarefa excede o limite de tamanho.' })
  })

/** Iterative budget/copy runs before recursive JSON schemas, without invoking getters/toJSON. */
export const StudioPythonActivitySchema = z
  .unknown()
  .transform((raw, context) => {
    try {
      return copyStudioProjectJson(raw, {
        nodes: STUDIO_PYTHON_ACTIVITY_LIMITS.jsonNodes,
        depth: STUDIO_PYTHON_ACTIVITY_LIMITS.jsonDepth,
        textChars: STUDIO_PYTHON_ACTIVITY_LIMITS.textChars,
      })
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Tarefa inválida.',
      })
      return z.NEVER
    }
  })
  .pipe(definition)
export type StudioPythonActivity = z.infer<typeof StudioPythonActivitySchema>

const result = z.strictObject({
  checkId: id,
  kind: z.enum(['structure', 'behavior', 'testcase', 'code']),
  passed: z.boolean(),
  message: z.string().max(STUDIO_PYTHON_ACTIVITY_LIMITS.messageChars).optional(),
  verifiedBy: z.enum(['client', 'server']),
})
export type StudioPythonActivityResult = z.infer<typeof result>
export const StudioPythonActivityFeedbackSchema = z
  .strictObject({
    version: z.literal(1),
    results: z
      .array(result.safeExtend({ verifiedBy: z.literal('client') }))
      .max(STUDIO_PYTHON_ACTIVITY_LIMITS.checks),
  })
  .superRefine((feedback, context) => {
    if (new Set(feedback.results.map((item) => item.checkId)).size !== feedback.results.length)
      context.addIssue({ code: 'custom', message: 'Há resultados repetidos.' })
  })
export type StudioPythonActivityFeedback = z.infer<typeof StudioPythonActivityFeedbackSchema>

/** Require the exact non-structural check set; worker messages confer no authority. */
export function verifyStudioPythonActivityFeedback(raw: unknown, activity: StudioPythonActivity) {
  const feedback = StudioPythonActivityFeedbackSchema.parse(raw)
  const expected = activity.checks.filter((check) => check.kind !== 'structure')
  if (
    feedback.results.length !== expected.length ||
    feedback.results.some((item, index) => {
      const check = expected[index]
      return !check || item.checkId !== check.id || item.kind !== check.kind
    })
  )
    throw new Error('O resultado não corresponde às checagens desta tarefa.')
  return feedback
}

/** Authoring/runtime scope, separate from authorization and byte/revision verification. */
export function assertStudioPythonActivityScope(
  activity: StudioPythonActivity,
  configuration: {
    runtime: { profileId: string }
    extensions: readonly { id: string; version: string }[]
  },
) {
  if (activity.profileId !== configuration.runtime.profileId)
    throw new Error('O perfil da tarefa não corresponde ao projeto Python.')
  if (
    (activity.checks.some(
      (check) => check.kind === 'behavior' && check.rule.type === 'turtleState',
    ) ||
      Boolean(
        activity.recipe?.keys.length ||
          activity.recipe?.clicks.length ||
          activity.recipe?.requireGraphics,
      )) &&
    !configuration.extensions.some(
      (extension) => extension.id === 'python-turtle' && extension.version === '1.0.0',
    )
  )
    throw new Error('Esta tarefa precisa da extensão Turtle instalada no projeto.')
}

/** Caller owns the structural evidence. Client-reported structure is always ignored. */
export function gradeStudioPythonActivity(options: {
  activity: StudioPythonActivity
  evaluateStructure(rule: StudioPythonStructureRule): boolean
  structureVerifiedBy: 'client' | 'server'
  clientResults: readonly { checkId: string; passed: boolean; message?: string }[]
}) {
  const { activity, evaluateStructure, structureVerifiedBy } = options
  const client = new Map(options.clientResults.map((item) => [item.checkId, item]))
  const results: StudioPythonActivityResult[] = activity.checks.map((check) => {
    if (check.kind === 'structure')
      return {
        checkId: check.id,
        kind: check.kind,
        passed: evaluateStructure(check.rule),
        verifiedBy: structureVerifiedBy,
      }
    const reported = client.get(check.id)
    return {
      checkId: check.id,
      kind: check.kind,
      passed: reported?.passed === true,
      verifiedBy: 'client',
      ...(reported?.message !== undefined
        ? { message: reported.message.slice(0, STUDIO_PYTHON_ACTIVITY_LIMITS.messageChars) }
        : !reported
          ? { message: 'Sem resultado reportado.' }
          : {}),
    }
  })
  const total = activity.checks.reduce((sum, check) => sum + (check.weight ?? 1), 0)
  const passedWeight = activity.checks.reduce(
    (sum, check, index) => sum + (results[index]?.passed ? (check.weight ?? 1) : 0),
    0,
  )
  const score = total ? Math.round((passedWeight / total) * 100) : 100
  return {
    results,
    score,
    passed: activity.passingScore === undefined || score >= activity.passingScore,
  }
}
