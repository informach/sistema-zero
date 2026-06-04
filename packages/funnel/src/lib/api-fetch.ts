// Cliente leve usado pelas ilhas React para falar com os endpoints /api/* (mesma
// origem → cookies enviados automaticamente).

/**
 * Resposta não-OK dos endpoints /api/*: carrega o `status` e o `code` do envelope
 * de erro (`{ error: { code, message } }`) p/ a ilha reagir por tipo (ex.:
 * `PAYMENT_IN_PROGRESS` → "aguarde" + retry, em vez de erro genérico).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    serverMessage?: string,
  ) {
    // Mantém `HTTP <status>` no início — consumidores antigos filtram por ele
    // (ex.: ilhas de admin checam `message.includes('401')`).
    super(serverMessage ? `HTTP ${status} — ${serverMessage}` : `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    let code: string | undefined
    let message: string | undefined
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } } | null
      code = body?.error?.code
      message = body?.error?.message
    } catch {
      /* corpo não-JSON (ex.: 502 cru de proxy) — fica só o status */
    }
    throw new ApiError(res.status, code, message)
  }
  return (await res.json()) as T
}

export const apiGet = <T>(path: string): Promise<T> => jsonFetch<T>(path, { method: 'GET' })

/** GET que retorna null em respostas não-OK (ex.: 404 sem lead). */
export async function apiTryGet<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path)
  } catch {
    return null
  }
}

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  jsonFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  jsonFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
