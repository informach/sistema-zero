import { z } from 'zod'
import { awaitWithSignal, readJsonBodyWithLimit } from '../http'
import { prepareStudioPythonBuilderAnalysis } from './python-builder-analysis'
import {
  StudioPythonBuilderDiagnosticsSchema as diagnostics,
  StudioPythonBuilderTypesReportSchema,
} from './python-builder-types-report'
import { PYTHON_LANGUAGE_LIMITS } from './python-language'
import { StudioPythonLanguageOpenSchema } from './python-language-authorization'
import { prepareStudioPythonProExecution } from './python-pro-execution'

type Prepared = Awaited<ReturnType<typeof prepareStudioPythonProExecution>>
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const opened = z.strictObject({
  version: z.literal(1),
  sessionId: z.string().regex(/^[a-f0-9]{32}$/),
  projectId: z.string(),
})
const started = z.strictObject({ ready: z.literal(true) })
const closed = z.strictObject({ closed: z.literal(true) })
const synced = z.strictObject({
  version: z.literal(1),
  id: z.literal('builder_sync'),
  kind: z.literal('synced'),
  revision: z.literal(1),
})
const result = z.strictObject({
  version: z.literal(1),
  id: z.literal('builder_types'),
  kind: z.literal('result'),
  method: z.literal('projectDiagnostics'),
  revision: z.literal(1),
  path: z.string(),
  documentVersion: z.literal(1),
  result: diagnostics,
})

export class StudioPythonBuilderTypesError extends Error {
  constructor(readonly code: 'unavailable' | 'cleanup-pending') {
    super(
      code === 'cleanup-pending'
        ? 'A análise Python aguarda a liberação de seus recursos.'
        : 'Não foi possível concluir a análise de tipos Python.',
    )
  }
}

export interface StudioPythonBuilderTypesOptions {
  revision: unknown
  binaries: unknown
  owner: string
  binding: string
  serviceUrl: string
  serviceToken: string
  /** Only the trusted development host may enable loopback HTTP. */
  allowLocalHttp?: boolean
  signal: AbortSignal
  authorize(
    base: Prepared['base'],
    metadata: Prepared['metadata'],
    signal: AbortSignal,
  ): Promise<void>
  fetchImpl?: (url: string | URL | Request, init?: RequestInit) => Promise<Response>
  /** Records a failed retirement of a reservation received after owner withdrawal. */
  cleanupFailed(error: StudioPythonBuilderTypesError): void
}

/** The browser editor and builder share the real Pyright protocol. This client owns one
 * private session, never interprets CPython compilation as type-analysis evidence. */
