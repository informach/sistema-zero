import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/server/session'

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response

/**
 * Rotas que pertencem à CONTA adulta de quem está logado (hoje, o cadastro de embaixador em Meu
 * perfil, 20/10/2026). Recusa:
 * - sem sessão (401);
 * - sessão com claim do Kids (`kids`) ou de perfil (`activeProfile`): o vínculo é da conta adulta,
 *   nunca de um perfil (403 `OWN_ACCOUNT_REQUIRED`);
 * - QUALQUER sessão de suporte (`act`), em qualquer modo e também na leitura (403
 *   `IMPERSONATION_FORBIDDEN`). Virar embaixador manda e-mail para a pessoa e abre um programa com
 *   Pix no nome dela; e a resposta traz o `pageUrl`, a capability-URL que troca a chave Pix. Nenhum
 *   dos dois pode passar pela mão do suporte (no Kids, o `requireParentGateAccountOnly` já recusa
 *   toda sessão de suporte).
 * O shell repete a régua de somente leitura (`requireWritableSession`) por baixo.
 */
export function requireOwnAdultAccount<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    if (user.kids || user.activeProfile)
      return NextResponse.json({ error: { code: 'OWN_ACCOUNT_REQUIRED' } }, { status: 403 })
    if (user.act)
      return NextResponse.json(
        {
          error: {
            code: 'IMPERSONATION_FORBIDDEN',
            message: 'Esta ação exige entrar com a própria conta, sem sessão de suporte.',
          },
        },
        { status: 403 },
      )
    return handler(req, ctx)
  }
}

/**
 * A mesma régua para quem lê no servidor (Server Component): só a conta adulta própria, sem
 * suporte, sem perfil e sem claim do Kids.
 */
export function isOwnAdultAccountSession(
  user: { id: string; act?: unknown; kids?: unknown; activeProfile?: unknown } | null | undefined,
): boolean {
  return Boolean(user && !user.act && !user.kids && !user.activeProfile)
}
