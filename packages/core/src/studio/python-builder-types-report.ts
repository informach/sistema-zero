import { z } from 'zod'

export const StudioPythonBuilderDiagnosticsSchema = z
  .array(
    z.strictObject({
      path: z.string().max(1024),
      start: z.number().int().nonnegative(),
      length: z.number().int().nonnegative(),
      code: z.union([z.string().max(256), z.number().finite()]),
      source: z.literal('Pyright'),
      message: z.string().max(16000),
      severity: z.enum(['error', 'warning', 'info']),
    }),
  )
  .max(100)

export const StudioPythonBuilderTypesReportSchema = z
  .strictObject({
    version: z.literal(1),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    executionRevision: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum(['passed', 'failed', 'incomplete']),
    diagnostics: StudioPythonBuilderDiagnosticsSchema,
  })
  .superRefine((value, context) => {
    const expected = value.diagnostics.some((item) => item.severity === 'error')
      ? 'failed'
      : value.diagnostics.length >= 100
        ? 'incomplete'
        : 'passed'
    if (value.status !== expected)
      context.addIssue({ code: 'custom', message: 'Resultado de tipos Python inconsistente.' })
  })
export type StudioPythonBuilderTypesReport = z.infer<typeof StudioPythonBuilderTypesReportSchema>
