import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import {
  SECTION_PYTHON_PROJECT_TEST_BODY_BYTES,
  SectionPythonProjectTestRequestSchema,
} from '@sistemazero/core/learning'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

/** Staff simulation uses exactly the authoritative lesson checker; no browser pass flags. */
export async function POST(request: Request) {
  const reject = (status: number, message: string) =>
    Response.json(
      {
        error: {
          code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
          message,
        },
      },
      { status, headers: { 'cache-control': 'private, no-store' } },
    )
  if (
    request.headers.has('content-encoding') ||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
  )
    return reject(400, 'Pedido de teste Python inválido.')
  let raw: unknown
  try {
    raw = await readJsonBodyWithLimit(
      request,
      SECTION_PYTHON_PROJECT_TEST_BODY_BYTES,
      request.signal,
    )
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return reject(413, 'Os projetos excedem o limite do teste.')
    if (error instanceof InvalidJsonBodyError)
      return reject(400, 'Pedido de teste Python inválido.')
    throw error
  }
  const parsed = SectionPythonProjectTestRequestSchema.safeParse(raw)
  if (!parsed.success) return reject(400, 'Preencha os objetivos e o contexto do rascunho Python.')
  try {
    const response = forwardUpstream(
      await gatewayFetch('/members/admin/python-project-checks/test', {
        method: 'POST',
        body: parsed.data,
        timeoutMs: 165_000,
        signal: request.signal,
      }),
    )
    response.headers.set('cache-control', 'private, no-store')
    return response
  } catch {
    request.signal.throwIfAborted()
    return Response.json(
      {
        error: {
          code: 'PROJECT_CHECK_UNAVAILABLE',
          message:
            'O teste Python não concluiu agora. Seu projeto foi preservado; tente novamente.',
        },
      },
      { status: 504, headers: { 'cache-control': 'private, no-store' } },
    )
  }
}
