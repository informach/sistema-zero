/**
 * Cliente fetch para os Route Handlers do BFF (mesma origem). Em 401 (sessão
 * expirada e refresh falhou) redireciona para o login. Erros do gateway/catálogo
 * chegam no envelope `{ error: { code, message } }`.
 */
/**
 * O `code` e a frase que o CLIENTE inventa quando a resposta de erro não traz o envelope (o
 * gateway caiu, 502/504, ou a rota devolveu `{ ok: false }`). Não são do servidor: o
 * `erroDoServidor` do `LessonCopy` os trata como ausência de código, e a tela mostra a frase
 * padrão do componente em vez de "Algo deu errado.".
 */
export const CODIGO_SEM_ENVELOPE = 'ERROR'
export const FRASE_SEM_ENVELOPE = 'Algo deu errado.'

export interface ApiError {
  status: number
  code: string
  message: string
  /** Só em `QUIZ_COOLDOWN` (429): ISO de quando o aluno pode refazer o quiz. */
  retryAvailableAt?: string
}

function extractError(status: number, body: unknown): ApiError {
  const envelope = body as {
    error?: { code?: string; message?: string }
    retryAvailableAt?: string
  } | null
  return {
    status,
    code: envelope?.error?.code ?? CODIGO_SEM_ENVELOPE,
    message: envelope?.error?.message ?? FRASE_SEM_ENVELOPE,
    ...(typeof envelope?.retryAvailableAt === 'string'
      ? { retryAvailableAt: envelope.retryAvailableAt }
      : {}),
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

export async function apiGet<T>(
  path: string,
  headers?: Record<string, string>,
  /**
   * `signal` para DESISTIR de uma leitura que ficou obsoleta.
   *
   * ⚠️ Não é só economia de rede: uma rota do BFF pode gravar cookie na resposta (a cor do
   * perfil grava), e uma resposta que chega DEPOIS de uma escrita mais nova carimbaria o valor
   * velho. Abortada, a resposta não é recebida e o `Set-Cookie` dela não vale.
   */
  options?: { signal?: AbortSignal },
): Promise<T> {
  // Os GETs do BFF são dados autenticados e mutáveis (entregas, progresso,
  // conversas). Nunca reutilize uma resposta HTTP anterior: depois de um
  // reenvio, por exemplo, a sincronização precisa trazer o snapshot novo.
  return handle<T>(
    await fetch(path, {
      cache: 'no-store',
      headers: { accept: 'application/json', ...headers },
      ...(options?.signal ? { signal: options.signal } : {}),
    }),
  )
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  headers?: Record<string, string>,
  /**
   * Sobrevive ao fechamento da aba (`keepalive` do fetch). Use em escrita que o
   * aluno dispara e some logo em seguida, como trocar de seção e fechar a aula:
   * sem isso o navegador CANCELA o pedido no unload e o lugar se perde.
   */
  options?: { keepalive?: boolean },
): Promise<T> {
  return handle<T>(
    await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(options?.keepalive ? { keepalive: true } : {}),
    }),
  )
}
