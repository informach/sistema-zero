import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { StudioAuthoringRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

const reject = (status: number) =>
  Response.json(
    {
      error: {
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
        message: 'Pedido de execução inválido.',
      },
    },
    { status, headers: { 'cache-control': 'private, no-store' } },
  )
export async function POST(request: Request) {
  if (
    request.headers.has('content-encoding') ||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
  )
    return reject(400)
  let raw: unknown
  try {
    raw = await readJsonBodyWithLimit(request, 2_000_000)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return reject(413)
    if (error instanceof InvalidJsonBodyError) return reject(400)
    throw error
  }
  const parsed = StudioAuthoringRuntimeRequestSchema.safeParse(raw)
  if (!parsed.success) return reject(400)
  const response = forwardUpstream(
    await gatewayFetch('/members/admin/studio/authoring-runtime', {
      method: 'POST',
      body: parsed.data,
    }),
  )
  response.headers.set('cache-control', 'private, no-store')
  return response
}