export async function inspectStudioPythonBuilderTypes(options: StudioPythonBuilderTypesOptions) {
  const {
    owner,
    binding,
    serviceUrl,
    serviceToken,
    allowLocalHttp,
    signal: callerSignal,
    authorize,
    fetchImpl = fetch,
    cleanupFailed,
  } = options
  callerSignal.throwIfAborted()
  sha256.parse(owner)
  sha256.parse(binding)
  const url = new URL(serviceUrl)
  if (
    !serviceToken ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(
        allowLocalHttp === true &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  )
    throw new StudioPythonBuilderTypesError('unavailable')
  const root = `${url.href.replace(/\/$/, '')}/v1/python-language/${owner}`
  const signal = AbortSignal.any([callerSignal, AbortSignal.timeout(75000)])
  const prepared = await prepareStudioPythonProExecution(options.revision, options.binaries, signal)
  const { entrypoint, command, snapshot } = (() => {
    try {
      return prepareStudioPythonBuilderAnalysis(prepared.base)
    } catch {
      throw new StudioPythonBuilderTypesError('unavailable')
    }
  })()
  const check = async () => {
    signal.throwIfAborted()
    await awaitWithSignal(
      () => authorize(structuredClone(prepared.base), structuredClone(prepared.metadata), signal),
      signal,
    )
    signal.throwIfAborted()
  }
  async function request(
    path: string,
    body: unknown,
    operationSignal: AbortSignal,
    operation?: 'sync' | 'query',
    method = 'POST',
  ) {
    try {
      const response = await awaitWithSignal(
        () =>
          fetchImpl(`${root}/${path}`, {
            method,
            redirect: 'error',
            cache: 'no-store',
            signal: operationSignal,
            headers: {
              Authorization: `Bearer ${serviceToken}`,
              'Content-Type': 'application/json',
              ...(operation
                ? { 'x-studio-python-binding': binding, 'x-studio-python-operation': operation }
                : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          }),
        operationSignal,
        (late) => {
          void late.body?.cancel().catch(() => {})
        },
      )
      try {
        const raw = await readJsonBodyWithLimit(
          response,
          PYTHON_LANGUAGE_LIMITS.maxResponseBytes,
          operationSignal,
        )
        if (!response.ok) throw new StudioPythonBuilderTypesError('unavailable')
        return raw
      } finally {
        // Header rejection can precede acquiring a reader. Retire the owned body
        // even in that case; a non-cooperative stream must not block withdrawal.
        void response.body?.cancel().catch(() => {})
      }
    } catch {
      operationSignal.throwIfAborted()
      throw new StudioPythonBuilderTypesError('unavailable')
    }
  }
  async function close(id: string) {
    try {
      closed.parse(await request(id, undefined, AbortSignal.timeout(5000), undefined, 'DELETE'))
    } catch {
      throw new StudioPythonBuilderTypesError('cleanup-pending')
    }
  }
  await check()
  // A lost open response must still be read to obtain the session ID and retire it.
  // The reservation is independently bounded; withdrawal cannot dispatch start/sync/query.
  const reserve = () =>
    request(
      'open',
      StudioPythonLanguageOpenSchema.parse({
        projectId: prepared.base.projectId,
        binding,
      }),
      AbortSignal.timeout(5000),
    ).then(async (raw) => {
      const value = opened.parse(raw)
      if (value.projectId !== prepared.base.projectId) {
        await close(value.sessionId)
        throw new StudioPythonBuilderTypesError('unavailable')
      }
      return value.sessionId
    })
  const sessionId = await awaitWithSignal(reserve, signal, (id) => {
    void close(id).catch(() => cleanupFailed(new StudioPythonBuilderTypesError('cleanup-pending')))
  })
  let report: z.infer<typeof diagnostics>
  try {
    await check()
    started.parse(
      await request(
        `${sessionId}/start`,
        { binding },
        AbortSignal.any([signal, AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.startupTimeoutMs)]),
      ),
    )
    await check()
    synced.parse(
      await request(
        sessionId,
        command,
        AbortSignal.any([signal, AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs)]),
        'sync',
      ),
    )
    await check()
    const reply = result.parse(
      await request(
        sessionId,
        {
          version: 1,
          id: 'builder_types',
          kind: 'query',
          revision: 1,
          path: entrypoint,
          documentVersion: 1,
          method: 'projectDiagnostics',
        },
        AbortSignal.any([signal, AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs)]),
        'query',
      ),
    )
    if (
      reply.path !== entrypoint ||
      reply.result.some((item) => {
        const file = Object.hasOwn(snapshot.files, item.path)
          ? snapshot.files[item.path]
          : undefined
        return !file || item.start + item.length > file.source.length
      })
    )
      throw new StudioPythonBuilderTypesError('unavailable')
    await check()
    // The service bounds its workspace response at 100. A full response may hide
    // errors in later files, so it cannot certify a clean project.
    report = reply.result
  } finally {
    await close(sessionId)
  }
  await check()
  const status = report.some((item) => item.severity === 'error')
    ? 'failed'
    : report.length >= 100
      ? 'incomplete'
      : 'passed'
  return {
    prepared,
    types: StudioPythonBuilderTypesReportSchema.parse({
      version: 1,
      status,
      revision: prepared.base.hash,
      executionRevision: prepared.metadata.revision,
      diagnostics: report,
    }),
  }
}
