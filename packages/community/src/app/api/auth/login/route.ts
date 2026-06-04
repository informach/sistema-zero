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
  if (status !== 200 || !body?.tokens || !body?.user) {
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401 })
  }

  await setSessionCookies(body.tokens)
  return NextResponse.json({ ok: true })
}
