/** Janelas em dias civis de Brasília. O fim é exclusivo (00:00 do dia seguinte). */
export interface CampaignSchedule {
  eventDate: string
  giftClaimDays: number
  couponClaimDays: number
}

const DAY_MS = 86_400_000

function calendarDay(value: string): number {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value))
    throw new Error('Informe uma data de campanha entre 2020 e 2099.')
  const ms = Date.parse(`${value}T00:00:00Z`)
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().slice(0, 10) !== value ||
    value < '2020-01-01'
  )
    throw new Error('Confira a data da campanha.')
  return ms
}

const brasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Resolve meia-noite civil pela base de fusos do runtime, independente do fuso do operador. */
function midnight(day: number): string {
  let instant = day
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = brasilia.formatToParts(instant)
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value
    const local = Date.parse(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`,
    )
    if (local === day) return new Date(instant).toISOString()
    instant += day - local
  }
  throw new Error('Não foi possível resolver o início do dia em Brasília.')
}

export function campaignScheduleWindows(schedule: CampaignSchedule) {
  const start = calendarDay(schedule.eventDate)
  for (const days of [schedule.giftClaimDays, schedule.couponClaimDays]) {
    if (!Number.isSafeInteger(days) || days < 1 || days > 365)
      throw new Error('Os prazos de resgate devem ter de 1 a 365 dias.')
  }
  const startsAt = midnight(start)
  return {
    startsAt,
    giftEndsAt: midnight(start + schedule.giftClaimDays * DAY_MS),
    couponEndsAt: midnight(start + schedule.couponClaimDays * DAY_MS),
  }
}
