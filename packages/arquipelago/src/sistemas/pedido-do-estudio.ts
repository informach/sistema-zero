import type { DesafioNaLista, DesafiosDoJogador, IlhaId } from '@sistemazero/arquipelago-contracts'

/**
 * Os pedidos dos moradores no Estúdio (§6.28, A23; a proposta: "Dos moradores: pedidos curtos,
 * como uma placa que acende à noite"). O morador da ilha oferece o pedido na conversa; feito, a
 * placa ao lado dele acende à noite. A lista é a do serviço (`tipo: 'pedido-de-morador'`), que
 * nunca entra no Quadro das Cores nem no desafio do dia.
 */
export const TEXTOS_DO_PEDIDO_DO_ESTUDIO = {
  titulo: 'Pedido no Estúdio',
  fazer: 'Fazer no Estúdio',
  pronto: 'Pronto para fazer, é rapidinho.',
  feito: 'Pedido feito. A placa acende à noite.',
  refazer: 'Fazer de novo',
  naoAbriu: 'O Estúdio não abriu agora. Tente de novo daqui a pouco.',
  trancado: 'Abre quando você aprender o que ele pede.',
} as const

const daIlha = (dados: DesafiosDoJogador | null, ilha: IlhaId) =>
  (dados?.desafios ?? [])
    .filter((d) => d.tipo === 'pedido-de-morador' && d.ilha === ilha)
    .sort((a, b) => a.ordem - b.ordem)

/** O pedido que o morador oferece: o primeiro ainda não feito, ou o último feito. */
export function pedidoDoEstudio(
  dados: DesafiosDoJogador | null,
  ilha: IlhaId,
): DesafioNaLista | null {
  const lista = daIlha(dados, ilha)
  return lista.find((d) => d.situacao !== 'concluido') ?? lista.at(-1) ?? null
}

/** A placa acende à noite depois de algum pedido da ilha feito. */
export function placaDoPedidoAcesa(dados: DesafiosDoJogador | null, ilha: IlhaId): boolean {
  return daIlha(dados, ilha).some((d) => d.situacao === 'concluido')
}

/** A frase do cartão para a situação do pedido. */
export function estadoDoPedidoDoEstudio(d: DesafioNaLista): string {
  if (d.situacao === 'concluido') return TEXTOS_DO_PEDIDO_DO_ESTUDIO.feito
  if (d.situacao === 'disponivel') return TEXTOS_DO_PEDIDO_DO_ESTUDIO.pronto
  return TEXTOS_DO_PEDIDO_DO_ESTUDIO.trancado
}
