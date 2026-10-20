import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  awaitWithSignal,
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import {
  StudioLiveProBuildRequestSchema,
  StudioLiveProSnapshotSchema,
} from '@sistemazero/core/studio/live-pro-runtime'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  prepareStudioProToolchain,
  proProjectTemplateId,
  proRuntimeOperation,
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from '../server/studio-pro-runtime'

const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
const failure = (message: string, status: number) => response({ error: { message } }, status)

class LiveSnapshotDenied extends Error {
  constructor(readonly status: number) {
    super('A autoria ou a revisão mudou. Aguarde a sincronização.')
  }
}

/** Private saved-snapshot authorization. Client requests never contain source or a runtime URL. */
export function createLiveProRuntimeBuild(deps: {
  gatewayFetch(path: string, opts: CallOpts): Promise<GatewayResponse>
  session(): Promise<{ readonly: boolean; support?: boolean } | null>
}) {
  return async (request: Request, route: { params: Promise<{ workspaceId: string }> }) => {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55_000)])
    const owned = <T>(operation: () => Promise<T>) => awaitWithSignal(operation, signal)
    try {
      const session = await owned(deps.session)
      if (!session) return failure('Entre novamente para continuar.', 401)
      if (session.readonly || session.support)
        return failure('A sessão de suporte não pode executar projetos da oficina.', 403)
      if (
        request.headers.has('content-encoding') ||
        request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
          'application/json'
      )
        return failure('Envie o contexto do projeto em JSON.', 415)
      const operation = proRuntimeOperation(request)
      const parsed = StudioLiveProBuildRequestSchema.safeParse(
        await owned(() => readJsonBodyWithLimit(request, 4096)),
      )
      const { workspaceId } = await owned(() => route.params)
      if (!parsed.success || parsed.data.context.workspaceId !== workspaceId)
        return failure('Confira o contexto de execução do projeto.', 400)
      const body = parsed.data
      const runtimeUrl = process.env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/$/, '')
      const runtimeToken = process.env.STUDIO_PRO_RUNTIME_TOKEN?.trim()
      if (!runtimeUrl || !runtimeToken)
        return failure('O ambiente Pro ainda não está configurado. Avise a equipe.', 503)
      const snapshot = async () => {
        const result = await owned(() =>
          deps.gatewayFetch(`/members/live/workspaces/${workspaceId}/pro-build-snapshot`, {
            method: 'POST',
            body,
            signal,
          }),
        )
        if (result.status !== 200)
          throw new LiveSnapshotDenied(
            [400, 401, 403, 404, 409, 429].includes(result.status) ? result.status : 503,
          )
        const value = structuredClone(StudioLiveProSnapshotSchema.parse(result.body))
        if (
          canonicalJson(value.context) !== canonicalJson(body.context) ||
          value.workspaceRevision !== body.expectedWorkspaceRevision ||
          value.expiresAt <= Date.now() ||
          value.project.id !== workspaceId ||
          !isProStudioProject(value.project) ||
          proProjectTemplateId(value.project) !== value.templateId ||
          new TextEncoder().encode(canonicalJson(value.project)).byteLength > 2_000_000 ||
          (await sha256Hex(canonicalJson(value.project))) !== value.projectSha256
        )
          throw new Error('Invalid private snapshot')
        signal.throwIfAborted()
        if (value.expiresAt <= Date.now()) throw new LiveSnapshotDenied(409)
        return { ...value, project: value.project }
      }
      const before = await snapshot()
      const executionId = await opaqueStudioRuntimeExecutionId(
        'live',
        before.actor.accountId,
        before.actor.userId,
        canonicalJson(body.context),
        String(before.workspaceRevision),
        before.projectSha256,
      )
      const result =
        operation === 'prepare-dependencies'
          ? await prepareStudioProToolchain({
              project: before.project,
              executionId,
              runtimeUrl,
              runtimeToken,
              signal,
            })
          : await buildStudioProProject({
              parentOrigin: new URL(request.url).origin,
              project: before.project,
              templateId: before.templateId,
              executionId,
              runtimeUrl,
              runtimeToken,
              signal,
            })
      const after = await snapshot()
      if (
        before.projectSha256 !== after.projectSha256 ||
        canonicalJson(before.actor) !== canonicalJson(after.actor) ||
        before.templateId !== after.templateId
      )
        return failure('O projeto mudou durante a compilação. Execute a revisão atual.', 409)
      signal.throwIfAborted()
      // No saved project, curation, bearer or private URL in this public response.
      return response({ ...result, workspaceRevision: after.workspaceRevision })
    } catch (error) {
      if (error instanceof LiveSnapshotDenied) return failure(error.message, error.status)
      if (error instanceof RequestBodyTooLargeError)
        return failure('O contexto enviado é grande demais.', 413)
      if (error instanceof InvalidJsonBodyError) return failure('Confira os dados enviados.', 400)
      if (error instanceof StudioProRuntimeInputError) return failure(error.message, error.status)
      if (error instanceof StudioProRuntimeUpstreamError)
        return response(
          { error: { message: error.message, output: error.output } },
          studioProRuntimePublicStatus(error.status),
        )
      return failure(
        'Não foi possível conferir ou compilar o projeto. Tente novamente.',
        signal.aborted ? 504 : 503,
      )
    }
  }
}
