import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioProjectIdSchema } from './project-document'
import { StudioSha256Schema } from './project-environment'
import { verifyStudioPythonExecutionMetadata } from './python-execution-content'
import { readStudioRuntimePngDimensions, STUDIO_SNAPSHOT_LIMITS } from './runtime-image'

export const STUDIO_PYTHON_PLAYTEST_LIMITS = Object.freeze({
  reportBytes: 512 * 1024,
  outputChars: 16_000,
  errorChars: 2000,
  errors: 20,
  // The same bounded PNG transport as the interactive player, without its base64 overhead.
  captureBytes: Math.floor((STUDIO_SNAPSHOT_LIMITS.dataUrlChars - 22) / 4) * 3,
  elapsedMs: 60_000,
})

/** Host-owned, bounded observations. No code, selectors, URLs or filesystem paths. */
export const StudioPythonPlaytestRecipeSchema = z
  .strictObject({
    /** A protected verification generation, never a project-controlled setting. */
    mission: z.literal(true).optional(),
    /** Mission checks read renderer primitives; PNG is collected only when explicitly useful. */
    capture: z.literal(false).optional(),
    version: z.literal(1),
    observeMs: z.number().int().min(250).max(10_000).default(1000),
    stdin: z
      .array(
        z
          .string()
          .max(4096)
          .regex(/^[^\r\n]*$/),
      )
      .max(4)
      .default([]),
    keys: z
      .array(
        z
          .string()
          .regex(/^(?:ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Space|Enter|Escape|[a-zA-Z0-9])$/),
      )
      .max(8)
      .default([]),
    clicks: z
      .array(
        z.strictObject({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          button: z.enum(['left', 'middle', 'right']).default('left'),
        }),
      )
      .max(4)
      .default([]),
    requireGraphics: z.boolean().default(false),
  })
  .refine(
    (recipe) => !(recipe.requireGraphics && recipe.capture === false),
    'Uma prova que exige captura gráfica não pode desativar a captura.',
  )
export type StudioPythonPlaytestRecipe = z.infer<typeof StudioPythonPlaytestRecipeSchema>

export const StudioPythonPlaytestCaptureSchema = z.strictObject({
  path: z.literal('python-playtest.png'),
  sha256: StudioSha256Schema,
  byteLength: z.number().int().min(33).max(STUDIO_PYTHON_PLAYTEST_LIMITS.captureBytes),
  width: z.number().int().min(1).max(STUDIO_SNAPSHOT_LIMITS.width),
  height: z.number().int().min(1).max(STUDIO_SNAPSHOT_LIMITS.height),
  frameSequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})
export type StudioPythonPlaytestCapture = z.infer<typeof StudioPythonPlaytestCaptureSchema>

/** Execution evidence is distinct from compilation, behavior assertions and authority. */
export const StudioPythonPlaytestReportSchema = z
  .strictObject({
    version: z.literal(1),
    projectId: StudioProjectIdSchema,
    revision: StudioSha256Schema,
    runtimeManifestSha256: StudioSha256Schema,
    pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    instanceId: z.uuid(),
    runId: z.uuid(),
    recipe: StudioPythonPlaytestRecipeSchema,
    status: z.enum(['passed', 'failed']),
    started: z.boolean(),
    stopped: z.boolean(),
    stateBeforeStop: z.enum(['ready', 'running', 'waiting-input', 'paused', 'completed', 'failed']),
    observedDurationMs: z.number().int().nonnegative().max(STUDIO_PYTHON_PLAYTEST_LIMITS.elapsedMs),
    stdout: z.string().max(STUDIO_PYTHON_PLAYTEST_LIMITS.outputChars),
    stderr: z.string().max(STUDIO_PYTHON_PLAYTEST_LIMITS.outputChars),
    omittedChars: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    errors: z
      .array(z.string().min(1).max(STUDIO_PYTHON_PLAYTEST_LIMITS.errorChars))
      .max(STUDIO_PYTHON_PLAYTEST_LIMITS.errors),
    input: z.strictObject({
      stdinRequests: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      stdinSubmitted: z.number().int().nonnegative().max(4),
      keysDispatched: z.number().int().nonnegative().max(8),
      clicksDispatched: z.number().int().nonnegative().max(4),
    }),
    capture: StudioPythonPlaytestCaptureSchema.optional(),
  })
  .superRefine((report, context) => {
    if (report.input.stdinSubmitted > report.input.stdinRequests)
      context.addIssue({
        code: 'custom',
        message: 'Uma resposta não possui solicitação de entrada.',
      })
    if (
      report.status === 'passed' &&
      (!report.started ||
        !report.stopped ||
        report.errors.length !== 0 ||
        !['running', 'waiting-input', 'completed'].includes(report.stateBeforeStop) ||
        report.observedDurationMs < report.recipe.observeMs ||
        report.input.stdinSubmitted !== report.recipe.stdin.length ||
        report.input.keysDispatched !== report.recipe.keys.length ||
        report.input.clicksDispatched !== report.recipe.clicks.length ||
        (report.recipe.requireGraphics && !report.capture))
    )
      context.addIssue({
        code: 'custom',
        message: 'A execução não cumpriu a receita ou não confirmou a parada.',
      })
  })
export type StudioPythonPlaytestReport = z.infer<typeof StudioPythonPlaytestReportSchema>

/** Only service-produced evidence may enter this verifier. Keys dispatched do not prove game response. */
export async function verifyStudioPythonPlaytestReport(
  raw: unknown,
  snapshotInput: unknown,
  recipeInput: unknown,
) {
  const report = StudioPythonPlaytestReportSchema.parse(raw)
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  const snapshot = await verifyStudioPythonExecutionMetadata(snapshotInput)
  if (
    report.projectId !== snapshot.projectId ||
    report.revision !== snapshot.revision ||
    report.runtimeManifestSha256 !== snapshot.configuration.runtime.manifestSha256 ||
    report.pythonVersion !== snapshot.configuration.python.dependencyLock.pythonVersion ||
    canonicalJson(report.recipe) !== canonicalJson(recipe)
  )
    throw new Error('O relatório de execução não corresponde ao snapshot ou à receita Python.')
  if (
    new TextEncoder().encode(JSON.stringify(report)).byteLength >
    STUDIO_PYTHON_PLAYTEST_LIMITS.reportBytes
  )
    throw new Error('O relatório de execução excede o limite do perfil.')
  return report
}

/** The bounded service-owned PNG is hashed independently of the JSON report. No image decoding here. */
export async function verifyStudioPythonPlaytestCapture(raw: unknown, input: Uint8Array) {
  const capture = StudioPythonPlaytestCaptureSchema.parse(raw)
  if (input.byteLength !== capture.byteLength)
    throw new Error('Tamanho da captura Python divergente.')
  const bytes = Uint8Array.from(input)
  const dimensions = readStudioRuntimePngDimensions(bytes)
  if (dimensions?.width !== capture.width || dimensions.height !== capture.height)
    throw new Error('Cabeçalho da captura Python divergente.')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
  if (hash !== capture.sha256) throw new Error('Hash da captura Python divergente.')
  return capture
}
