import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtpRequest } from '@/server/gateway'
import { setSessionCookies } from '@/server/session'

const Body = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
})

/**
 * Login por OTP (passwordless): qualquer conta ATIVA entra. Código inválido/expirado
 * → 401. Em sucesso, grava os cookies de sessão (igual ao login por senha).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }

  const { status, body } = await verifyOtpRequest(parsed.data.email, parsed.data.code)
  if (status === 403) {
    return NextResponse.json({ error: { code: 'INACTIVE' } }, { status: 403 })
  }
  // NÃO mascarar rate limit/indisponibilidade como "código inválido" (espelha o login).
  if (status === 429) {
    return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
  }
  if (status >= 500) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
  }
  if (status !== 200 || !body?.tokens || !body?.user) {
    return NextResponse.json({ error: { code: 'INVALID_OTP' } }, { status: 401 })
  }

  await setSessionCookies(body.tokens)
  return NextResponse.json({ ok: true })
}
