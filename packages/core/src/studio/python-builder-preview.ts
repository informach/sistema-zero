import { z } from 'zod'
import { prepareStudioPythonBuilderAnalysis } from './python-builder-analysis'
import { StudioPythonBuilderTypesReportSchema } from './python-builder-types-report'
import {
  StudioPythonExecutionMetadataSchema,
  verifyStudioPythonExecutionMetadata,
} from './python-execution-content'
import {
  StudioPythonPreviewReferenceSchema,
  verifyStudioPythonPreviewReference,
} from './python-preview'
import { prepareStudioPythonProExecution } from './python-pro-execution'
import {
  StudioPythonValidationReportSchema,
  verifyStudioPythonValidationReport,
} from './python-validation'

/** The CAS identity and the executable content identity are intentionally distinct. */
export const StudioPythonBuilderPreviewSchema = z
  .strictObject({
    kind: z.literal('python'),
    revisionHash: z.string().regex(/^[a-f0-9]{64}$/),
    reference: StudioPythonPreviewReferenceSchema,
    validation: z.strictObject({
      profileVersion: z.literal(1),
      snapshot: StudioPythonExecutionMetadataSchema,
      types: StudioPythonBuilderTypesReportSchema,
      report: StudioPythonValidationReportSchema,
    }),
  })
  .superRefine((value, context) => {
    const { snapshot, types, report } = value.validation
    if (
      value.revisionHash !== types.revision ||
      snapshot.revision !== types.executionRevision ||
      value.reference.projectId !== snapshot.projectId ||
      value.reference.revision !== snapshot.revision ||
      value.reference.runtimeManifestSha256 !== snapshot.configuration.runtime.manifestSha256 ||
      types.status !== 'passed' ||
      report.status !== 'passed'
    )
      context.addIssue({
        code: 'custom',
        message: 'A prévia Python exige verificações da mesma revisão.',
      })
  })
export type StudioPythonBuilderPreview = z.infer<typeof StudioPythonBuilderPreviewSchema>

/** Repository acceptance must supply its own candidate bytes and trusted service/parent origins.
 * A well-formed report by itself is neither source attestation nor authorization. */
export async function verifyStudioPythonBuilderPreview(
  raw: unknown,
  revision: unknown,
  binaries: unknown,
  scope: { serviceOrigin: string; parentOrigin: string; now: number },
) {
  const { serviceOrigin, parentOrigin, now } = scope
  const preview = StudioPythonBuilderPreviewSchema.parse(raw)
  const prepared = await prepareStudioPythonProExecution(revision, binaries)
  const { types, report } = preview.validation
  const snapshot = await verifyStudioPythonExecutionMetadata(preview.validation.snapshot)
  if (
    preview.revisionHash !== prepared.base.hash ||
    snapshot.revision !== prepared.metadata.revision ||
    snapshot.projectId !== prepared.base.projectId
  )
    throw new Error('A prévia não corresponde aos arquivos da proposta Python.')
  const analysis = prepareStudioPythonBuilderAnalysis(prepared.base)
  if (
    types.diagnostics.some((item) => {
      const source = Object.hasOwn(analysis.snapshot.files, item.path)
        ? analysis.snapshot.files[item.path]?.source
        : undefined
      return source === undefined || item.start + item.length > source.length
    })
  )
    throw new Error('O diagnóstico não pertence aos arquivos da proposta Python.')
  await verifyStudioPythonValidationReport(report, prepared.metadata, report.recipe)
  verifyStudioPythonPreviewReference(preview.reference, {
    projectId: prepared.base.projectId,
    revision: prepared.metadata.revision,
    runtimeManifestSha256: prepared.metadata.configuration.runtime.manifestSha256,
    serviceOrigin,
    parentOrigin,
    now,
  })
  return preview
}
