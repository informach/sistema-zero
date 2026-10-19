import { createMemberProxy } from '@sistemazero/member-shell/server/proxy'
import { ACCESS_COOKIE, PALETTE_COOKIE, REFRESH_COOKIE } from '@/lib/cookies'

/**
 * Gate de borda da área do aluno (convenção `proxy` do Next 16) — a LÓGICA vive
 * no @sistemazero/member-shell (`createMemberProxy`: anti-CSRF same-origin nas
 * mutações `/api/*` + fast-path de sessão + rotação do access expirado ANTES do
 * render). Aqui ficam só a config deste app e o `matcher` (precisa ser literal
 * estaticamente analisável pelo Next). A HOME é a própria raiz `/` (sem rota
 * `/home`); o gate real é o layout do grupo `(app)`.
 */
export const proxy = createMemberProxy({
  cookies: { accessCookie: ACCESS_COOKIE, refreshCookie: REFRESH_COOKIE },
  paletteCookie: PALETTE_COOKIE,
  // `/oficinas`: as oficinas ao vivo (cursos ao vivo, 14/10/2026) e a sala de cada encontro.
  protectedPrefixes: [
    '/cursos',
    '/oficinas',
    '/perfil',
    '/compras',
    '/comunidade',
    '/ajuda',
    '/progresso',
    '/ranking',
    '/mural-dos-criadores-adulto',
    '/meu-avatar',
    '/quarto',
    '/desafios',
    '/criador',
    '/criar',
    '/estudio',
    '/pinta',
    '/molda',
    '/pensa',
    '/como-fazer',
  ],
  isRootProtected: true,
  // A ajuda de quem não consegue entrar mora debaixo do `/ajuda` logado e é pública.
  publicPaths: ['/ajuda/entrar'],
})

export const config = {
  // `api/me/avatar` e o upload de imagem do hub (`api/hub/uploads/image`) ficam
  // FORA do matcher: são multipart e o proxy copiaria o corpo à toa; ambas as
  // rotas têm guard próprio (sessão estrita + a MESMA checagem anti-CSRF dentro
  // do `requireUploadSession`). `api/certificates` (validação PÚBLICA por QR, sem
  // login) também fica de fora — sem gate de sessão.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/me/avatar|api/members/avatar/snapshot|api/studio/play|api/studio/publish|api/studio/cleanup|api/studio/reservation-cleanup|api/internal/studio-play|api/internal/studio-publication-cleanup|api/internal/studio-builder/execute|api/hub/uploads/image|api/certificates).*)',
  ],
}
