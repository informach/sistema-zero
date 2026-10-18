import type { StudioProBuilderEvidence } from './pro-builder'
import {
  type StudioPythonBuilderPreview,
  StudioPythonBuilderPreviewSchema,
} from './python-builder-preview'
import {
  inspectStudioPythonBuilderTypes,
  type StudioPythonBuilderTypesOptions,
} from './python-builder-types'
import { StudioPythonPlaytestRecipeSchema } from './python-playtest'
import { StudioPythonPreviewRequestSchema } from './python-preview'
import { buildStudioPythonRevision } from './python-runtime-client'

type Prepared = Awaited<ReturnType<typeof inspectStudioPythonBuilderTypes>>['prepared']
export interface StudioPythonBuilderValidationOptions
  extends Omit<StudioPythonBuilderTypesOptions, 'authorize'> {
  runtime: {
    url: string
    token: string
    executionId: string
    requestId: string
    parentOrigin: string
    recipe: unknown
  }
  authorize(
    base: Prepared['base'],
    metadata: Prepared['metadata'],
    operation: 'analyze' | 'execute',
    signal: AbortSignal,
  ): Promise<void>
  runtimeCleanupFailed(): void
}
export type StudioPythonBuilderValidationOutcome =
  | {
      status: 'passed'
      preview: StudioPythonBuilderPreview
      evidence: StudioProBuilderEvidence[]
      discardPreview(): Promise<void>
    }
  | { status: 'failed' | 'unavailable'; detail: string; evidence: StudioProBuilderEvidence[] }

/** One owned candidate: real Pyright first, then isolated compilation/playtest/protected preview.
 * Both transports keep fresh lease/policy authorization with the host. No model-supplied facts. */
export async function validateStudioPythonBuilderCandidate(
  options: StudioPythonBuilderValidationOptions,
): Promise<StudioPythonBuilderValidationOutcome> {
  const {
    revision,
    binaries,
    owner,
    binding,
    serviceUrl,
    serviceToken,
    allowLocalHttp,
    signal,
    authorize,
    fetchImpl,
    cleanupFailed,
    runtimeCleanupFailed,
  } = options
  const { url, token, executionId, requestId, parentOrigin, recipe: recipeInput } = options.runtime
  signal.throwIfAborted()
  const runtimeUrl = new URL(url)
  if (
    runtimeUrl.username ||
    runtimeUrl.password ||
    runtimeUrl.search ||
    runtimeUrl.hash ||
    (runtimeUrl.protocol !== 'https:' &&
      !(
        allowLocalHttp === true &&
        runtimeUrl.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(runtimeUrl.hostname)
      ))
  )
    throw new Error('O serviço de execução Python não está configurado corretamente.')
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  const previewRequest = StudioPythonPreviewRequestSchema.parse({ parentOrigin })
  if (runtimeUrl.origin === previewRequest.parentOrigin || !token)
    throw new Error('A prévia Python exige seu serviço de execução em uma origem própria.')
  const { prepared, types } = await inspectStudioPythonBuilderTypes({
    revision,
    binaries,
    owner,
    binding,
    serviceUrl,
    serviceToken,
    allowLocalHttp,
    signal,
    fetchImpl,
    cleanupFailed,
    authorize: (base, metadata, operationSignal) =>
      authorize(base, metadata, 'analyze', operationSignal),
  })
  signal.throwIfAborted()
  if (types.status !== 'passed') {
    const detail =
      types.status === 'incomplete'
        ? 'A análise Python atingiu o limite de diagnósticos e não pode certificar o projeto completo.'
        : types.diagnostics
            .filter((item) => item.severity === 'error')
            .map((item) => `${item.path}: ${item.message}`)
            .join('\n')
            .slice(0, 2000)
    return {
      status: types.status === 'failed' ? 'failed' : 'unavailable',
      detail,
      evidence: [
        { kind: 'types', status: types.status === 'failed' ? 'failed' : 'unavailable', detail },
      ],
    }
  }
  const built = await buildStudioPythonRevision({
    snapshot: prepared.metadata,
    projectId: prepared.base.projectId,
    owner,
    executionId,
    requestId,
    runtimeUrl: url,
    runtimeToken: token,
    signal,
    read: prepared.read,
    fetchImpl,
    cleanupFailed: runtimeCleanupFailed,
    recipe,
    preview: previewRequest,
    authorize: (metadata, operationSignal) =>
      authorize(structuredClone(prepared.base), metadata, 'execute', operationSignal),
  })
  try {
    signal.throwIfAborted()
    const evidence: StudioProBuilderEvidence[] = [
      {
        kind: 'types',
        status: 'passed',
        detail: 'Pyright analisou todas as fontes Python desta revisão.',
      },
      {
        kind: 'build',
        status: built.report.inspection.status,
        detail:
          built.report.inspection.status === 'passed'
            ? 'CPython compilou as fontes da revisão.'
            : built.report.inspection.files
                .flatMap((file) => file.diagnostics.map((item) => `${file.path}: ${item.message}`))
                .join('\n')
                .slice(0, 2000),
      },
    ]
    if (built.report.execution)
      evidence.push({
        kind: 'playtest',
        status: built.report.execution.status,
        detail:
          built.report.execution.status === 'passed'
            ? 'A revisão foi executada, observada e encerrada pelo serviço.'
            : built.report.execution.errors.join('\n').slice(0, 2000) ||
              'A execução Python não concluiu as verificações.',
      })
    if (built.report.status !== 'passed')
      return {
        status: 'failed',
        evidence,
        detail: evidence
          .filter((item) => item.status === 'failed')
          .map((item) => item.detail)
          .join('\n')
          .slice(0, 2000),
      }
    if (!built.preview) throw new Error('A validação Python não devolveu uma prévia executável.')
    if (built.report.execution?.capture)
      evidence.push({
        kind: 'capture',
        status: 'passed',
        detail: 'A captura pertence à execução da revisão candidata.',
        artifactUrl: new URL('python-playtest.png', built.preview.url).href,
      })
    return {
      status: 'passed',
      discardPreview: built.discardPreview,
      evidence,
      preview: StudioPythonBuilderPreviewSchema.parse({
        kind: 'python',
        revisionHash: prepared.base.hash,
        reference: built.preview,
        validation: { profileVersion: 1, snapshot: prepared.metadata, types, report: built.report },
      }),
    }
  } catch (error) {
    await built.discardPreview()
    throw error
  }
}
