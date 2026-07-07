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

/** `input[type=date]` como fim do dia civil em São Paulo (prazos/dueDate). */
export function dateInputToSaoPauloEndOfDayIso(value: string): string | null {
  if (!isValidDateInput(value)) return null

  const date = new Date(`${value}T23:59:59.999${SAO_PAULO_UTC_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** `input[type=date]` como início do dia civil em São Paulo (janelas de filtro). */
export function dateInputToSaoPauloStartOfDayIso(value: string): string | null {
  if (!isValidDateInput(value)) return null

  const date = new Date(`${value}T00:00:00.000${SAO_PAULO_UTC_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
