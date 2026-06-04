import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loginRequest } from '@/server/gateway'
import { setSessionCookies } from '@/server/session'

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * Login do aluno: qualquer conta ATIVA entra (inclusive `customer` — diferente
 * do admin, que filtra papel). Conta inativa → 403 do auth → INACTIVE.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }

  const { status, body } = await loginRequest(parsed.data.email, parsed.data.password)

  if (status === 403) {
    return NextResponse.json({ error: { code: 'INACTIVE' } }, { status: 403 })
  }
  // NÃO mascarar erro de upstream como credencial inválida (já atrapalhou diagnóstico):
  // 429 = rate-limit do gateway (20/min/IP); 5xx = gateway/auth indisponível.
  if (status === 429) {
    return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
  }
  if (status >= 500) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
  }
  if (status !== 200 || !body?.tokens || !body?.user) {
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401 })
  }

  await setSessionCookies(body.tokens)
  return NextResponse.json({ ok: true })
}
