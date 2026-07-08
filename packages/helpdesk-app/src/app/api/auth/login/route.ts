import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isTeamRole } from '@/lib/types'
import { loginRequest } from '@/server/gateway'
import { setSessionCookies } from '@/server/session'

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

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
  // Não colapsar TUDO em "credenciais inválidas": um 429 (rate limit do gateway —
  // o XFF real é repassado, então o limite é por operador) ou um 5xx (auth fora
  // do ar) precisam de mensagem própria, senão o operador reescreve a senha em
  // loop e piora o lockout / mascara um incidente.
  if (status === 429) {
    return NextResponse.json({ error: { code: 'TOO_MANY_ATTEMPTS' } }, { status: 429 })
  }
  if (status >= 500) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
  }
  if (status !== 200 || !body?.tokens || !body?.user) {
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401 })
  }
  // Só equipe entra: rejeita QUALQUER papel fora de {superadmin, admin, staff}
  // ANTES de gravar cookies (mesma regra do admin).
  if (!isTeamRole(body.user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  await setSessionCookies(body.tokens)
  return NextResponse.json({ ok: true })
}
