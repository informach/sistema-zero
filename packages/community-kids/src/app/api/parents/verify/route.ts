import { NextResponse } from 'next/server'
import { z } from 'zod'
import { setParentVerified } from '@/server/parent-gate'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

const Body = z.object({ password: z.string().min(1).max(200) })

const fail = (code: string, status: number) => NextResponse.json({ error: { code } }, { status })

/**
 * Abre o "portão dos pais" numa sessão da CONTA verificando a SENHA do
 * responsável. Sem mexer no auth/gateway: faz um login DESCARTÁVEL (prova a
 * senha) e revoga na hora a família emitida — a sessão atual (família distinta)
 * fica intacta. Sucesso → cookie curto `sz_kids_parent` (ver parent-gate). Numa
 * sessão de PERFIL o caminho é o `/api/profile-session/exit` (sair com a senha).
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return fail('UNAUTHENTICATED', 401)
  // Só na sessão da conta — na sessão de perfil a senha sai pelo exit.
  if (session.activeProfile) return fail('USE_PROFILE_EXIT', 400)
  if (!session.email) return fail('NO_ACCOUNT_EMAIL', 400)

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('INVALID_INPUT', 400)

  const { status, body } = await shell.gateway.loginRequest(session.email, parsed.data.password)

  if (status === 200 && body?.tokens) {
    // Revoga o login descartável (família PRÓPRIA) — não toca a sessão atual.
    if (body.tokens.refreshToken) await shell.gateway.logoutRequest(body.tokens.refreshToken)
    await setParentVerified(session.id)
    return NextResponse.json({ ok: true })
  }
  // NÃO mascarar rate limit/indisponibilidade como senha errada.
  if (status === 429) return fail('TOO_MANY_ATTEMPTS', 429)
  if (status >= 500) return fail('SERVICE_UNAVAILABLE', 503)
  return fail('INVALID_CREDENTIALS', 401)
}
