const SP_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Idade em anos completos a partir da data de nascimento (`YYYY-MM-DD` do auth),
 * no DIA CIVIL de São Paulo. Identidade kids = nome + idade (nunca e-mail).
 * `null`/lixo → null (a UI mostra só o nome).
 */
export function ageFrom(
  birthDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number]
  const today = SP_DAY.format(now) // YYYY-MM-DD em SP
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  if (!by || !bm || !bd) return null
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age >= 0 && age < 130 ? age : null
}
