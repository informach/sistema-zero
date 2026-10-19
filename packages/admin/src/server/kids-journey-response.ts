import 'server-only'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { forwardUpstream } from './forward'
import type { GatewayResponse } from './gateway'

const BODY_LIMIT_BYTES = 512 * 1024
const cacheHeaders = { 'cache-control': 'private, no-store' }

export function forwardKidsJourney(result: GatewayResponse) {
  const response = forwardUpstream(result)
  response.headers.set('cache-control', cacheHeaders['cache-control'])
  return response
}

function reject(status: 400 | 413) {
  return Response.json(
    {
      error: {
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
        message: 'Dados da jornada inválidos.',
      },
    },
    { status, headers: cacheHeaders },
  )
}

/** Decode only the request body; trusted identity headers never come from the browser. */
export async function postKidsJourney(
  request: Request,
  operation: (body: unknown) => Promise<GatewayResponse>,
) {
  if (
    request.headers.has('content-encoding') ||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
  )
    return reject(400)
  let body: unknown
  try {
    body = await readJsonBodyWithLimit(request, BODY_LIMIT_BYTES, request.signal)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return reject(413)
    if (error instanceof InvalidJsonBodyError) return reject(400)
    throw error
  }
  return forwardKidsJourney(await operation(body))
}
