/**
 * Datas e estados das oficinas como a CRIANÇA lê. A tela mostrava "14 de out. de 2026, 15:39"
 * e "· America/Sao_Paulo"; a criança pensa em "sábado, às 15h" e em quanto falta (full review de
 * 14/10/2026). Puro e com o relógio injetado, para os testes cobrirem a virada do dia no fuso.
 */

const DEFAULT_ZONE = 'America/Sao_Paulo'

function parts(value: Date, timeZone: string) {
  const format = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const get = (type: string) =>
    Number(format.formatToParts(value).find((part) => part.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/** Dias de calendário entre duas datas NO FUSO da turma (0 = mesmo dia). */
export function calendarDaysBetween(from: Date, to: Date, timeZone = DEFAULT_ZONE): number {
  const a = parts(from, timeZone)
  const b = parts(to, timeZone)
  const utc = (p: typeof a) => Date.UTC(p.year, p.month - 1, p.day)
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

/** "15h" ou "15h30". */
export function liveHour(value: Date, timeZone = DEFAULT_ZONE): string {
  const { hour, minute } = parts(value, timeZone)
  return minute ? `${hour}h${String(minute).padStart(2, '0')}` : `${hour}h`
}

function weekdayAndDate(value: Date, timeZone: string): string {
  const text = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(value)
  // "sábado, 21 de outubro" → "Sábado, 21 de outubro"
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "Hoje, às 15h", "Amanhã, às 9h", "Sábado, 21 de outubro, às 15h". */
export function friendlyWhen(iso: string, timeZone = DEFAULT_ZONE, now = new Date()): string {
  const value = new Date(iso)
  const days = calendarDaysBetween(now, value, timeZone)
  const hour = liveHour(value, timeZone)
  if (days === 0) return `Hoje, às ${hour}`
  if (days === 1) return `Amanhã, às ${hour}`
  if (days === -1) return `Ontem, às ${hour}`
  return `${weekdayAndDate(value, timeZone)}, às ${hour}`
}

/** "21 de outubro" (para prazos: "Você pode rever até 21 de outubro"). */
export function friendlyDay(iso: string, timeZone = DEFAULT_ZONE): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, day: 'numeric', month: 'long' }).format(
    new Date(iso),
  )
}

/** "Faltam 3 dias", "Falta 1 dia", "Começa em 2 horas", "Começa em 10 minutos" ou null. */
export function countdown(iso: string, timeZone = DEFAULT_ZONE, now = new Date()): string | null {
  const start = new Date(iso)
  const ms = start.getTime() - now.getTime()
  if (ms <= 0) return null
  const days = calendarDaysBetween(now, start, timeZone)
  if (days >= 2) return `Faltam ${days} dias`
  if (days === 1) return 'Falta 1 dia'
  const minutes = Math.ceil(ms / 60_000)
  if (minutes >= 120) return `Começa em ${Math.floor(minutes / 60)} horas`
  if (minutes >= 60) return 'Começa em 1 hora'
  if (minutes <= 1) return 'Começa em 1 minuto'
  return `Começa em ${minutes} minutos`
}

/** "1h15", "45 min". */
export function durationLabel(startsAt: string, endsAt?: string | null): string | null {
  if (!endsAt) return null
  const minutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const rest = minutes % 60
  return rest ? `${Math.floor(minutes / 60)}h${String(rest).padStart(2, '0')}` : `${minutes / 60}h`
}

export type LiveScheduleState =
  | 'live'
  | 'soon'
  | 'today'
  | 'upcoming'
  | 'ended'
  | 'cancelled'
  | 'expired'

/**
 * Em que pé está o encontro, do ponto de vista da agenda da criança. `soon` = a sala pode estar
 * abrindo (15 min antes); `ended` = já aconteceu e ainda dá para rever e continuar.
 */
export function liveScheduleState(
  session: {
    startsAt: string
    accessEndsAt: string
    occurrenceStartsAt?: string
    occurrenceEndsAt?: string
    occurrenceState?: string
  },
  timeZone = DEFAULT_ZONE,
  now = new Date(),
): LiveScheduleState {
  const t = now.getTime()
  if (t >= Date.parse(session.accessEndsAt)) return 'expired'
  if (session.occurrenceState === 'cancelled') return 'cancelled'
  if (session.occurrenceState === 'live') return 'live'
  if (session.occurrenceState === 'ended') return 'ended'
  const start = Date.parse(session.occurrenceStartsAt ?? session.startsAt)
  const end = session.occurrenceEndsAt ? Date.parse(session.occurrenceEndsAt) : null
  if (end !== null && t >= end) return 'ended'
  if (session.occurrenceState === 'lobby' || (t >= start - 15 * 60_000 && t < start)) return 'soon'
  // Passou do horário e a professora ainda não abriu: "vai abrir", nunca "ao vivo" de mentira.
  if (session.occurrenceState === 'scheduled' && t >= start) return 'soon'
  if (t >= start) return end === null || t < end ? 'live' : 'ended'
  return calendarDaysBetween(now, new Date(start), timeZone) === 0 ? 'today' : 'upcoming'
}
