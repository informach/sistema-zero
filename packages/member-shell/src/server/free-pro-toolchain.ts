import { awaitWithSignal } from '@sistemazero/core/http'
import { STUDIO_READABLE_PROJECT_ID_PATTERN } from '@sistemazero/core/studio/project-format'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from './read-json-body'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  prepareStudioProToolchain,
  proProjectTemplateId,
  proRuntimeOperation,
  STUDIO_PRO_BUILD_LIMITS,
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from './studio-pro-runtime'

const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
/** The reverse proxy's Request.url is internal; only deployment configuration owns the parent. */
function configuredPublicOrigin(): string | null {
  const value = process.env.APP_PUBLIC_URL?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.origin
      : null
  } catch {
    return null
  }
}

/** No independent entitlement rule: each app supplies the exact guard of its existing Pro page. */
export function createFreeProToolchainPreparation(
  authorize: () => Promise<{ id: string } | Response>,
) {
  return createFreeProOperation(authorize, 'prepare-dependencies')
}

export function createFreeProRuntimeBuild(authorize: () => Promise<{ id: string } | Response>) {
  return createFreeProOperation(authorize, 'build')
}

function createFreeProOperation(
  authorize: () => Promise<{ id: string } | Response>,
  operation: 'build' | 'prepare-dependencies',
) {
  return async (request: Request): Promise<Response> => {
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(operation === 'build' ? 55_000 : 15_000),
    ])
    try {
      const actor = await awaitWithSignal(authorize, signal)
      if (actor instanceof Response) return actor
      if (proRuntimeOperation(request) !== operation)
        return response({ error: { message: 'Operação Pro inválida.' } }, 400)
      const body: unknown = await awaitWithSignal(
        () => readJsonBodyWithLimit(request, STUDIO_PRO_BUILD_LIMITS.maxBffRequestBytes, signal),
        signal,
      )
      const project = body && typeof body === 'object' && 'project' in body ? body.project : null
      if (!isProStudioProject(project) || !proProjectTemplateId(project))
        return response({ error: { message: 'Escolha um projeto Pro válido.' } }, 400)
      if (
        operation === 'build' &&
        (typeof project.id !== 'string' || !STUDIO_READABLE_PROJECT_ID_PATTERN.test(project.id))
      )
        return response({ error: { message: 'Escolha um projeto Pro válido.' } }, 400)
      const runtimeUrl = process.env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/$/, '')
      const runtimeToken = process.env.STUDIO_PRO_RUNTIME_TOKEN?.trim()
      const parentOrigin = operation === 'build' ? configuredPublicOrigin() : null
      if (!runtimeUrl || !runtimeToken || (operation === 'build' && !parentOrigin))
        return response(
          { error: { message: 'O ambiente Pro ainda não está configurado. Avise a equipe.' } },
          503,
        )
      const context = {
        project,
        executionId: await opaqueStudioRuntimeExecutionId(
          'lesson',
          operation === 'build' ? 'free-pro-build' : 'free-pro-toolchain',
          actor.id,
          ...(operation === 'build' ? [project.id] : []),
        ),
        runtimeUrl,
        runtimeToken,
        signal,
      }
      return response(
        operation === 'prepare-dependencies'
          ? await prepareStudioProToolchain(context)
          : await buildStudioProProject({
              ...context,
              templateId: proProjectTemplateId(project)!,
              parentOrigin: parentOrigin!,
            }),
      )
    } catch (error) {
      if (error instanceof StudioProRuntimeInputError)
        return response({ error: { message: error.message } }, error.status)
      if (error instanceof StudioProRuntimeUpstreamError)
        return response(
          { error: { message: error.message, output: error.output } },
          studioProRuntimePublicStatus(error.status),
        )
      if (error instanceof RequestBodyTooLargeError)
        return response({ error: { message: 'O projeto Pro ficou grande demais.' } }, 413)
      if (error instanceof InvalidJsonBodyError)
        return response({ error: { message: 'O projeto Pro enviado é inválido.' } }, 400)
      return response(
        {
          error: {
            message:
              operation === 'build'
                ? 'Não foi possível compilar agora. Seus arquivos foram preservados.'
                : 'Não foi possível preparar a atualização segura. Seus arquivos foram preservados.',
          },
        },
        signal.aborted ? 504 : 503,
      )
    }
  }
}
