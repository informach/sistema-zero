/** Fetch do navegador vinculado à sessão que ABRIU este documento.
 * Um cookie pode mudar em outra aba; esta prova continua sendo a original.
 * Não é credencial: o servidor compara com a sessão autenticada antes de salvar. */
let documentSessionId: string | null | undefined
export function pageSessionId(): string | null {
  if (typeof document === 'undefined') return null
  if (!documentSessionId) {
    documentSessionId =
      document.querySelector<HTMLMetaElement>('meta[name="sz-session"]')?.content ?? null
  }
  return documentSessionId
}

export async function sessionFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const sessionId = pageSessionId()
  if (!sessionId || typeof location === 'undefined') return fetch(input, init)
  const url = new URL(input instanceof Request ? input.url : input.toString(), location.href)
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return fetch(input, init)
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  )
  headers.set('x-sz-session', sessionId)
  const response = await fetch(input, { ...init, headers })
  if (response.status === 401 || response.status === 409) {
    const body = await response
      .clone()
      .json()
      .catch(() => null)
    if (response.status === 401 || body?.error?.code === 'SESSION_CHANGED') {
      window.dispatchEvent(new Event('sz:session-changed'))
    }
  }
  return response
}

export function notifySessionChange() {
  // Só um sinal, sem nomes, tokens ou permissões persistidas no cliente.
  try {
    localStorage.setItem('sz:kids:session-change', crypto.randomUUID())
  } catch {
    /* Navegador sem storage; o servidor continua conferindo cada chamada. */
  }
}
