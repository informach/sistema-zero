const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/
const SAO_PAULO_UTC_OFFSET = '-03:00'

function isValidDateInput(value: string): boolean {
  if (!DATE_INPUT_RE.test(value)) return false

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const check = new Date(Date.UTC(year, month - 1, day))

  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  )
}

/** `input[type=date]` de validade: acesso liberado até o fim do dia em São Paulo. */
export function dateInputToSaoPauloEndOfDayIso(value: string): string | null {
  if (!isValidDateInput(value)) return null

  const date = new Date(`${value}T23:59:59.999${SAO_PAULO_UTC_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** `input[type=date]` como início do dia civil em São Paulo. */
export function dateInputToSaoPauloStartOfDayIso(value: string): string | null {
  if (!isValidDateInput(value)) return null

  const date = new Date(`${value}T00:00:00.000${SAO_PAULO_UTC_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** ISO-8601 → `YYYY-MM-DD` no fuso de São Paulo, para preencher `input[type=date]`. */
export function isoToSaoPauloDateInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  return year && month && day ? `${year}-${month}-${day}` : ''
}

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

/** `YYYY-MM` → "julho de 2026" (rótulo dos meses do Desafio). Inválido → o próprio valor. */
export function monthLabelPt(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) return month
  const name = MONTH_NAMES_PT[Number(m[2]) - 1]
  return name ? `${name} de ${m[1]}` : month
}
