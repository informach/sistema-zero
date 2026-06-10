/**
 * Regras de exibição de nome/iniciais do usuário (espelha o projeto de
 * referência `comunidade-sistema-zero`, adaptado a firstName/lastName).
 * Puro e client-safe — sem imports de `server/*`.
 */

/** Parte do e-mail antes do `@` (ex.: "ana@ex.com" → "ana"); `null` se vazio. */
export function getEmailHandle(email?: string | null): string | null {
  const trimmed = email?.trim()
  if (!trimmed) return null
  return trimmed.split('@')[0] || trimmed
}

/** Nome de exibição: "First Last" → handle do e-mail → "Membro" (nunca vazio). */
export function getUserDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ')
  if (name) return name
  return getEmailHandle(email) ?? 'Membro'
}

/** Iniciais p/ o avatar: nome+sobrenome ("JS") → 1ª letra do handle → "M". */
export function getUserInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const first = firstName?.trim()
  const last = lastName?.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return (first[0] ?? 'M').toUpperCase()
  const handle = getEmailHandle(email)
  if (handle) return (handle[0] ?? 'M').toUpperCase()
  return 'M'
}
