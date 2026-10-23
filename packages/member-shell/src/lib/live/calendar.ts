/**
 * "Adicionar à minha agenda" (proposta de 23/10/2026): um arquivo de calendário (.ics) montado
 * no próprio navegador, sem servidor. Os horários vão em UTC, então o calendário de quem baixa
 * mostra no fuso dele.
 */

export interface LiveCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt?: string | null
  /** Endereço absoluto da sala, para o lembrete levar direto a ela. */
  url: string
  description: string
}

const stamp = (value: Date) =>
  value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** RFC 5545: escapa barra, ponto e vírgula, vírgula e quebra de linha. */
const text = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function liveCalendarFile(event: LiveCalendarEvent, now = new Date()): string {
  const start = new Date(event.startsAt)
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 90 * 60_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sistema Zero//Oficinas ao vivo//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@oficinas.sistemazero`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(event.title)}`,
    `DESCRIPTION:${text(event.description)}`,
    `URL:${event.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${text(event.title)}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function downloadLiveCalendar(event: LiveCalendarEvent) {
  const blob = new Blob([liveCalendarFile(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'encontro-ao-vivo.ics'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
