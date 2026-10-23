import { z } from 'zod'
import { STUDIO_PYTHON_STRUCTURE_LIMITS as limits } from './python-structure-limits'

const names = (maxChars: number) =>
  z
    .array(z.string().min(1).max(maxChars))
    .max(limits.namesPerCategory)
    .superRefine((values, ctx) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: 'A evidência Python repete um nome.' })
    })

/**
 * Syntactic facts only. Bindings include parameters/imports/patterns, not attribute writes.
 * Call targets are source identifiers/attributes; aliases and dynamic dispatch are not resolved.
 * No fact asserts execution or grants authority to a client-supplied report.
 */
export const StudioPythonStructureFactsSchema = z
  .strictObject({
    version: z.literal(1),
    nodesVisited: z.number().int().min(1).max(limits.nodes),
    usesLoop: z.boolean(),
    usesConditional: z.boolean(),
    assignedNames: names(limits.nameChars),
    definedFunctions: names(limits.nameChars),
    callTargets: names(limits.callTargetChars),
  })
  .superRefine((facts, ctx) => {
    if (
      facts.assignedNames.length + facts.definedFunctions.length + facts.callTargets.length >
      limits.names
    )
      ctx.addIssue({ code: 'custom', message: 'A evidência Python contém nomes demais.' })
    if (new TextEncoder().encode(JSON.stringify(facts)).byteLength > limits.evidenceBytes)
      ctx.addIssue({ code: 'custom', message: 'A evidência estrutural Python excede o limite.' })
  })

export type StudioPythonStructureFacts = z.infer<typeof StudioPythonStructureFactsSchema>
