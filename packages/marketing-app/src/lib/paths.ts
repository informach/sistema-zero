/**
 * Validação do `?next=` do login (destino pós-autenticação). REGRA: só caminho
 * interno do app — nunca URL absoluta/protocol-relative (anti open-redirect).
 * Diferente do admin (que prefixa tudo em `/admin`), aqui as páginas vivem na
 * raiz — então o filtro é por FORMA (caminho interno) + exclusões (`/login`,
 * `/api` não são destinos de navegação).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  // `//host` é protocol-relative (redirect externo); backslash confunde a
  // normalização de path em browsers; `://` nunca aparece num caminho interno.
  if (raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return null
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login/')) return null
  if (raw.startsWith('/api/') || raw === '/api') return null
  return raw
}
