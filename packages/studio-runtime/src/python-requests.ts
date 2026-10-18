import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import type { StudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import {
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from '@sistemazero/core/studio/python-inspection'
import { studioPythonInspectionJobId } from '@sistemazero/core/studio/python-inspection-job'
import {
  isStudioPythonWebOrigin,
  type StudioPythonPreviewReference,
  verifyStudioPythonPreviewReference,
} from '@sistemazero/core/studio/python-preview'
import {
  STUDIO_PYTHON_VALIDATION_LIMITS,
  verifyStudioPythonValidationReport,
} from '@sistemazero/core/studio/python-validation'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  StudioPythonInputOpenSchema,
  type StudioPythonInputReference,
  StudioPythonInputReferenceSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import type { PythonDistributionRegistry, RuntimeDistributionBucket } from './python-distributions'
import { PythonFileVerificationError } from './python-file-stream'
import {
  createPythonInputStore,
  inputAwait,
  type PythonInputBucket,
  PythonInputError,
} from './python-inputs'
import { type PythonInspectionSandbox, runIsolatedPythonInspection } from './python-inspection'
import { runIsolatedPythonValidation } from './python-playtest'
import { discardStoredPythonPreview, storePythonPreview } from './python-previews'

export interface PythonInspectionJobs {
  inspect(request: unknown): Promise<{ status: number; body: unknown }>
  validate?(request: unknown): Promise<{ status: number; body: unknown }>
  discardPreview?(
    reference: StudioPythonInputReference,
  ): Promise<{ retired: boolean; cleanupConfirmed: boolean }>
  cancel(reference: StudioPythonInputReference): Promise<{
    retired: boolean
    cleanupConfirmed: boolean
  }>
}

export const PYTHON_INPUT_REFERENCE_HEADER = 'X-Studio-Python-Input'
export function isPythonInternalPath(path: string) {
  return path.startsWith('/v1/python/')
}
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

/** Retirement remains available after a runtime distribution has been withdrawn. */
export async function handlePythonInputRemoval(
  request: Request,
  options: {
    bucket?: PythonInputBucket
    kind?: 'preview'
    assertCurrent(): void
    limit(owner: string): Promise<boolean>
    cancel(reference: StudioPythonInputReference): Promise<{
      retired: boolean
      cleanupConfirmed: boolean
    }>
  },
) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)])
  const previewOnly = options.kind === 'preview'
  const check = () => {
    signal.throwIfAborted()
    options.assertCurrent()
  }
  try {
    const url = new URL(request.url)
    if (
      url.pathname !== (previewOnly ? '/v1/python/previews/remove' : '/v1/python/inputs/remove') ||
      request.method !== 'POST' ||
      url.search
    )
      return reply({ ok: false, code: 'INVALID_REQUEST' }, 404)
    check()
    const parsed = StudioPythonInputReferenceSchema.safeParse(
      await readJsonBodyWithLimit(request, 2048, signal),
    )
    if (!parsed.success) return reply({ ok: false, code: 'INVALID_REQUEST' }, 400)
    check()
    const reference = parsed.data
    const allowed = await inputAwait(options.limit(reference.owner), signal)
    check()
    if (!allowed) return reply({ ok: false, code: 'RATE_LIMITED' }, 429)
    const cancelled = await inputAwait(options.cancel(reference), signal)
    check()
    if (!cancelled.retired || !cancelled.cleanupConfirmed || (!previewOnly && !options.bucket))
      return reply({ ok: false, code: 'PYTHON_CLEANUP_PENDING' }, 503)
    if (!previewOnly && options.bucket)
      await createPythonInputStore(options.bucket).remove(reference, signal)
    check()
    return reply({ ok: true })
  } catch (error) {
    if (error instanceof PythonInputError)
      return reply({ ok: false, code: 'INVALID_REQUEST' }, error.status)
    if (error instanceof RequestBodyTooLargeError)
      return reply({ ok: false, code: 'INPUT_TOO_LARGE' }, 413)
    if (error instanceof InvalidJsonBodyError)
      return reply({ ok: false, code: 'INVALID_REQUEST' }, 400)
    return reply(
      { ok: false, code: signal.aborted ? 'REQUEST_RETIRED' : 'PYTHON_CLEANUP_PENDING' },
      signal.aborted ? 408 : 503,
    )
  } finally {
    if (request.body && !request.bodyUsed) void request.body.cancel().catch(() => {})
  }
}

