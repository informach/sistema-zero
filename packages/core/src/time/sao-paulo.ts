const SAO_PAULO_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Dia civil corrente em São Paulo, no formato lexicograficamente ordenável `YYYY-MM-DD`. */
export function saoPauloDayKey(now: Date = new Date()): string {
  let year = ''
  let month = ''
  let day = ''

  for (const part of SAO_PAULO_DATE_FORMAT.formatToParts(now)) {
    if (part.type === 'year') year = part.value
    if (part.type === 'month') month = part.value
    if (part.type === 'day') day = part.value
  }

  return `${year}-${month}-${day}`
}
