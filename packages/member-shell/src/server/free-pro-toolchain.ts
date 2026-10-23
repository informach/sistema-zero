import { awaitWithSignal } from '@sistemazero/core/http'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from './read-json-body'
import {
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  prepareStudioProToolchain,
  proProjectTemplateId,
  proRuntimeOperation,
  STUDIO_PRO_BUILD_LIMITS,
  StudioProRuntimeInputError,
} from './studio-pro-runtime'

const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
/** No independent entitlement rule: each app supplies the exact guard of its existing Pro page. */
export function createFreeProToolchainPreparation(
  authorize: () => Promise<{ id: string } | Response>,
) {
  return async (request: Request): Promise<Response> => {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)])
    try {
      const actor = await awaitWithSignal(authorize, signal)
      if (actor instanceof Response) return actor
      if (proRuntimeOperation(request) !== 'prepare-dependencies')
        return response({ error: { message: 'Operação Pro inválida.' } }, 400)
      const body: unknown = await awaitWithSignal(
        () => readJsonBodyWithLimit(request, STUDIO_PRO_BUILD_LIMITS.maxBffRequestBytes, signal),
        signal,
      )
      const project = body && typeof body === 'object' && 'project' in body ? body.project : null
      if (!isProStudioProject(project) || !proProjectTemplateId(project))
        return response({ error: { message: 'Escolha um projeto Pro válido.' } }, 400)
      const runtimeUrl = process.env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/$/, '')
      const runtimeToken = process.env.STUDIO_PRO_RUNTIME_TOKEN?.trim()
      if (!runtimeUrl || !runtimeToken)
        return response(
          { error: { message: 'O ambiente Pro ainda não está configurado. Avise a equipe.' } },
          503,
        )
      return response(
        await prepareStudioProToolchain({
          project,
          executionId: await opaqueStudioRuntimeExecutionId(
            'lesson',
            'free-pro-toolchain',
            actor.id,
          ),
          runtimeUrl,
          runtimeToken,
          signal,
        }),
      )
    } catch (error) {
      if (error instanceof StudioProRuntimeInputError)
        return response({ error: { message: error.message } }, error.status)
      if (error instanceof RequestBodyTooLargeError)
        return response({ error: { message: 'O projeto Pro ficou grande demais.' } }, 413)
      if (error instanceof InvalidJsonBodyError)
        return response({ error: { message: 'O projeto Pro enviado é inválido.' } }, 400)
      return response(
        {
          error: {
            message:
              'Não foi possível preparar a atualização segura. Seus arquivos foram preservados.',
          },
        },
        signal.aborted ? 504 : 503,
      )
    }
  }
}
