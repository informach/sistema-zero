/** Helpers de resposta HTTP (envelope simples e consistente). */

export function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
  })
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
