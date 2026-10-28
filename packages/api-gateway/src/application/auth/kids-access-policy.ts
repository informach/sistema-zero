import { type KidsSessionClaim, normalizePolicyPath } from '@sistemazero/core/security'

/**
 * Escopo por público, antes do encaminhamento. Os serviços ainda conferem posse do recurso.
 * ⚠️ A política compara o caminho CANÔNICO (`normalizePolicyPath`): o roteador e os serviços
 * ignoram `//` e decodificam `%xx`, e o caminho cru deixava `/members//parents/…` passar por
 * uma regra escrita para `/members/parents/`. Caminho ambíguo (`..`, barra codificada) NEGA.
 * ⚠️ O papel da conta não entra aqui: um aluno da equipe (admin) segue sem admin, financeiro
 * ou área dos pais.
 */
export function kidsMayAccess(
  claim: KidsSessionClaim,
  rawPath: string,
  method: string,
  subject: string,
): boolean {
  const pathname = normalizePolicyPath(rawPath)
  if (!pathname) return false
  // Rotas com nome histórico /internal que já são APIs JWT do aluno.
  // Os serviços continuam validando visibilidade, posse e direito de publicar.
  if (claim.kind === 'student') {
    if (method === 'GET' && /^\/auth\/internal\/profiles\/[0-9a-f-]{36}\/public$/i.test(pathname))
      return true
    if (
      method === 'POST' &&
      [
        '/hub/internal/showcase-thread',
        '/hub/internal/showcase-thread-studio',
        '/hub/internal/showcase-thread-studio/prepare',
        '/hub/internal/showcase-thread-studio-standalone',
        '/hub/internal/showcase-thread-studio-standalone/prepare',
      ].includes(pathname)
    )
      return true
  }
  if (/(^|\/)(admin|internal)(\/|$)/i.test(pathname)) return false
  if (
    /^\/auth\/profiles\/[^/]+\/select$/i.test(pathname) ||
    pathname.toLowerCase() === '/auth/profile-session/exit'
  )
    return false
  if (claim.kind === 'parent') {
    return (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/payments/my') ||
      pathname.startsWith('/members/parents/') ||
      pathname.startsWith('/helpdesk/portal/') ||
      pathname === '/referrals/me/ambassador' ||
      // Arquipélago Vagalume: o responsável muda o tempo livre e as permissões de visita da
      // família e lê a semana das crianças (o cartão da área dos pais).
      pathname === '/arquipelago/familia/limite' ||
      pathname === '/arquipelago/familia/permissoes' ||
      (method === 'GET' && pathname === '/arquipelago/familia/semana') ||
      (method === 'GET' &&
        ['/members/profile-allowance', '/members/avatars', '/members/ai-usage/me'].includes(
          pathname,
        ))
    )
  }
  if (pathname.toLowerCase().startsWith('/members/parents/')) return false
  if (pathname.startsWith('/auth/')) {
    return (
      (method === 'PATCH' &&
        pathname.toLowerCase() === `/auth/profiles/${subject.toLowerCase()}`) ||
      (method === 'GET' && pathname === '/auth/me')
    )
  }
  return (
    pathname.startsWith('/members/') ||
    pathname.startsWith('/hub/') ||
    // Arquipélago Vagalume: o jogo da criança, menos o limite que só o responsável muda.
    (pathname.startsWith('/arquipelago/') &&
      !pathname.toLowerCase().startsWith('/arquipelago/familia/')) ||
    (method === 'GET' && pathname.startsWith('/catalog/'))
  )
}
