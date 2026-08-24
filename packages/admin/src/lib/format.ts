/** Formata centavos (inteiro) em BRL. Dinheiro SEMPRE trafega em centavos. */
export function formatCents(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

/**
 * Formata centavos vindos como STRING (bigint serializado do @sistemazero/payments)
 * em BRL. `Number()` é seguro para valores reais (bem abaixo de MAX_SAFE_INTEGER).
 */
export function formatCentsStr(value: string | number, currency = 'BRL'): string {
  const cents = typeof value === 'number' ? value : Number(value)
  return formatCents(Number.isFinite(cents) ? cents : 0, currency)
}

/** Converte um valor em reais (string "37,00" / "37.00" / number) para centavos inteiros. */
export function reaisToCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100)
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? Math.round(num * 100) : Number.NaN
}

/** ISO-8601 → data curta pt-BR (ou "—" se ausente). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

const SP_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * "Quando foi a última atividade", em DIA CIVIL de São Paulo (23h BRT ainda é
 * "hoje"): `hoje` · `ontem` · `há N dias` (até 30) · data curta além disso.
 * `null`/lixo → null (o card decide a copy de "nunca").
 */
export function relativeDayLabel(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.round(
    (Date.parse(`${SP_DAY.format(now)}T00:00:00Z`) - Date.parse(`${SP_DAY.format(d)}T00:00:00Z`)) /
      dayMs,
  )
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days <= 30) return `há ${days} dias`
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}
