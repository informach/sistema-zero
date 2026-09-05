/**
 * Rotas dos apps de criação embarcados (Estúdio, Pensa, Pinta e Molda). São as
 * telas em que um app inteiro ocupa a área útil — largura E altura totais, sem
 * cabeçalho do host — e por isso ganham tratamento próprio no `MainContainer` e o
 * puxador que esconde o menu lateral (`FocusModeToggle` na variante `edge`).
 */
export const EMBEDDED_APP_PREFIXES = ['/estudio', '/pensa', '/pinta', '/molda'] as const

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
