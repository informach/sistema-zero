/**
 * Grade do calendário editorial. PURO (unit-testado) — trabalha com "day keys"
 * `YYYY-MM-DD` no dia civil de São Paulo (offset fixo -03:00; SP não tem
 * horário de verão desde 2019). A grade mensal é SEMPRE 6 semanas (42 células)
 * começando no domingo — altura estável, sem pulo de layout entre meses.
 */

const SAO_PAULO_UTC_OFFSET = '-03:00'

export interface CalendarCell {
  /** `YYYY-MM-DD` (dia civil de SP). */
  dayKey: string
  /** A célula pertence ao mês exibido (fora = esmaecida)? */
  inMonth: boolean
  isToday: boolean
}

function keyToUtcDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`)
}

function utcDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Soma `delta` dias a uma day key (aritmética em UTC — day keys são dias civis). */
export function addDaysToKey(dayKey: string, delta: number): string {
  const date = keyToUtcDate(dayKey)
  date.setUTCDate(date.getUTCDate() + delta)
  return utcDateToKey(date)
}

/** Dia do mês (1..31) de uma day key. */
export function dayOfMonth(dayKey: string): number {
  return Number(dayKey.slice(8, 10))
}

/** Grade mensal: 42 células (6 semanas) começando no DOMINGO. `month0` = 0..11. */
export function monthGrid(year: number, month0: number, todayKey: string): CalendarCell[] {
  const first = new Date(Date.UTC(year, month0, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay()) // volta ao domingo da 1ª semana
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    const dayKey = utcDateToKey(date)
    cells.push({
      dayKey,
      inMonth: date.getUTCMonth() === month0 && date.getUTCFullYear() === year,
      isToday: dayKey === todayKey,
    })
  }
  return cells
}

/** Semana (dom..sáb) que contém a day key âncora. */
export function weekDays(anchorKey: string, todayKey: string): CalendarCell[] {
  const anchor = keyToUtcDate(anchorKey)
  const start = new Date(anchor)
  start.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay())
  const cells: CalendarCell[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    const dayKey = utcDateToKey(date)
    cells.push({ dayKey, inMonth: true, isToday: dayKey === todayKey })
  }
  return cells
}

/** Soma meses a um par (year, month0), normalizando a virada de ano. */
export function addMonths(
  year: number,
  month0: number,
  delta: number,
): { year: number; month0: number } {
  const total = year * 12 + month0 + delta
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 }
}

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

/** Título do mês exibido ("Julho de 2026"). */
export function monthLabel(year: number, month0: number): string {
  return `${MONTH_LABELS[month0]} de ${year}`
}

/** Cabeçalho dom..sáb da grade. */
export const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

/**
 * Reagenda um ISO para OUTRO dia civil de SP preservando a hora local (drag do
 * calendário: o chip muda de dia, o horário fica).
 */
export function moveIsoToDayKeepingTime(iso: string, dayKey: string): string {
  const date = new Date(iso)
  const sp = new Date(date.getTime() - 3 * 60 * 60_000)
  const time = sp.toISOString().slice(11, 23)
  return new Date(`${dayKey}T${time}${SAO_PAULO_UTC_OFFSET}`).toISOString()
}
