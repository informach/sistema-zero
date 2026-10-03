import type { GatewayResult } from './ports/gateway.port'

/** Política registrada em cada novo resgate, sem alterar bolsas históricas. */
export const SCHOLARSHIP_ACCESS_DURATION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function scholarshipExpiresAt(createdAt: Date, durationDays: number | null): Date | null {
  return durationDays === null ? null : new Date(createdAt.getTime() + durationDays * DAY_MS)
}

/** O novo lote entrega DOIS direitos: participação temporária e visita permanente. */
export function isMuralTrialGranted(result: GatewayResult): boolean {
  const body = result.body
  return (
    result.status === 200 &&
    body !== null &&
    typeof body === 'object' &&
    'ok' in body &&
    body.ok === true &&
    (('granted' in body && body.granted === 2) || ('deduped' in body && body.deduped === true))
  )
}
