import type { TicketSlaView } from './types'

export const SLA_STATE_LABELS: Record<TicketSlaView['state'], string> = {
  on_track: 'No prazo',
  at_risk: 'Em risco',
  breached: 'SLA estourado',
}

export const SLA_STATE_COLORS: Record<TicketSlaView['state'], string> = {
  on_track: 'bg-muted text-muted-foreground',
  at_risk: 'bg-chart-3/15 text-chart-3',
  breached: 'bg-destructive/15 text-destructive',
}

function formatDuration(minutes: number): string {
  const absolute = Math.abs(minutes)
  if (absolute >= 60) {
    const hours = Math.floor(absolute / 60)
    const rest = absolute % 60
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`
  }
  return `${absolute} min`
}

/** Texto curto de prioridade: só tickets ativos recebem um objeto de SLA. */
export function formatSlaRemaining(sla: TicketSlaView | null): string | null {
  if (!sla) return null
  if (sla.state === 'breached' && sla.remainingMinutes >= 0) return 'SLA estourado agora'
  if (sla.remainingMinutes < 0) return `Estourado há ${formatDuration(sla.remainingMinutes)}`
  if (sla.remainingMinutes === 0) return 'No limite do SLA'
  return `Vence em ${formatDuration(sla.remainingMinutes)}`
}
