/** Tempo relativo curto e amigável para os cards ("agora mesmo", "há 3 min"...). */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const ms = now.getTime() - then.getTime()
  if (Number.isNaN(ms)) return ''

  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'há 1 hora' : `há ${hours} horas`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`

  return then.toLocaleDateString('pt-BR')
}
