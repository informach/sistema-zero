import { ValidationError } from '@sistemazero/core/errors'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { ZodError } from 'zod'
import { coursePublicationsRequest } from '@/server/course-publications'
import { forwardUpstream } from '@/server/forward'

type Context = { params: Promise<{ path?: string[] }> }
const headers = { 'cache-control': 'private, no-store' }
function failure(error: unknown) {
  const status =
    error instanceof RequestBodyTooLargeError
      ? 413
      : error instanceof ValidationError ||
          error instanceof ZodError ||
          error instanceof InvalidJsonBodyError
        ? 400
        : 503
  return Response.json(
    {
      error: {
        code:
          status === 413
            ? 'PAYLOAD_TOO_LARGE'
            : status === 400
              ? 'INVALID_INPUT'
              : 'COURSE_PUBLICATION_UNAVAILABLE',
        message:
          status === 503
            ? 'Não foi possível acessar a publicação de cursos agora'
            : 'Pedido de publicação inválido',
      },
    },
    { status, headers },
  )
}
export async function GET(request: Request, context: Context) {
  try {
    const result = await coursePublicationsRequest(
      'GET',
      (await context.params).path ?? [],
      new URL(request.url).searchParams,
    )
    const response = forwardUpstream(result)
    response.headers.set('cache-control', headers['cache-control'])
    return response
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request, context: Context) {
  try {
    if (
      !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '') ||
      request.headers.has('content-encoding')
    )
      throw new ValidationError('Formato inválido')
    const body = await readJsonBodyWithLimit(request, 32 * 1024, request.signal)
    const result = await coursePublicationsRequest(
      'POST',
      (await context.params).path ?? [],
      new URL(request.url).searchParams,
      body,
    )
    const response = forwardUpstream(result)
    response.headers.set('cache-control', headers['cache-control'])
    return response
  } catch (error) {
    return failure(error)
  }
}
