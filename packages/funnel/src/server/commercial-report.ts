import {
  type CommercialQuery,
  type CommercialReport,
  commercialQuerySchema,
} from '@sistemazero/marketing-contracts'
import { json, jsonError } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'
export async function handleCommercialReport(
  request: Request,
  deps: { internalToken: string; report: (input: CommercialQuery) => Promise<CommercialReport> },
) {
  const token = request.headers.get('x-internal-token')
  if (!token || !safeEqual(token, deps.internalToken))
    return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  const text = await request.text()
  if (text.length > 8192) return jsonError('Pedido muito grande.', 413, 'PAYLOAD_TOO_LARGE')
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return jsonError('Pedido inválido.', 400, 'BAD_REQUEST')
  }
  const parsed = commercialQuerySchema.safeParse(body)
  if (!parsed.success) return jsonError('Período ou origem inválidos.', 400, 'BAD_REQUEST')
  try {
    const response = json(await deps.report(parsed.data))
    response.headers.set('cache-control', 'no-store')
    return response
  } catch {
    return jsonError('Medição indisponível.', 503, 'REPORT_UNAVAILABLE')
  }
}
