/** Helpers de resposta HTTP (envelope simples e consistente). */

// `HeadersInit` (não só `Record`) p/ permitir múltiplos `Set-Cookie` (ex.: o login
// do admin seta access+refresh) via array de pares `[['set-cookie', a], ...]`.
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const h = new Headers(headers)
  if (!h.has('content-type')) h.set('content-type', 'application/json')
  return new Response(JSON.stringify(data), { status, headers: h })
}

export function jsonError(message: string, status: number, code = 'ERROR'): Response {
  return json({ error: { code, message } }, status)
}

/** Faz `request.json()` sem lançar (retorna null em corpo inválido/ausente). */
export async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
