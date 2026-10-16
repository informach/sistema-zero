import { isPensaFunnelPeriod } from '@/lib/pensa-funnel'
import { forwardUpstream } from '@/server/forward'
import { getPensaFunnel } from '@/server/members'

/** Onde as crianças param no Pensa v2 (`days` = 7, 30 ou 90). */
export async function GET(request: Request) {
  const days = Number(new URL(request.url).searchParams.get('days') ?? '30')
  if (!isPensaFunnelPeriod(days)) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'Período inválido (7, 30 ou 90 dias).' } },
      { status: 400 },
    )
  }
  return forwardUpstream(await getPensaFunnel(days))
}
