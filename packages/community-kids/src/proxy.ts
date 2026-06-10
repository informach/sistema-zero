import { createMemberProxy } from '@sistemazero/member-shell/server/proxy'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/cookies'

/**
 * Gate de borda da plataforma kids — a LÓGICA vive no @sistemazero/member-shell
 * (`createMemberProxy`: anti-CSRF same-origin nas mutações `/api/*` + fast-path
 * de sessão + rotação do access expirado ANTES do render). Aqui ficam só a
 * config deste app e o `matcher` (literal estaticamente analisável pelo Next).
 * SEM `/compras` (não existe no kids — decisão da v1).
 */
export const proxy = createMemberProxy({
  cookies: { accessCookie: ACCESS_COOKIE, refreshCookie: REFRESH_COOKIE },
  protectedPrefixes: ['/cursos', '/perfil'],
  isRootProtected: true,
})

export const config = {
  // `api/me/avatar` fica FORA do matcher: o proxy buffeia o corpo (limite ~10MB)
  // e copiaria o multipart à toa; a rota tem guard próprio (sessão estrita + a
  // MESMA checagem anti-CSRF dentro do `requireUploadSession`).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/me/avatar).*)'],
}
