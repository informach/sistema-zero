import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioProjectIdSchema } from './project-document'
import { verifyStudioPythonExecutionMetadata } from './python-execution-content'
import {
  StudioPythonInspectionReportSchema,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from './python-inspection'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
  verifyStudioPythonPlaytestReport,
} from './python-playtest'

export {
  StudioPythonValidationOperationSchema,
  StudioPythonValidationRequestSchema,
} from './python-validation-input'

export const STUDIO_PYTHON_VALIDATION_LIMITS = Object.freeze({
  requestBytes: 100_000,
  reportBytes: 3 * 1024 * 1024,
  responseBytes: 3 * 1024 * 1024 + 8192,
})

export const StudioPythonValidationReportSchema = z
  .strictObject({
    version: z.literal(1),
    projectId: StudioProjectIdSchema,
    recipe: StudioPythonPlaytestRecipeSchema,
    status: z.enum(['passed', 'failed']),
    inspection: StudioPythonInspectionReportSchema,
    execution: StudioPythonPlaytestReportSchema.optional(),
  })
  .superRefine((report, context) => {
    const execution = report.execution
    const compilable = report.inspection.status === 'passed'
    if (compilable !== Boolean(execution))
      context.addIssue({
        code: 'custom',
        message: 'As fases de validação Python estão incompletas ou fora de ordem.',
      })
    if ((report.status === 'passed') !== (compilable && execution?.status === 'passed'))
      context.addIssue({
        code: 'custom',
        message: 'O resultado não corresponde às fases de validação Python.',
      })
    if (
      execution &&
      (execution.projectId !== report.projectId ||
        execution.revision !== report.inspection.revision ||
        execution.runtimeManifestSha256 !== report.inspection.runtimeManifestSha256 ||
        execution.pythonVersion !== report.inspection.pythonVersion ||
        canonicalJson(execution.recipe) !== canonicalJson(report.recipe))
    )
      context.addIssue({
        code: 'custom',
        message: 'As fases não pertencem à mesma revisão e receita Python.',
      })
  })
export type StudioPythonValidationReport = z.infer<typeof StudioPythonValidationReportSchema>

/** Service-owned evidence only. Authorization and final revision acceptance remain with the host. */
export async function verifyStudioPythonValidationReport(
  raw: unknown,
  snapshotInput: unknown,
  recipeInput: unknown,
  structure = false,
) {
  const report = StudioPythonValidationReportSchema.parse(raw)
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  const snapshot = await verifyStudioPythonExecutionMetadata(snapshotInput)
  if (
    report.projectId !== snapshot.projectId ||
    canonicalJson(report.recipe) !== canonicalJson(recipe)
  )
    throw new Error('A validação não corresponde ao projeto ou à receita Python.')
  const inspection = await verifyStudioPythonInspectionReport(report.inspection, snapshot)
  if (structure && inspection.status === 'passed')
    await verifyStudioPythonStructureEvidence(inspection, snapshot)
  if (report.execution) await verifyStudioPythonPlaytestReport(report.execution, snapshot, recipe)
  if (
    new TextEncoder().encode(JSON.stringify(report)).byteLength >
    STUDIO_PYTHON_VALIDATION_LIMITS.reportBytes
  )
    throw new Error('O relatório de validação Python excede o limite.')
  return report
}
