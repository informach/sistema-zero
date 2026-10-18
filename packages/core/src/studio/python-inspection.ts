import { z } from 'zod'
import { StudioPortablePathSchema, StudioSha256Schema } from './project-environment'
import { verifyStudioPythonExecutionMetadata } from './python-execution-content'
import { StudioPythonStructureFactsSchema } from './python-structure'

export const STUDIO_PYTHON_INSPECTION_LIMITS = Object.freeze({
  files: 80,
  reportBytes: 2 * 1024 * 1024,
  deadlineMs: 90_000,
  messageChars: 2000,
})

const fileSchema = z
  .strictObject({
    path: StudioPortablePathSchema.refine((path) => /\.pyi?$/.test(path)),
    sha256: StudioSha256Schema,
    status: z.enum(['passed', 'failed']),
    structure: StudioPythonStructureFactsSchema.optional(),
    diagnostics: z
      .array(
        z.strictObject({
          message: z.string().min(1).max(STUDIO_PYTHON_INSPECTION_LIMITS.messageChars),
          range: z
            .strictObject({
              start: z.number().int().nonnegative(),
              end: z.number().int().nonnegative(),
            })
            .refine((range) => range.end >= range.start)
            .optional(),
        }),
      )
      .max(1),
  })
  .superRefine((file, context) => {
    if (file.structure && file.status !== 'passed')
      context.addIssue({
        code: 'custom',
        message: 'A fonte inválida não oferece estrutura verificada.',
      })
    if ((file.status === 'passed') !== (file.diagnostics.length === 0))
      context.addIssue({
        code: 'custom',
        message: 'O diagnóstico não corresponde ao resultado da compilação.',
      })
  })

/** A compilation report is neither execution evidence nor an authorization grant. */
export const StudioPythonInspectionReportSchema = z
  .strictObject({
    version: z.literal(1),
    revision: StudioSha256Schema,
    runtimeManifestSha256: StudioSha256Schema,
    pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    status: z.enum(['passed', 'failed']),
    files: z.array(fileSchema).min(1).max(STUDIO_PYTHON_INSPECTION_LIMITS.files),
  })
  .superRefine((report, context) => {
    if (new Set(report.files.map((file) => file.path)).size !== report.files.length)
      context.addIssue({ code: 'custom', message: 'A compilação repete um arquivo.' })
    if ((report.status === 'passed') !== report.files.every((file) => file.status === 'passed'))
      context.addIssue({
        code: 'custom',
        message: 'O resultado geral não corresponde aos arquivos compilados.',
      })
  })
export type StudioPythonInspectionReport = z.infer<typeof StudioPythonInspectionReportSchema>

/** Call only on the service-owned report; absent/partial facts are never an empty program. */
export async function verifyStudioPythonStructureEvidence(raw: unknown, snapshot: unknown) {
  const report = await verifyStudioPythonInspectionReport(raw, snapshot)
  if (report.status !== 'passed' || report.files.some((file) => !file.structure))
    throw new Error('A evidência estrutural Python está incompleta.')
  return report.files.map((file) => ({
    path: file.path,
    sha256: file.sha256,
    structure: StudioPythonStructureFactsSchema.parse(file.structure),
  }))
}

/** The coordinator must obtain this report from its own isolated inspector, never from a browser report. */
export async function verifyStudioPythonInspectionReport(
  raw: unknown,
  snapshotInput: unknown,
): Promise<StudioPythonInspectionReport> {
  const report = StudioPythonInspectionReportSchema.parse(raw)
  const snapshot = await verifyStudioPythonExecutionMetadata(snapshotInput)
  const expected = snapshot.files.filter(
    (file) => file.kind === 'source' && /\.pyi?$/.test(file.path),
  )
  const hashes = new Map(expected.map((file) => [file.path, file.sha256]))
  if (
    report.revision !== snapshot.revision ||
    report.runtimeManifestSha256 !== snapshot.configuration.runtime.manifestSha256 ||
    report.pythonVersion !== snapshot.configuration.python.dependencyLock.pythonVersion ||
    report.files.length !== expected.length ||
    report.files.some((file) => hashes.get(file.path) !== file.sha256)
  )
    throw new Error('O relatório de compilação não corresponde ao snapshot Python.')
  const lengths = new Map(expected.map((file) => [file.path, file.byteLength]))
  if (
    report.files.some((file) =>
      file.diagnostics.some(
        (diagnostic) => diagnostic.range && diagnostic.range.end > (lengths.get(file.path) ?? -1),
      ),
    )
  )
    throw new Error('O diagnóstico ultrapassa a fonte Python verificada.')
  if (
    new TextEncoder().encode(JSON.stringify(report)).byteLength >
    STUDIO_PYTHON_INSPECTION_LIMITS.reportBytes
  )
    throw new Error('O relatório de compilação excede o limite do perfil.')
  return report
}
