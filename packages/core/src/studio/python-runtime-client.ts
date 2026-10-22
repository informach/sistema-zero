import { z } from 'zod'
import { awaitWithSignal, readJsonBodyWithLimit } from '../http'
import {
  type StudioPythonExecutionMetadata,
  verifyStudioPythonExecutionMetadata,
} from './python-execution-content'
import {
  StudioPythonInspectionReportSchema,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from './python-inspection'
import { StudioPythonPlaytestRecipeSchema } from './python-playtest'
import {
  StudioPythonPreviewReferenceSchema,
  StudioPythonPreviewRequestSchema,
  verifyStudioPythonPreviewReference,
} from './python-preview'
import {
  STUDIO_PYTHON_VALIDATION_LIMITS,
  StudioPythonValidationReportSchema,
  verifyStudioPythonValidationReport,
} from './python-validation'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  StudioPythonInputOpenSchema,
  type StudioPythonInputReference,
  StudioPythonInputReferenceSchema,
} from './python-validation-input'

const opened = z.strictObject({ ok: z.literal(true), input: StudioPythonInputReferenceSchema })
const uploaded = z.strictObject({
  ok: z.literal(true),
  file: z.strictObject({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().nonnegative(),
  }),
})
const inspected = z.strictObject({
  ok: z.literal(true),
  report: StudioPythonInspectionReportSchema,
})
const validated = z.strictObject({
  ok: z.literal(true),
  report: StudioPythonValidationReportSchema,
  preview: StudioPythonPreviewReferenceSchema.optional(),
})
const failure = z.object({
  code: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
})

export class StudioPythonRuntimeError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message)
  }
}

