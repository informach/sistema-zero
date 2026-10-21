// As páginas de oferta do Desafio Kids (21/10/2026): `/oferta` é a de 9 a 17 anos e
// `/oferta/criar-junto` a do menor de 9, criando junto com um adulto. A adulta é outro funil
// (`pro/desafio-primeiro-jogo`, em `../desafio-adulto`).

export type DesafioPagina = '9a17' | 'criar-junto'

/** As subpáginas de `/oferta/<id>` (a de 9 a 17 é a própria `/oferta`). */
export const DESAFIO_SUBPAGINAS = ['criar-junto'] as const
export type DesafioSubpagina = (typeof DESAFIO_SUBPAGINAS)[number]

export function isDesafioSubpagina(value: unknown): value is DesafioSubpagina {
  return typeof value === 'string' && (DESAFIO_SUBPAGINAS as readonly string[]).includes(value)
}

/**
 * As variantes por motivo que existiram até 21/10/2026 (`primeiro-jogo` já era um apelido). Os links
 * antigos (resultado do quiz v3, anúncios, mensagens) chegam à página de 9 a 17 por redirecionamento
 * permanente, com a mesma query (atribuição e cupom).
 */
export const DESAFIO_OFERTAS_ANTIGAS = [
  'primeiro-jogo',
  'tempo-de-tela',
  'iniciacao-tecnologica',
] as const

export function isDesafioOfertaAntiga(value: unknown): boolean {
  return typeof value === 'string' && (DESAFIO_OFERTAS_ANTIGAS as readonly string[]).includes(value)
}
