import { z } from 'zod'
import { StudioProjectDocumentSchema } from '../studio/project-document'
import { StudioCatalogIdSchema } from '../studio/project-environment'
import { StudioPythonActivitySchema } from '../studio/python-activity'
import { StudioPythonStructureRuleSchema } from '../studio/python-activity-structure'
import { STUDIO_PYTHON_STRUCTURE_LIMITS } from '../studio/python-structure-limits'
import { StudioLiveRuntimeContextSchema } from '../studio/runtime-authorization'
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

export const SectionPythonProjectCheckDraftSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  label: z.string().max(200),
  hint: z.string().max(300).optional(),
  optional: z.literal(true).optional(),
  programmingLanguage: z.literal('python'),
  profileId: StudioCatalogIdSchema,
  rule: draftRule,
})
export type SectionPythonProjectCheck = z.infer<typeof SectionPythonProjectCheckDraftSchema>

export function isSectionPythonProjectCheck(value: unknown): value is SectionPythonProjectCheck {
  return SectionPythonProjectCheckDraftSchema.safeParse(value).success
}

/** A gate is all structural, server-owned, with no client execution results. */
export function sectionPythonProjectActivity(
  checks: readonly SectionPythonProjectCheck[],
  instructions: string,
) {
  if (!checks.length) throw new Error('Esta parte não possui objetivos Python.')
  const profileId = checks[0]!.profileId
  if (
    checks.some((check) => check.programmingLanguage !== 'python' || check.profileId !== profileId)
  )
    throw new Error('Todos os objetivos precisam usar o mesmo ambiente Python.')
  return StudioPythonActivitySchema.parse({
    version: 1,
    programmingLanguage: 'python',
    profileId,
    instructions,
    passingScore: 100,
    checks: checks.map((check) => ({
      id: check.id,
      label: check.label,
      kind: 'structure',
      rule: StudioPythonStructureRuleSchema.parse(check.rule),
    })),
  })
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
    sectionPythonProjectActivity(pythonChecks, '')
    return null
  } catch {
    return 'Preencha os objetivos Python, os nomes esperados e os caminhos de arquivo válidos.'
  }
}
