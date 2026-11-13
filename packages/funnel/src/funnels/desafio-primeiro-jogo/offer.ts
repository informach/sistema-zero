// A página de oferta do Desafio Kids é uma só desde 13/11/2026: `/oferta`, de 5 a 17 anos (abaixo de
// 9, com acompanhante). A "criar junto" do menor de 9 saiu, sem redirecionamento (decisão da dona). A
// adulta é outro funil (`pro/desafio-primeiro-jogo`, em `../desafio-adulto`).

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
