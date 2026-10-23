import { z } from 'zod'
import { StudioPortablePathSchema } from './project-environment'
import { verifyStudioPythonStructureEvidence } from './python-inspection'
import { STUDIO_PYTHON_STRUCTURE_LIMITS } from './python-structure-limits'

const scope = {
  /** Omitted means any Python source module; this is syntax, not reachability/execution. */
  file: StudioPortablePathSchema.refine((path) => /\.pyi?$/.test(path)).optional(),
}
// CPython AST stores identifiers normalized with NFKC, including each attribute component.
const name = z
  .string()
  .min(1)
  .max(STUDIO_PYTHON_STRUCTURE_LIMITS.nameChars)
  .transform((value) => value.normalize('NFKC'))
  .pipe(z.string().min(1).max(STUDIO_PYTHON_STRUCTURE_LIMITS.nameChars))
export const StudioPythonStructureRuleSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...scope, type: z.literal('usesLoop') }),
  z.strictObject({ ...scope, type: z.literal('usesConditional') }),
  z.strictObject({ ...scope, type: z.literal('declaresVariable'), name }),
  z.strictObject({ ...scope, type: z.literal('definesFunction'), name }),
  z.strictObject({
    ...scope,
    type: z.literal('callsFunction'),
    name: z
      .string()
      .min(1)
      .max(STUDIO_PYTHON_STRUCTURE_LIMITS.callTargetChars)
      .transform((value) => value.normalize('NFKC'))
      .pipe(z.string().min(1).max(STUDIO_PYTHON_STRUCTURE_LIMITS.callTargetChars)),
  }),
])
export type StudioPythonStructureRule = z.infer<typeof StudioPythonStructureRuleSchema>

/**
 * Bind a pure evaluator to complete, exact-revision CPython facts.
 * The caller supplies evidence from its own compiler; this API grants no authority.
 * Client feedback and server grading use the same rules with different evidence owners.
 */
export async function prepareStudioPythonStructureEvaluation(report: unknown, snapshot: unknown) {
  const evidence = await verifyStudioPythonStructureEvidence(report, snapshot)
  return (rawRule: unknown): boolean => {
    const rule = StudioPythonStructureRuleSchema.parse(rawRule)
    return evidence.some(({ path, structure }) => {
      if (rule.file && path !== rule.file) return false
      switch (rule.type) {
        case 'usesLoop':
          return structure.usesLoop
        case 'usesConditional':
          return structure.usesConditional
        case 'declaresVariable':
          return structure.assignedNames.includes(rule.name)
        case 'definesFunction':
          return structure.definedFunctions.includes(rule.name)
        case 'callsFunction':
          return structure.callTargets.includes(rule.name)
        default: {
          const unsupported: never = rule
          throw new Error(`Regra estrutural Python não suportada: ${JSON.stringify(unsupported)}`)
        }
      }
    })
  }
}
