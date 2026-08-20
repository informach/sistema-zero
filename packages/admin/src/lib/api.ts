/**
 * Cliente fetch para os Route Handlers do BFF (mesma origem). Em 401 (sessão
 * expirada e refresh falhou) redireciona para o login. Erros do gateway/catálogo
 * chegam no envelope `{ error: { code, message } }`.
 */
export interface ApiError {
  status: number
  code: string
  message: string
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
  if (!res.ok) throw extractError(res.status, body)
  return body as T
}

export async function apiGet<T>(path: string): Promise<T> {
  // O admin lê filas e contadores que mudam por ações de outros usuários.
  // Evita que o cache HTTP esconda uma entrega recém-enviada/reenviada.
  return handle<T>(
    await fetch(path, { cache: 'no-store', headers: { accept: 'application/json' } }),
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

/** Upload multipart (FormData) — o browser define o boundary do content-type. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return handle<T>(await fetch(path, { method: 'POST', body: form }))
}
