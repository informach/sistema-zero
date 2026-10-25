import { z } from 'zod'
import { StudioProjectDocumentSchema } from '../studio/project-document'
import { StudioCatalogIdSchema } from '../studio/project-environment'
import { StudioPythonStructureRuleSchema } from '../studio/python-activity-structure'
import { STUDIO_PYTHON_STRUCTURE_LIMITS } from '../studio/python-structure-limits'
import {
  StudioAuthoringRuntimeContextSchema,
  StudioLiveRuntimeContextSchema,
} from '../studio/runtime-authorization'
import {
  EXECUTION_COMPARES,
  EXECUTION_LIMITS,
  type ExecutionJson,
  type ExecutionStep,
  executionRuleBudgetMs,
  isExecutionJson,
  isExecutionStep,
} from './project-execution'
import { isPythonProjectExecutionRule } from './python-project-execution'
import type { SectionProjectCheck } from './section-progression'

/** A live objective belongs to this admitted room/block and saved writer generation. */
export const SectionProjectLiveContextSchema = z.strictObject({
  context: StudioLiveRuntimeContextSchema.refine(
    (context) => context.sessionId !== null && context.blockId !== null,
  ),
  expectedWorkspaceRevision: z.number().int().nonnegative(),
})
export type SectionProjectLiveContext = z.infer<typeof SectionProjectLiveContextSchema>

// Drafts may contain an unfinished name/path. Publication and execution use the
// strict canonical rules below; editing a field must not discard the draft.
const file = z.string().max(1024).optional()
const name = z.string().max(STUDIO_PYTHON_STRUCTURE_LIMITS.nameChars)
const draftRule = z.discriminatedUnion('type', [
  StudioPythonStructureRuleSchema.options[0].extend({ file }),
  StudioPythonStructureRuleSchema.options[1].extend({ file }),
  StudioPythonStructureRuleSchema.options[2].extend({ file, name }),
  StudioPythonStructureRuleSchema.options[3].extend({ file, name }),
  StudioPythonStructureRuleSchema.options[4].extend({
    file,
    name: z.string().max(STUDIO_PYTHON_STRUCTURE_LIMITS.callTargetChars),
  }),
])
const draftPath = z.string().max(200)
const draftTarget = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('value'), path: draftPath }),
  z.strictObject({ kind: z.literal('console') }),
  z.strictObject({ kind: z.literal('spritePosition'), path: draftPath, axis: z.enum(['x', 'y']) }),
])
const executionDraft = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('behavior'),
    steps: z
      .array(
        z.custom<Exclude<ExecutionStep, { action: 'clickTarget' }>>(
          (step) => isExecutionStep(step) && step.action !== 'clickTarget',
        ),
      )
      .max(EXECUTION_LIMITS.maxSteps),
    expect: z.strictObject({
      target: draftTarget,
      compare: z.enum(EXECUTION_COMPARES),
      value: z
        .union([z.string().max(EXECUTION_LIMITS.maxTextChars), z.number().finite(), z.boolean()])
        .optional(),
    }),
    observation: z
      .strictObject({
        type: z.literal('idleBeforeAction'),
        idleMs: z.number().int().positive().max(EXECUTION_LIMITS.maxIdleBaselineMs),
      })
      .optional(),
  }),
  z.strictObject({
    type: z.literal('functionReturns'),
    name: z.string().max(100),
    module: z.string().max(200).optional(),
    cases: z
      .array(
        z.strictObject({
          args: z.array(z.custom<ExecutionJson>(isExecutionJson)).max(EXECUTION_LIMITS.maxArgs),
          expected: z.custom<ExecutionJson>(isExecutionJson),
        }),
      )
      .max(EXECUTION_LIMITS.maxCases),
  }),
])

export const SectionPythonProjectCheckDraftSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  label: z.string().max(200),
  hint: z.string().max(300).optional(),
  optional: z.literal(true).optional(),
  programmingLanguage: z.literal('python'),
  profileId: StudioCatalogIdSchema,
  rule: z.union([draftRule, executionDraft]),
  stdin: z
    .array(
      z
        .string()
        .max(4096)
        .regex(/^[^\r\n]*$/),
    )
    .max(4)
    .optional(),
})
export type SectionPythonProjectCheck = z.infer<typeof SectionPythonProjectCheckDraftSchema>
export type PythonProjectCheckGraphics = 'none' | 'turtle' | 'pgzero' | 'raylib2d' | 'raylib3d'
/** Criteria follow the selected library's actual API; Raylib uses program variables/vectors. */
export function pythonProjectCheckGraphics(
  extensions: readonly { id: string }[],
): PythonProjectCheckGraphics {
  const kinds: Record<string, Exclude<PythonProjectCheckGraphics, 'none'>> = {
    'python-turtle': 'turtle',
    'python-pgzero': 'pgzero',
    'python-raylib-2d': 'raylib2d',
    'python-raylib-3d': 'raylib3d',
  }
  const selected = extensions.flatMap((extension) =>
    Object.hasOwn(kinds, extension.id) ? [kinds[extension.id]!] : [],
  )
  return selected.length === 1 ? selected[0]! : 'none'
}
// Two bounded projects (initial/reference and candidate), plus criteria. Shared
// by the BFF, gateway and Members' socket ceiling and per-route parser.
export const SECTION_PYTHON_PROJECT_TEST_BODY_BYTES = 4_500_000
export const SectionPythonProjectTestRequestSchema = z.strictObject({
  project: z.unknown(),
  referenceProject: z.unknown().optional(),
  checks: z.array(SectionPythonProjectCheckDraftSchema).min(1).max(20),
  context: StudioAuthoringRuntimeContextSchema,
})
export const SectionPythonProjectTestResponseSchema = z.strictObject({
  passed: z.boolean(),
  results: z
    .array(
      z.strictObject({
        checkId: z.string().min(1).max(128),
        passed: z.boolean(),
        kind: z.enum(['structure', 'execution']),
        verifiedBy: z.literal('server'),
        message: z.string().max(4000).optional(),
      }),
    )
    .max(20),
})

