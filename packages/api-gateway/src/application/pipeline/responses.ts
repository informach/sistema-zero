import { envelope } from '@sistemazero/core/http'

/** Resposta de erro JSON padronizada (envelope do core). */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(envelope(code, message)), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
