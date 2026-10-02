/** O formulário tem fuso explícito de Brasília, independente do computador do operador. */
export function campaignLocalDate(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
export function campaignIsoDate(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error('Preencha as datas de início e encerramento.')
  const date = new Date(`${local}:00-03:00`)
  if (!Number.isFinite(date.getTime()) || campaignLocalDate(date.toISOString()) !== local)
    throw new Error('Confira a data e a hora informadas.')
  return date.toISOString()
}
