/**
 * Rotas em que um app inteiro ocupa a área útil — largura E altura totais, sem cabeçalho do
 * host: os quatro apps de criação embarcados (Estúdio, Pensa, Pinta e Molda) e o configurador
 * de avatar. Ganham tratamento próprio no `MainContainer` (altura travada na janela, borda a
 * borda) e começam com o menu lateral recolhido pelo `FocusModeProvider`. O botão de
 * mostrar/esconder fica na barra do próprio app.
 *
 * ⚠️ `/meu-avatar` entrou em 19/09/2026, quando ele saiu da tela cheia solta (fora do grupo
 * `(app)`, sem sidebar nenhuma) e passou a viver dentro do layout, como as ferramentas.
 *
 * ⚠️⚠️ Esta lista NÃO é "onde o menu começa recolhido" — é "onde a altura é travada". A régua
 * do foco é o `isFocusRoutePath` (`lib/focus-route.ts`), que soma a aula e as telas de foco de
 * altura livre, como o Quarto. Pôr aqui uma tela que ROLA corta o conteúdo dela.
 */
export const EMBEDDED_APP_PREFIXES = [
  '/estudio',
  '/pensa',
  '/pinta',
  '/molda',
  '/meu-avatar',
] as const

/**
 * `true` nas rotas dos apps embarcados, INCLUSIVE sub-rotas (`/estudio/pro/<id>`).
 * Tolera `null`/`undefined` (SSR/1º render), como o `isLessonPath`.
 *
 * ⚠️ Compara o segmento INTEIRO (`=== prefixo` ou `prefixo + '/'`), não um
 * `startsWith` cru: `/estudiozinho` não é o Estúdio.
 */
export function isEmbeddedAppPath(pathname: string | null | undefined): boolean {
  const path = pathname ?? ''
  return EMBEDDED_APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
