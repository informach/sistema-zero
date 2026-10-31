import type { MoradorDoPedido, Salvamento } from '@sistemazero/arquipelago-contracts'
import type { ContextoDoJogo } from '../estado/contexto'
import { lojaDaGaleria } from '../estado/galeria'
import { lojaDaConversa } from '../estado/moradores'
import { salvamentoPausado } from '../sistemas/pausa'
import { FALA_DO_TETO } from '../sistemas/teto-semanal'

/** Prévia só produz falas. Quem consome e concede amizade/cesta é o serviço pela fila. */
export async function entregarPedidoPeloPainel(
  contexto: Pick<ContextoDoJogo, 'loja' | 'fila' | 'plataforma'>,
  morador: MoradorDoPedido,
  painel: string,
  previa: (s: Salvamento) => { entregou: boolean; falas: string[] },
) {
  const { loja, fila, plataforma } = contexto
  const s = loja.getState()
  if (
    !fila ||
    s.painelAberto !== painel ||
    s.acesso.somenteLeitura ||
    s.visita ||
    s.tempoAcabou ||
    s.tempoPausado ||
    s.tempoSincronizando ||
    salvamentoPausado(s.salvamentoSituacao)
  )
    return
  const r = previa(s.salvamento)
  const conversa = lojaDaConversa(loja, morador)
  if (!r.entregou) {
    if (r.falas.length) conversa.getState().responder(r.falas, false)
    return
  }
  try {
    const confirmado = await fila.entregarPedido(morador)
    const atual = loja.getState()
    if (
      atual.painelAberto !== painel ||
      salvamentoPausado(atual.salvamentoSituacao) ||
      atual.acesso.somenteLeitura ||
      atual.visita ||
      atual.tempoAcabou ||
      atual.tempoPausado
    )
      return
    const premio =
      confirmado.pagamento === 'creditado'
        ? `Você ganhou ${confirmado.moedas} moedas por ajudar.`
        : confirmado.pagamento === 'teto'
          ? FALA_DO_TETO
          : confirmado.pagamento === 'recusado'
            ? 'Seu pedido foi entregue, mas não foi possível confirmar as moedas. Peça ajuda à equipe.'
            : 'Seu pedido foi entregue. As moedas ainda aguardam confirmação.'
    // O recibo é informativo. A retomada do relógio pode continuar em voo, com as
    // ações bloqueadas pelo painel. Nunca reabrir uma conversa que já foi fechada.
    conversa.getState().responder([...r.falas, premio], true)
    await lojaDaGaleria(loja, plataforma).getState().carregar()
  } catch (erro) {
    loja.getState().dizer(erro instanceof Error ? erro.message : 'A entrega aguarda confirmação.')
    plataforma.relatarErro(erro, 'entregar-pedido')
  }
}