export function isSectionPythonProjectCheck(value: unknown): value is SectionPythonProjectCheck {
  return SectionPythonProjectCheckDraftSchema.safeParse(value).success
}

/** Publication/execution use final rules; incomplete authoring drafts never grant progress. */
export function validateSectionPythonProjectChecks(checks: readonly SectionPythonProjectCheck[]) {
  if (!checks.length) throw new Error('Esta parte não possui objetivos Python.')
  const profileId = checks[0]!.profileId
  if (
    checks.some((check) => check.programmingLanguage !== 'python' || check.profileId !== profileId)
  )
    throw new Error('Todos os objetivos precisam usar o mesmo ambiente Python.')
  let executions = 0,
    budget = 0
  if (new Set(checks.map((check) => check.id)).size !== checks.length)
    throw new Error('Os objetivos Python precisam de identificadores únicos.')
  for (const check of checks) {
    if (check.rule.type === 'behavior' || check.rule.type === 'functionReturns') {
      if (!isPythonProjectExecutionRule(check.rule))
        throw new Error('Complete a regra de execução Python.')
      executions++
      budget += executionRuleBudgetMs(check.rule) + (check.stdin?.length ?? 0) * 1000
    } else {
      StudioPythonStructureRuleSchema.parse(check.rule)
      if (check.stdin?.length)
        throw new Error('Entradas de teste pertencem a objetivos de execução.')
    }
  }
  if (executions > EXECUTION_LIMITS.maxObjectives || budget > EXECUTION_LIMITS.maxSectionWaitMs)
    throw new Error('Os objetivos Python excedem o orçamento de execução desta parte.')
}

/** Published objectives must describe the workspace's actual language/profile. */
export function sectionProjectChecksEnvironmentIssue(
  checks: readonly SectionProjectCheck[],
  rawProject: unknown,
): string | null {
  const python =
    !!rawProject &&
    typeof rawProject === 'object' &&
    'programmingLanguage' in rawProject &&
    rawProject.programmingLanguage === 'python'
  if (checks.some((check) => (check.programmingLanguage === 'python') !== python))
    return 'Os objetivos precisam usar a mesma linguagem do projeto inicial do Estúdio.'
  if (!python || !checks.length) return null
  const project = StudioProjectDocumentSchema.safeParse(rawProject)
  if (!project.success || project.data.programmingLanguage !== 'python')
    return 'O projeto inicial Python precisa ser válido para configurar os objetivos.'
  const profileId = project.data.runtime.profileId
  if (
    checks.some((check) => check.programmingLanguage === 'python' && check.profileId !== profileId)
  )
    return 'Os objetivos precisam usar o mesmo perfil Python do projeto inicial.'
  try {
    const pythonChecks = checks.filter(
      (check): check is SectionPythonProjectCheck => check.programmingLanguage === 'python',
    )
    validateSectionPythonProjectChecks(pythonChecks)
    const graphics = pythonProjectCheckGraphics(project.data.installedExtensions)
    if (
      (graphics === 'raylib2d' || graphics === 'raylib3d') &&
      pythonChecks.some(
        (check) =>
          check.rule.type === 'behavior' && check.rule.expect.target.kind === 'spritePosition',
      )
    )
      return 'No Raylib, confira uma variável ou propriedade do vetor do programa, como posicao.x ou posicao.z.'
    if (
      graphics === 'none' &&
      pythonChecks.some(
        (check) =>
          check.rule.type === 'behavior' &&
          (check.rule.expect.target.kind === 'spritePosition' ||
            check.rule.steps.some((step) => step.action !== 'wait')),
      )
    )
      return 'Escolha uma extensão gráfica para verificar teclado e cliques neste projeto.'
    return null
  } catch {
    return 'Preencha os objetivos Python, os nomes esperados e os caminhos de arquivo válidos.'
  }
}
