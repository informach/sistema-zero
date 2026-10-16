/**
 * Cliente fetch para os Route Handlers do BFF (mesma origem). Em 401 (sessão
 * expirada e refresh falhou) redireciona para o login. Erros do gateway/serviço
 * chegam no envelope `{ error: { code, message } }`.
 */
export interface ApiError {
  retryAfterMs?: number
  status: number
  code: string
  message: string
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'code' in error &&
    typeof error.code === 'string'
  )
}

function extractError(status: number, body: unknown): ApiError {
  const envelope = body as { error?: { code?: string; message?: string } } | null
  return {
    status,
    code: envelope?.error?.code ?? 'ERROR',
    message: envelope?.error?.message ?? 'Algo deu errado.',
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login'
    throw { status: 401, code: 'UNAUTHORIZED', message: 'Sessão expirada.' } satisfies ApiError
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = extractError(res.status, body)
    const retry = res.headers.get('retry-after')
    if (retry) {
      const n = Number(retry)
      error.retryAfterMs = Number.isFinite(n)
        ? Math.max(0, n * 1000)
        : Math.max(0, (Date.parse(retry) || Date.now()) - Date.now())
    }
    throw error
  }
  return body as T
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return handle<T>(
    await fetch(path, { cache: 'no-store', signal, headers: { accept: 'application/json' } }),
  )
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return handle<T>(
    await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  )
}
