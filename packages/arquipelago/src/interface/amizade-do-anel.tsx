import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaConversa, useConversa } from '../estado/moradores'
import { entregarNoAnel, pedidoDoAnel, presentearNoAnel } from '../sistemas/amizade-do-anel'
import { diaDe, oQueFaltaDosItens } from '../sistemas/moradores'
import { type MoradorDoAnel, VIDA_NO_ANEL } from '../sistemas/moradores-do-anel'
import { salvamentoPausado } from '../sistemas/pausa'
import { Coracoes, Presentes } from './capi'
import { entregarPedidoPeloPainel } from './entrega-do-pedido'
import { PedidoDoEstudio } from './pedido-do-estudio'

/** Mesma conversa do mundo, agora com amizade, presentes e pedidos reais. */
export function PainelDeAmizadeDoAnel({ quem, painel }: { quem: MoradorDoAnel; painel: string }) {
  const contexto = useJogo()
  const { loja } = contexto
  const conversa = lojaDaConversa(loja, quem)
  const aberto = useEstado((s) => s.painelAberto === painel)
  const salvamento = useEstado((s) => s.salvamento)
  const podeAgir = useEstado(
    (s) =>
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !salvamentoPausado(s.salvamentoSituacao) &&
      !s.tempoAcabou &&
      !s.tempoSincronizando &&
      !s.tempoPausado,
  )
  const falas = useConversa(conversa, (s) => s.falas)
  const indice = useConversa(conversa, (s) => s.indice)
  const tela = useConversa(conversa, (s) => s.tela)
  const principal = useRef<HTMLButtonElement>(null)
  const passo = aberto ? `${tela}:${indice}` : null
  useEffect(() => {
    if (passo) principal.current?.focus()
  }, [passo])
  if (!aberto) return null
  const dados = VIDA_NO_ANEL[quem]
  const pedido = pedidoDoAnel(salvamento, quem, diaDe(new Date()))
  const falta = pedido ? oQueFaltaDosItens(pedido, salvamento.inventario) : null
  const titulo = `arq-${quem}-nome`

  function agir(item?: string) {
    if (item === undefined) {
      void entregarPedidoPeloPainel(contexto, quem, painel, (s) =>
        entregarNoAnel(s, quem, diaDe(new Date())),
      )
      return
    }
    const s = loja.getState()
    if (
      s.acesso.somenteLeitura ||
      s.visita ||
      salvamentoPausado(s.salvamentoSituacao) ||
      s.tempoAcabou ||
      s.tempoSincronizando ||
      s.tempoPausado ||
      s.painelAberto !== painel
    )
      return
    const dia = diaDe(new Date())
    const r = presentearNoAnel(s.salvamento, quem, item, dia)
    s.mudar(() => r.salvamento)
    if (loja.getState().salvamento !== r.salvamento) return
    conversa.getState().responder(r.falas, r.salvamento !== s.salvamento)
  }

  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby={titulo}>
      <div className="arq-capi-topo">
        <h2 id={titulo}>{dados.nome}</h2>
        <Coracoes amizade={salvamento.moradores[quem].amizade} />
      </div>
      {tela === 'falas' && (
        <>
          <p className="arq-capi-fala" aria-live="polite">
            {falas[indice] ?? ''}
          </p>
          <div className="arq-menu-acoes">
            <button
              ref={principal}
              type="button"
              className="arq-botao"
              onClick={() => conversa.getState().avancar()}
            >
              Continuar
            </button>
          </div>
        </>
      )}
      {tela === 'escolhas' && (
        <>
          {pedido ? (
            <div className="arq-capi-pedido">
              <b>Pedido de hoje</b>
              <span>{pedido.texto}</span>
              {falta && <span className="arq-capi-falta">{falta}</span>}
            </div>
          ) : (
            salvamento.moradores[quem].pedido?.dia === diaDe(new Date()) && (
              <div className="arq-capi-pedido feito">
                <b>Pedido de hoje entregue</b>
                <span>Outro pedido chega amanhã.</span>
              </div>
            )
          )}
          <PedidoDoEstudio quem={quem} />
          <div className="arq-menu-acoes">
            {pedido && !falta && (
              <button
                ref={principal}
                type="button"
                className="arq-botao"
                disabled={!podeAgir}
                onClick={() => agir()}
              >
                Entregar o pedido
              </button>
            )}
            <button
              ref={pedido && !falta ? undefined : principal}
              type="button"
              className="arq-botao leve"
              disabled={!podeAgir}
              onClick={() => conversa.getState().escolherPresente()}
            >
              Dar um presente
            </button>
            <button
              type="button"
              className="arq-botao leve"
              onClick={() => loja.getState().abrirPainel(null)}
            >
              Tchau, {dados.nome}
            </button>
          </div>
        </>
      )}
      {tela === 'presente' && (
        <Presentes
          convite={dados.convite}
          aoEscolher={agir}
          aoVoltar={() => conversa.getState().voltarAsEscolhas()}
          principal={principal}
        />
      )}
    </div>
  )
}
