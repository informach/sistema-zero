/**
 * Oferta de continuidade da Comunidade dos Criadores ADULTA (página pública do funil). Constante de
 * produção, como o `COMUNIDADE_OFERTA_URL` do Kids (`community-kids/src/lib/links.ts`): o
 * `FUNNEL_URL` do env aponta para outro funil e não serve de base para esta página.
 */
export const COMUNIDADE_ADULTO_CONTINUAR_URL =
  'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar'

/**
 * A oferta de continuidade com a origem do clique (`utm_content`), para o funil saber de que tela
 * do app a pessoa veio (ex.: `ferramenta-pinta`, `cursos-nci`, `curso-bloqueado`).
 */
export function comunidadeAdultoContinuarUrl(origem: string): string {
  const url = new URL(COMUNIDADE_ADULTO_CONTINUAR_URL)
  url.searchParams.set('utm_source', 'plataforma')
  url.searchParams.set('utm_medium', 'app')
  url.searchParams.set('utm_content', origem)
  return url.href
}
