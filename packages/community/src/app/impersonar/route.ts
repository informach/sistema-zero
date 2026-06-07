import { redirect } from 'next/navigation'
import { exchangeImpersonation } from '@/server/gateway'
import { setSessionCookies } from '@/server/session'

/**
 * Aterrissagem do "Entrar como" do painel admin (origem DIFERENTE — o admin não
 * consegue setar cookies daqui; por isso o handoff via URL). Troca o token
 * single-use (~60s) pela sessão IMPERSONADA do aluno-alvo e entra na home.
 * SUBSTITUI qualquer sessão existente neste browser (cookies sz_member_*).
 * Mitigações do token na URL: single-use + TTL curtíssimo + consumo atômico no
 * auth + `X-Robots-Tag: noindex` global do app. Redirects são RELATIVOS
 * (`redirect()` do next/navigation) — atrás do proxy, montar origin absoluto de
 * `req.url` apontaria para o host interno.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')?.trim()

  if (token) {
    const { status, body } = await exchangeImpersonation(token)
    if (status === 200 && body?.tokens) {
      await setSessionCookies(body.tokens)
      redirect('/')
    }
  }

  // Token ausente/expirado/já usado → login com aviso (sem vazar o motivo).
  redirect('/login?erro=impersonacao')
}
