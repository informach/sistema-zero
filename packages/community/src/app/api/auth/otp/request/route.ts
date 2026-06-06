import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requestOtp } from '@/server/auth'
import type { GatewayResponse } from '@/server/gateway'

const Body = z.object({
  email: z.string().email(),
  purpose: z.enum(['sign_in', 'password_reset']),
})

/**
 * Pede um código OTP. Anti-enumeração vale p/ a resposta do AUTH (sempre 200) —
 * NÃO p/ falha de infra: 429 (rate limit do gateway, 5/min/IP) e 5xx engolidos
 * virariam "código enviado" sem código nunca chegar. A UI distingue.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  let upstream: GatewayResponse | null = null
  try {
    upstream = await requestOtp(parsed.data.email, parsed.data.purpose)
  } catch {
    upstream = null // rede/timeout → indisponível
  }
  if (upstream?.status === 429) {
    return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
  }
  if (!upstream || upstream.status >= 500) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
  }
  return NextResponse.json({ ok: true })
}
