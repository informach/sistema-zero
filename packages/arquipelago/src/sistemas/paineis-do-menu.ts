/**
 * Os painéis que abrem dentro do menu de pausa, como seções dele (31/10/2026, pedido da dona: "todas
 * as opções do menu" no meio do menu, no estilo dele, com o menu à vista). Os valores são os de
 * `painelAberto` de cada painel; quem pede um deles abre o menu nessa seção.
 */
export const PAINEIS_DO_MENU: ReadonlySet<string> = new Set([
  'diario',
  'album',
  'caderno',
  'mapa',
  'convidados-da-casa',
  'visitas',
  'visitas-adultas',
])
