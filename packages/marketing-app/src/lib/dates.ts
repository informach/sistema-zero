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

// SP não tem horário de verão desde 2019 — o offset fixo -03:00 é seguro e
// dispensa Intl no caminho quente (mesma premissa dos helpers acima).
const SP_OFFSET_MS = 3 * 60 * 60_000

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

/** `input[type=datetime-local]` (hora de SP) → ISO UTC. Inválido → null. */
export function datetimeLocalToIso(value: string): string | null {
  if (!DATETIME_LOCAL_RE.test(value)) return null
  const date = new Date(`${value}${value.length === 16 ? ':00' : ''}${SAO_PAULO_UTC_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** ISO UTC → valor de `input[type=datetime-local]` na hora de SP (YYYY-MM-DDTHH:mm). */
export function isoToDatetimeLocalSp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - SP_OFFSET_MS).toISOString().slice(0, 16)
}

/** ISO UTC → chave do dia civil em SP (`YYYY-MM-DD`) — agrupamento do calendário. */
export function isoToSaoPauloDayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10)
}

/** Janela [início, início do dia seguinte) de um dia civil de SP, em ISO UTC. */
export function spDayWindow(dayKey: string): { fromIso: string; toIso: string } {
  const start = new Date(`${dayKey}T00:00:00.000${SAO_PAULO_UTC_OFFSET}`)
  return {
    fromIso: start.toISOString(),
    toIso: new Date(start.getTime() + 86_400_000).toISOString(),
  }
}

/** Chave do dia civil de SP de "agora". */
export function todayDayKeySp(now: Date = new Date()): string {
  return new Date(now.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10)
}

/** ISO curto amigável em SP (dd/mm HH:mm) p/ chips e linhas do painel. */
export function formatShortSp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const sp = new Date(date.getTime() - SP_OFFSET_MS)
  const dd = String(sp.getUTCDate()).padStart(2, '0')
  const mm = String(sp.getUTCMonth() + 1).padStart(2, '0')
  const hh = String(sp.getUTCHours()).padStart(2, '0')
  const min = String(sp.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${min}`
}

/** Só a hora em SP (HH:mm) p/ chips do calendário. */
export function formatTimeSp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - SP_OFFSET_MS).toISOString().slice(11, 16)
}
