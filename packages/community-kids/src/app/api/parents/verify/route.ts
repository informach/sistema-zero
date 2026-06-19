import { NextResponse } from 'next/server'
import { z } from 'zod'
import { setParentVerified } from '@/server/parent-gate'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

const Body = z.object({ password: z.string().min(1).max(200) })

const fail = (code: string, status: number) => NextResponse.json({ error: { code } }, { status })

// Cooldown POR CONTA do portão dos pais (defesa em profundidade sobre o limite
// 20/min/IP do gateway): o portão protege a senha do responsável num aparelho que a
// CRIANÇA controla, então uma trava por conta após N erros encurta a janela de
// adivinhação. Estado em memória — réplica ÚNICA (mesma régua do single-flight do
// refresh/gate da marca d'água). Sucesso limpa; trava expira sozinha.
const MAX_FAILS = 5
const LOCK_MS = 60_000
const attempts = new Map<string, { fails: number; lockedUntil: number }>()

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

  const now = Date.now()
  let rec = attempts.get(session.id)
  if (rec && rec.lockedUntil > now) return fail('TOO_MANY_ATTEMPTS', 429)
  // Trava expirada → recomeça do zero.
  if (rec && rec.lockedUntil > 0 && rec.lockedUntil <= now) {
    attempts.delete(session.id)
    rec = undefined
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('INVALID_INPUT', 400)

  const { status, body } = await shell.gateway.loginRequest(session.email, parsed.data.password)

  if (status === 200 && body?.tokens) {
    attempts.delete(session.id) // acerto limpa o contador
    // Revoga o login descartável (família PRÓPRIA) — não toca a sessão atual.
    if (body.tokens.refreshToken) await shell.gateway.logoutRequest(body.tokens.refreshToken)
    await setParentVerified(session.id)
    return NextResponse.json({ ok: true })
  }
  // NÃO mascarar rate limit/indisponibilidade como senha errada.
  if (status === 429) return fail('TOO_MANY_ATTEMPTS', 429)
  if (status >= 500) return fail('SERVICE_UNAVAILABLE', 503)
  // Senha errada: conta a falha e, no limite, tranca a conta por um minuto.
  const fails = (rec?.fails ?? 0) + 1
  attempts.set(session.id, { fails, lockedUntil: fails >= MAX_FAILS ? now + LOCK_MS : 0 })
  return fail('INVALID_CREDENTIALS', 401)
}
