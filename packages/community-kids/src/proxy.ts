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
  // `/perfis` (grade estilo Netflix) exige sessão (conta OU perfil), mas é a rota
  // de SELEÇÃO — isenta do gate de perfil abaixo.
  protectedPrefixes: [
    '/cursos',
    '/perfil',
    '/quarto',
    '/crianca',
    '/clube-dos-criadores',
    '/mural-dos-criadores',
    '/estudio',
    '/perfis',
  ],
  isRootProtected: true,
  // Conta logada SEM perfil selecionado (token sem `pfl`) → escolher um perfil
  // antes de entrar na área de aprender (estilo Netflix).
  requireProfileSelectPath: '/perfis',
})

export const config = {
  // `api/me/avatar`, o upload de imagem do hub (`api/hub/uploads/image`) e a FOTO
  // DO PERFIL (`api/profiles/:id/avatar`) ficam FORA do matcher: são multipart e o
  // proxy copiaria o corpo à toa; todas têm guard próprio (sessão estrita + a MESMA
  // checagem anti-CSRF dentro do `requireUploadSession`). Idem `api/studio/publish`
  // (multipart: print + projeto inteiro) e `api/studio/play/:id` (PÚBLICA: stream do
  // JSON do projeto — fora do buffer do proxy e sem gate de sessão). O prefixo
  // `api/studio/publish` no negative-lookahead também isenta `api/studio/publish-standalone`
  // (o "Compartilhar" do Estúdio Completo, multipart, com `requireUploadSession` próprio).
  // `api/studio/describe` FICA no matcher (JSON pequeno: ganha o anti-CSRF same-origin do proxy).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/me/avatar|api/hub/uploads/image|api/hub/showcase|api/studio/publish|api/studio/play|api/profiles/[^/]+/avatar).*)',
  ],
}
