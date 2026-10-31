export interface PedidoDeMorador {
  id: string
  /** O texto curto do que ela pede (na tela). */
  texto: string
  /** Itens a entregar; ausente nos pedidos de achar um bicho. */
  itens?: Readonly<Record<string, number>>
  /**
   * Um prato pronto (§6.28, A22): o pedido só é sorteado depois que a criança sabe esta receita
   * (o morador ensinou). A entrega é a mesma de qualquer pedido.
   */
  receita?: string
}

/** O pedido da Capi (o nome de antes; o formato é o de qualquer morador). */
export type PedidoDaCapi = PedidoDeMorador

export const PEDIDOS_DA_CAPI: readonly PedidoDaCapi[] = [
  { id: 'alface-2', texto: 'Duas alfaces da horta', itens: { alface: 2 } },
  { id: 'tomate-2', texto: 'Dois tomates da horta', itens: { tomate: 2 } },
  { id: 'milho-1', texto: 'Um milho da horta', itens: { milho: 1 } },
  { id: 'salada-1', texto: 'Uma salada da horta', itens: { salada: 1 } },
  { id: 'pipoca-2', texto: 'Duas pipocas', itens: { pipoca: 2 } },
]

export const PEDIDOS_DO_BENTO: readonly PedidoDeMorador[] = [
  { id: 'milho-2', texto: 'Dois milhos da horta, para o fubá do bolo', itens: { milho: 2 } },
  { id: 'milho-1', texto: 'Um milho para provar uma receita', itens: { milho: 1 } },
  { id: 'pipoca-2', texto: 'Duas pipocas para a feira', itens: { pipoca: 2 } },
  { id: 'salada-1', texto: 'Uma salada para o almoço da padaria', itens: { salada: 1 } },
  { id: 'tomate-2', texto: 'Dois tomates para o molho do pão', itens: { tomate: 2 } },
  // Os pratos que ele ensinou (a proposta: "Pedido do Bento: bolo de fubá"; o pão de queijo "vende
  // bem na feira"). Só entram no sorteio depois da receita.
  {
    id: 'bolo-de-fuba-1',
    texto: 'Um bolo de fubá para a vitrine da padaria',
    itens: { 'bolo-de-fuba': 1 },
    receita: 'bolo-de-fuba',
  },
  {
    id: 'pao-de-queijo-3',
    texto: 'Três pães de queijo para o café da feira',
    itens: { 'pao-de-queijo': 3 },
    receita: 'pao-de-queijo',
  },
]

export const PEDIDOS_DO_ANEL = {
  mare: [
    { id: 'alface-2', texto: 'Duas alfaces para o lanche no cais', itens: { alface: 2 } },
    { id: 'tomate-2', texto: 'Dois tomates para levar no barco', itens: { tomate: 2 } },
    { id: 'milho-1', texto: 'Um milho para o almoço depois dos mapas', itens: { milho: 1 } },
  ],
  floco: [
    { id: 'milho-1', texto: 'Um milho para o intervalo do ensaio', itens: { milho: 1 } },
    { id: 'pipoca-1', texto: 'Uma pipoca para dividir no palco', itens: { pipoca: 1 } },
    { id: 'tomate-2', texto: 'Dois tomates para o almoço da banda', itens: { tomate: 2 } },
  ],
  jade: [
    { id: 'milho-1', texto: 'Um milho para o intervalo da pesquisa', itens: { milho: 1 } },
    { id: 'alface-2', texto: 'Duas alfaces para o almoço no Vale', itens: { alface: 2 } },
    { id: 'tomate-2', texto: 'Dois tomates para levar na caminhada', itens: { tomate: 2 } },
  ],
  irie: [
    { id: 'tomate-2', texto: 'Dois tomates para o lanche perto do tear', itens: { tomate: 2 } },
    { id: 'milho-1', texto: 'Um milho para o intervalo da tecelagem', itens: { milho: 1 } },
    { id: 'pipoca-1', texto: 'Uma pipoca para observar as nuvens', itens: { pipoca: 1 } },
  ],
} as const satisfies Record<string, readonly PedidoDeMorador[]>
