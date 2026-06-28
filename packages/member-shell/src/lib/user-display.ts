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

/**
 * Idade em ANOS COMPLETOS a partir de `YYYY-MM-DD` (controle de idade kids — a data
 * de nascimento é preenchida pelos pais). `null` se ausente/malformada/futura. Puro e
 * client-safe; usa a data local atual.
 */
export function computeAgeFromBirthDate(birthDate?: string | null): number | null {
  const s = birthDate?.trim()
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const now = new Date()
  let age = now.getFullYear() - year
  const curMonth = now.getMonth() + 1
  if (curMonth < month || (curMonth === month && now.getDate() < day)) age -= 1
  if (age < 0 || age > 120) return null
  return age
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
