/**
 * Validação do `?next=` do login (destino pós-autenticação). REGRA: só caminho
 * interno do painel — nunca URL absoluta/protocol-relative (anti open-redirect).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/admin')) return null
  // Defensivo (o prefixo acima já barra): backslash confunde normalização de
  // path em browsers; `://` nunca aparece num caminho interno legítimo.
  if (raw.includes('\\') || raw.includes('://')) return null
  return raw
}
