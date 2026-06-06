import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forgotPassword } from '@/server/auth'
import type { GatewayResponse } from '@/server/gateway'

const Body = z.object({ email: z.string().email() })

/**
 * Recuperação por LINK. Anti-enumeração vale p/ a resposta do AUTH (sempre
 * 200) — NÃO p/ falha de infra: 429/5xx engolidos virariam "e-mail enviado"
 * sem e-mail nunca chegar (mesma regra do OTP).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  let upstream: GatewayResponse | null = null
  try {
    upstream = await forgotPassword(parsed.data.email)
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