/** Shared S2S compiler client. Authorization stays with the existing BFF/job, never this report. */
export interface StudioPythonRuntimeClientOptions {
  snapshot: unknown
  /** Project identity from the authorized job/subject, not from its content digest. */
  projectId: string
  owner: string
  executionId: string
  /** Persisted nonce of this server job: lost admission responses can be recovered idempotently. */
  requestId: string
  runtimeUrl: string
  runtimeToken: string
  signal: AbortSignal
  read(path: string, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>>
  /** Fresh contextual/lease authorization; mandatory before/after each operation and final acceptance. */
  authorize(snapshot: StudioPythonExecutionMetadata, signal: AbortSignal): Promise<void>
  fetchImpl?: (url: string | URL | Request, init?: RequestInit) => Promise<Response>
  cleanupFailed?(): void
  /** Explicit operation mode: compilation alone or compilation with structural evidence. */
  structure: boolean
}

async function runPythonRevision(
  options: StudioPythonRuntimeClientOptions,
  recipeInput?: unknown,
  previewInput?: unknown,
) {
  const recipe =
    recipeInput === undefined ? undefined : StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  const previewRequest =
    previewInput === undefined ? undefined : StudioPythonPreviewRequestSchema.parse(previewInput)
  if (previewRequest && !recipe)
    throw new StudioPythonRuntimeError(400, 'O preview exige validação completa.')
  if (typeof options.structure !== 'boolean')
    throw new Error('A operação Python exige uma escolha explícita de estrutura.')
  const structureRequested = options.structure
  const {
    projectId,
    owner,
    executionId,
    requestId,
    runtimeUrl,
    runtimeToken,
    signal: callerSignal,
    read,
    authorize,
    fetchImpl: configuredFetch,
    cleanupFailed,
  } = options
  const snapshot = await verifyStudioPythonExecutionMetadata(options.snapshot)
  const input = StudioPythonInputOpenSchema.parse({
    version: 1,
    snapshot,
    owner,
    executionId,
    requestId,
  })
  if (snapshot.projectId !== projectId)
    throw new StudioPythonRuntimeError(400, 'O snapshot pertence a outro projeto.')
  const url = new URL(runtimeUrl)
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  )
    throw new StudioPythonRuntimeError(503, 'A configuração do compilador Python está inválida.')
  if (!runtimeToken)
    throw new StudioPythonRuntimeError(503, 'O compilador Python não está configurado.')
  if (previewRequest?.parentOrigin === url.origin)
    throw new StudioPythonRuntimeError(
      503,
      'O serviço de preview deve usar uma origem distinta do aplicativo.',
    )
  const base = url.href.replace(/\/$/, '')
  const fetchImpl = configuredFetch ?? fetch
  const signal = AbortSignal.any([callerSignal, AbortSignal.timeout(180_000)])
  const check = async () => {
    signal.throwIfAborted()
    await awaitWithSignal(() => authorize(structuredClone(snapshot), signal), signal)
    signal.throwIfAborted()
  }
  async function send(
    path: string,
    body: string | Uint8Array<ArrayBuffer>,
    maxBytes: number,
    reference?: StudioPythonInputReference,
  ) {
    await check()
    const response = await awaitWithSignal(
      () =>
        fetchImpl(`${base}/v1/python/${path}`, {
          method: 'POST',
          redirect: 'error',
          cache: 'no-store',
          signal,
          headers: {
            Authorization: `Bearer ${runtimeToken}`,
            'Content-Type': reference ? 'application/octet-stream' : 'application/json',
            ...(reference ? { 'X-Studio-Python-Input': JSON.stringify(reference) } : {}),
          },
          body,
        }),
      signal,
      (response) => {
        void response.body?.cancel(signal.reason).catch(() => {})
      },
    )
    try {
      const raw = await readJsonBodyWithLimit(response, maxBytes, signal)
      await check()
      if (!response.ok) {
        const parsed = failure.safeParse(raw)
        throw new StudioPythonRuntimeError(
          response.status,
          parsed.success
            ? (parsed.data.message ?? 'Não foi possível inspecionar a revisão Python.')
            : 'Resposta inválida do compilador Python.',
          parsed.success ? parsed.data.code : undefined,
        )
      }
      return raw
    } finally {
      void response.body?.cancel().catch(() => {})
    }
  }
  async function release(reference: StudioPythonInputReference, path = 'inputs/remove') {
    // Cleanup cannot execute or publish; a revoked lease must not prevent retirement.
    const cleanupSignal = AbortSignal.timeout(5000)
    try {
      const response = await awaitWithSignal(
        () =>
          fetchImpl(`${base}/v1/python/${path}`, {
            method: 'POST',
            redirect: 'error',
            cache: 'no-store',
            signal: cleanupSignal,
            headers: {
              Authorization: `Bearer ${runtimeToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reference),
          }),
        cleanupSignal,
        (response) => {
          void response.body?.cancel(cleanupSignal.reason).catch(() => {})
        },
      )
      try {
        await readJsonBodyWithLimit(response, 4096, cleanupSignal)
        if (!response.ok && response.status !== 410 && response.status !== 404)
          throw new Error('Input cleanup pending')
      } finally {
        void response.body?.cancel().catch(() => {})
      }
    } catch {
      // TTL/cron/lifecycle keep ownership on failure. Telemetry must not hide the primary result/error.
      try {
        if (cleanupFailed) cleanupFailed()
        else console.warn('[studio-python] temporary input cleanup pending')
      } catch {
        console.warn('[studio-python] temporary input cleanup pending')
      }
    }
  }
  let reference: StudioPythonInputReference | undefined
  let report:
    | z.infer<typeof StudioPythonInspectionReportSchema>
    | z.infer<typeof StudioPythonValidationReportSchema>
    | undefined
  let preview: z.infer<typeof StudioPythonPreviewReferenceSchema> | undefined
  try {
    try {
      const candidate = opened.parse(await send('inputs', JSON.stringify(input), 4096)).input
      if (
        candidate.owner !== input.owner ||
        candidate.requestId !== input.requestId ||
        candidate.executionId !== input.executionId ||
        candidate.projectId !== snapshot.projectId ||
        candidate.revision !== snapshot.revision ||
        candidate.expiresAt <= Date.now() ||
        candidate.expiresAt > Date.now() + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs + 5000
      )
        throw new StudioPythonRuntimeError(
          502,
          'A admissão Python pertence a outra revisão ou execução.',
        )
      reference = candidate
      const sent = new Set<string>()
      for (const file of snapshot.files) {
        if (sent.has(file.sha256)) continue
        await check()
        const source = await awaitWithSignal(() => read(file.path, signal), signal)
        signal.throwIfAborted()
        if (source.byteLength !== file.byteLength)
          throw new StudioPythonRuntimeError(
            400,
            'Os bytes do snapshot Python mudaram antes do envio.',
          )
        const bytes = new Uint8Array(source)
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join('')
        if (bytes.byteLength !== file.byteLength || hash !== file.sha256)
          throw new StudioPythonRuntimeError(
            400,
            'Os bytes do snapshot Python mudaram antes do envio.',
          )
        const result = uploaded.parse(await send(`files/${file.sha256}`, bytes, 4096, reference))
        if (result.file.sha256 !== file.sha256 || result.file.bytes !== file.byteLength)
          throw new StudioPythonRuntimeError(502, 'O compilador não confirmou os bytes enviados.')
        sent.add(file.sha256)
      }
      const raw = await send(
        recipe ? 'validate' : 'inspect',
        JSON.stringify(
          recipe
            ? {
                version: 1,
                input: reference,
                structure: structureRequested,
                recipe,
                ...(previewRequest ? { preview: previewRequest } : {}),
              }
            : { version: 1, input: reference, structure: structureRequested },
        ),
        recipe ? STUDIO_PYTHON_VALIDATION_LIMITS.responseBytes : 2 * 1024 * 1024,
      )
      if (recipe) {
        const result = validated.parse(raw)
        report = await verifyStudioPythonValidationReport(
          result.report,
          snapshot,
          recipe,
          structureRequested,
        )
        if (Boolean(result.preview) !== Boolean(previewRequest && report.status === 'passed'))
          throw new StudioPythonRuntimeError(
            502,
            'O preview não corresponde à solicitação ou ao resultado da validação.',
          )
        if (result.preview && previewRequest)
          preview = verifyStudioPythonPreviewReference(result.preview, {
            projectId: snapshot.projectId,
            revision: snapshot.revision,
            runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
            serviceOrigin: url.origin,
            parentOrigin: previewRequest.parentOrigin,
            now: Date.now(),
          })
      } else {
        report = await verifyStudioPythonInspectionReport(inspected.parse(raw).report, snapshot)
        if (structureRequested && report.status === 'passed')
          await verifyStudioPythonStructureEvidence(report, snapshot)
      }
      await check()
    } finally {
      if (reference) await release(reference)
    }
    await check()
    if (!report)
      throw new StudioPythonRuntimeError(502, 'A inspeção Python não produziu um relatório.')
    if (preview && previewRequest)
      verifyStudioPythonPreviewReference(preview, {
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        serviceOrigin: url.origin,
        parentOrigin: previewRequest.parentOrigin,
        now: Date.now(),
      })
    let retirement: Promise<void> | undefined
    const discardPreview = () => {
      if (!retirement)
        retirement =
          reference && preview && previewRequest
            ? release(reference, 'previews/remove')
            : Promise.resolve()
      return retirement
    }
    return { report, ...(preview ? { preview } : {}), discardPreview }
  } catch (error) {
    if (reference && previewRequest) await release(reference, 'previews/remove')
    throw error
  }
}

/** Compilation uses the current request envelope and an independent final authorization fence. */
export async function inspectStudioPythonRevision(options: StudioPythonRuntimeClientOptions) {
  return StudioPythonInspectionReportSchema.parse((await runPythonRevision(options)).report)
}

/** Complete validation uses the same binary transport, cancellation and contextual authorization. */
export async function validateStudioPythonRevision(
  options: StudioPythonRuntimeClientOptions & { recipe: unknown },
) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse(options.recipe)
  return StudioPythonValidationReportSchema.parse((await runPythonRevision(options, recipe)).report)
}

/** A protected preview is produced by the same immutable validation job, never a second execution. */
export async function buildStudioPythonRevision(
  options: StudioPythonRuntimeClientOptions & {
    recipe: unknown
    preview: unknown
  },
) {
  const signal = options.signal
  const recipe = StudioPythonPlaytestRecipeSchema.parse(options.recipe)
  const preview = StudioPythonPreviewRequestSchema.parse(options.preview)
  const result = await runPythonRevision(options, recipe, preview)
  try {
    signal.throwIfAborted()
    return {
      report: StudioPythonValidationReportSchema.parse(result.report),
      ...(result.preview ? { preview: result.preview } : {}),
      /** Retained by the server caller until its own acceptance/persistence succeeds. */
      discardPreview: result.discardPreview,
    }
  } catch (error) {
    await result.discardPreview()
    throw error
  }
}