/** Internal only: the main handler authenticates the S2S token before invoking this module. */
export async function handlePythonRequest(
  request: Request,
  options: {
    bucket: PythonInputBucket
    runtimeBucket: Pick<RuntimeDistributionBucket, 'get'>
    registry: PythonDistributionRegistry
    /** Rejects a configuration/token/binding change after any asynchronous boundary. */
    assertCurrent(): void
    limit(owner: string, operation: 'job' | 'transfer'): Promise<boolean>
    createSandbox(): PythonInspectionSandbox
    /** Authenticated ingress delegates ownership; the job's inner call does not recurse. */
    jobs?: PythonInspectionJobs
    preview?: {
      bucket: PythonInputBucket
      serviceOrigin: string
      validation: { profileVersion: 1; runtimeFingerprint: string }
    }
  },
) {
  const url = new URL(request.url)
  const file = /^\/v1\/python\/files\/([a-f0-9]{64})$/.exec(url.pathname)
  const known =
    file ||
    [
      '/v1/python/inputs',
      '/v1/python/inputs/remove',
      '/v1/python/inspect',
      '/v1/python/validate',
    ].includes(url.pathname)
  if (!known || request.method !== 'POST' || url.search)
    return reply(
      { ok: false, code: 'INVALID_REQUEST', message: 'Rota Python não encontrada.' },
      404,
    )
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120_000)])
  const previewConfiguration = options.preview
  const discardPreview = options.jobs?.discardPreview
  let previewOwner: StudioPythonInputReference | undefined
  let producedPreview: { reference: StudioPythonPreviewReference; jobId: string } | undefined
  let accepted = false
  const store = createPythonInputStore(options.bucket)
  const check = () => {
    signal.throwIfAborted()
    options.assertCurrent()
  }
  const limit = async (owner: string, operation: 'job' | 'transfer') => {
    check()
    const allowed = await inputAwait(options.limit(owner, operation), signal)
    check()
    return allowed
  }
  async function approve(snapshot: StudioPythonExecutionMetadata) {
    const runtime = snapshot.configuration.runtime
    check()
    const deployment = options.registry.resolve(runtime)
    if (!deployment?.distribution.files.some((file) => file.path === 'inspect.mjs'))
      throw new PythonInputError(409, 'O ambiente Python não oferece inspeção aprovada.')
    if (
      snapshot.configuration.python.dependencyLock.pythonVersion !==
      deployment.distribution.pythonVersion
    )
      throw new PythonInputError(409, 'A versão Python não corresponde ao ambiente aprovado.')
    // A host-approved descriptor alone does not prove its upload completed.
    const response = await inputAwait(
      options.registry.serve(
        new Request(
          `https://studio-python-runtime.invalid/v1/runtime-deployments/${runtime.manifestSha256}`,
          { method: 'HEAD', signal },
        ),
        options.runtimeBucket,
      ),
      signal,
      (response) => {
        void response.body?.cancel().catch(() => {})
      },
    )
    void response.body?.cancel().catch(() => {})
    check()
    if (!response.ok || !options.registry.resolve(runtime))
      throw new PythonInputError(409, 'A distribuição Python está indisponível.')
    return deployment
  }
  try {
    check()
    if (url.pathname === '/v1/python/inputs') {
      const parsed = StudioPythonInputOpenSchema.safeParse(
        await readJsonBodyWithLimit(request, STUDIO_PYTHON_INPUT_LIMITS.metadataBytes, signal),
      )
      if (!parsed.success) throw new PythonInputError(400, 'Metadata do input Python inválida.')
      const input = parsed.data
      if (!(await limit(input.owner, 'job'))) return reply({ ok: false, code: 'RATE_LIMITED' }, 429)
      await approve(input.snapshot)
      const reference = await store.open(input, signal)
      check()
      await approve(input.snapshot)
      return reply({ ok: true, input: reference })
    }
    let raw: unknown
    if (file) {
      const header = request.headers.get(PYTHON_INPUT_REFERENCE_HEADER)
      if (!header || new TextEncoder().encode(header).byteLength > 2048)
        throw new PythonInputError(400, 'Referência do input Python ausente ou excessiva.')
      try {
        raw = JSON.parse(header)
      } catch {
        throw new InvalidJsonBodyError()
      }
    } else
      raw = await readJsonBodyWithLimit(
        request,
        url.pathname === '/v1/python/validate'
          ? STUDIO_PYTHON_VALIDATION_LIMITS.requestBytes
          : 2048,
        signal,
      )
    const inspection =
      url.pathname === '/v1/python/inspect'
        ? StudioPythonInspectionRequestSchema.safeParse(raw)
        : undefined
    if (inspection && !inspection.success)
      throw new PythonInputError(400, 'Solicitação de inspeção Python inválida.')
    const validation =
      url.pathname === '/v1/python/validate'
        ? StudioPythonValidationRequestSchema.safeParse(raw)
        : undefined
    if (validation && !validation.success)
      throw new PythonInputError(400, 'Solicitação de validação Python inválida.')
    const previewRequest = validation?.success ? validation.data.preview : undefined
    if (previewRequest && !options.preview)
      return reply({ ok: false, code: 'PYTHON_PREVIEW_UNAVAILABLE' }, 503)
    if (
      previewRequest &&
      options.preview &&
      (!isStudioPythonWebOrigin(options.preview.serviceOrigin) ||
        previewRequest.parentOrigin === options.preview.serviceOrigin ||
        !options.registry.allowsParentOrigin(previewRequest.parentOrigin))
    )
      throw new PythonInputError(409, 'A origem do preview Python não está aprovada.')
    const operation = validation ?? inspection
    const parsed = StudioPythonInputReferenceSchema.safeParse(
      operation?.success ? operation.data.input : raw,
    )
    if (!parsed.success) throw new PythonInputError(400, 'Referência do input Python inválida.')
    const reference = parsed.data
    if (previewRequest) previewOwner = reference
    if (previewRequest && options.jobs && !discardPreview)
      return reply({ ok: false, code: 'PYTHON_PREVIEW_UNAVAILABLE' }, 503)
    if (
      !(await limit(reference.owner, file || url.pathname.endsWith('/remove') ? 'transfer' : 'job'))
    )
      return reply({ ok: false, code: 'RATE_LIMITED' }, 429)
    if (url.pathname.endsWith('/remove')) {
      if (options.jobs) {
        const cancelled = await inputAwait(options.jobs.cancel(reference), signal)
        check()
        if (!cancelled.retired || !cancelled.cleanupConfirmed)
          return reply({ ok: false, code: 'PYTHON_CLEANUP_PENDING' }, 503)
      }
      await store.remove(reference, signal)
      check()
      return reply({ ok: true })
    }
    const input = await store.resolve(reference, signal)
    check()
    const deployment = await approve(input.snapshot)
    if (validation && !deployment.distribution.files.some((file) => file.path === 'playtest.mjs'))
      throw new PythonInputError(409, 'O ambiente Python não oferece execução protegida aprovada.')
    if (file) {
      if (!request.body) throw new PythonInputError(400, 'Arquivo Python ausente.')
      const hash = file[1]
      if (!hash) throw new PythonInputError(400, 'Identidade do arquivo Python ausente.')
      const result = await store.upload(reference, hash, request.body, signal)
      check()
      await approve(input.snapshot)
      return reply({ ok: true, file: result })
    }
    if (options.jobs) {
      const validate = options.jobs.validate
      if (validation && !validate)
        return reply({ ok: false, code: 'PYTHON_VALIDATION_UNAVAILABLE' }, 503)
      const result = await inputAwait(
        validation && validate ? validate(raw) : options.jobs.inspect(raw),
        signal,
      )
      check()
      if (result.status !== 200) return reply(result.body, result.status)
      if (!result.body || typeof result.body !== 'object' || !('report' in result.body))
        throw new Error('Resposta do job Python sem relatório.')
      const report = validation?.success
        ? await verifyStudioPythonValidationReport(
            result.body.report,
            input.snapshot,
            validation.data.recipe,
            validation.data.structure,
          )
        : await verifyStudioPythonInspectionReport(result.body.report, input.snapshot)
      if (inspection?.success && inspection.data.structure && report.status === 'passed')
        await verifyStudioPythonStructureEvidence(report, input.snapshot)
      check()
      await approve(input.snapshot)
      await store.resolve(reference, signal)
      check()
      if (!options.registry.resolve(input.snapshot.configuration.runtime))
        throw new PythonInputError(409, 'A distribuição Python foi revogada.')
      const candidate = 'preview' in result.body ? result.body.preview : undefined
      if (Boolean(candidate) !== Boolean(previewRequest && report.status === 'passed'))
        throw new Error('Resposta do job Python com preview incompatível.')
      const preview =
        candidate && previewRequest && options.preview
          ? verifyStudioPythonPreviewReference(candidate, {
              projectId: input.snapshot.projectId,
              revision: input.snapshot.revision,
              runtimeManifestSha256: input.snapshot.configuration.runtime.manifestSha256,
              serviceOrigin: options.preview.serviceOrigin,
              parentOrigin: previewRequest.parentOrigin,
              now: Date.now(),
            })
          : undefined
      const response = reply({ ok: true, report, ...(preview ? { preview } : {}) })
      accepted = true
      return response
    }
    const preparation = {
      structure: operation?.success ? operation.data.structure : false,
      snapshot: input.snapshot,
      approvedDeployment: { release: deployment.release, distribution: deployment.distribution },
      signal,
      assertCurrent() {
        check()
        if (!options.registry.resolve(input.snapshot.configuration.runtime))
          throw new PythonInputError(409, 'A distribuição Python foi revogada.')
      },
      createSandbox() {
        check()
        return options.createSandbox()
      },
      readProject: input.read,
      async readRuntime(path: string, operationSignal: AbortSignal) {
        check()
        const response = await inputAwait(
          options.registry.serve(
            new Request(
              `https://studio-python-runtime.invalid/v1/runtimes/${deployment.release.manifestSha256}/${path}`,
              { signal: operationSignal },
            ),
            options.runtimeBucket,
          ),
          operationSignal,
          (response) => {
            void response.body?.cancel().catch(() => {})
          },
        )
        try {
          check()
          if (!response.ok || !response.body)
            throw new PythonInputError(409, 'Arquivo do ambiente Python indisponível.')
          return response.body
        } catch (error) {
          void response.body?.cancel(error).catch(() => {})
          throw error
        }
      },
    }
    let preview: StudioPythonPreviewReference | undefined
    const report = validation?.success
      ? await (async () => {
          const result = await runIsolatedPythonValidation({
            ...preparation,
            recipe: validation.data.recipe,
            async beforeExecution() {
              await approve(input.snapshot)
              await store.resolve(reference, signal)
              check()
            },
          })
          const report = await verifyStudioPythonValidationReport(
            {
              version: 1,
              projectId: input.snapshot.projectId,
              recipe: validation.data.recipe,
              status:
                result.inspection.status === 'passed' &&
                result.execution?.report.status === 'passed'
                  ? 'passed'
                  : 'failed',
              inspection: result.inspection,
              ...(result.execution ? { execution: result.execution.report } : {}),
            },
            input.snapshot,
            validation.data.recipe,
            validation.data.structure,
          )
          check()
          if (previewRequest && options.preview && report.status === 'passed') {
            preview = await storePythonPreview({
              ...options.preview,
              registry: options.registry,
              runtimeBucket: options.runtimeBucket,
              preview: previewRequest,
              snapshot: input.snapshot,
              input: reference,
              report,
              captureBytes: result.execution?.captureBytes,
              signal,
              assertCurrent: preparation.assertCurrent,
              readProject: input.read,
            })
            producedPreview = {
              reference: preview,
              jobId: await studioPythonInspectionJobId(reference),
            }
            check()
          }
          return report
        })()
      : await runIsolatedPythonInspection(preparation)
    check()
    await approve(input.snapshot)
    // The final asynchronous fence is the input's current generation/closure check.
    // No marker/storage read may open a new retirement window after this fence.
    await store.resolve(reference, signal)
    check()
    if (!options.registry.resolve(input.snapshot.configuration.runtime))
      throw new PythonInputError(409, 'A distribuição Python foi revogada.')
    const response = reply({ ok: true, report, ...(preview ? { preview } : {}) })
    accepted = true
    return response
  } catch (error) {
    if (error instanceof PythonInputError)
      return reply({ ok: false, code: 'INVALID_REQUEST', message: error.message }, error.status)
    if (error instanceof RequestBodyTooLargeError)
      return reply({ ok: false, code: 'INPUT_TOO_LARGE' }, 413)
    if (error instanceof InvalidJsonBodyError || error instanceof PythonFileVerificationError)
      return reply(
        { ok: false, code: 'INVALID_REQUEST', message: 'Solicitação Python inválida.' },
        400,
      )
    if (signal.aborted) return reply({ ok: false, code: 'REQUEST_RETIRED' }, 408)
    console.error('[studio-python] operation failed')
    return reply(
      {
        ok: false,
        code: 'PYTHON_INSPECTION_FAILED',
        message: 'Não foi possível validar o projeto Python agora.',
      },
      500,
    )
  } finally {
    if (!accepted && previewOwner && discardPreview) {
      try {
        await inputAwait(discardPreview(previewOwner), AbortSignal.timeout(5000))
      } catch {
        console.error('[studio-python] preview retirement pending')
      }
    }
    if (!accepted && producedPreview && previewConfiguration) {
      try {
        await discardStoredPythonPreview({
          bucket: previewConfiguration.bucket,
          preview: producedPreview.reference,
          jobId: producedPreview.jobId,
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        console.error('[studio-python] preview rollback pending')
      }
    }
    // The stream is either fully consumed by its owner or retired, including rate/config failures.
    if (request.body && !request.bodyUsed) void request.body.cancel().catch(() => {})
  }
}
