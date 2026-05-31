// Cliente leve usado pelas ilhas React para falar com os endpoints /api/* (mesma
// origem → cookies enviados automaticamente).

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
