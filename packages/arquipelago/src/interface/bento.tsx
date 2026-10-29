import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaConversa, PAINEL_DO_BENTO, useConversa } from '../estado/moradores'
import {
  entregarAoBento,
  oQueFaltaAoBento,
  pedidoDoBentoDeHoje,
  presentearOBento,
} from '../sistemas/conversa-do-bento'
import { diaDe } from '../sistemas/moradores'
import { Coracoes, Presentes } from './capi'

/**
 * A conversa com o Bento, como a da Capi: o nome e os corações, uma fala por vez e depois as
 * escolhas (entregar o pedido do dia, dar um presente, tchau). O jogo fica parado enquanto ela
 * está aberta.
 */
export function PainelDoBento() {
  const { loja } = useJogo()
  const conversa = lojaDaConversa(loja, 'bento')
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_BENTO)
  const salvamento = useEstado((s) => s.salvamento)
  const falas = useConversa(conversa, (s) => s.falas)
  const indice = useConversa(conversa, (s) => s.indice)
  const tela = useConversa(conversa, (s) => s.tela)
  const principal = useRef<HTMLButtonElement>(null)

  // O foco vai para o botão principal de cada passo (Enter ou espaço seguem a conversa).
  const passo = aberto ? `${tela}:${indice}` : null
  useEffect(() => {
    if (passo) principal.current?.focus()
  }, [passo])

  if (!aberto) return null
  const dia = diaDe(new Date())
  const pedido = pedidoDoBentoDeHoje(salvamento, dia)
  const falta = oQueFaltaAoBento(salvamento, dia)
  const p = salvamento.moradores.bento.pedido
  const entregueHoje = p?.dia === dia && p.entregue
  const fechar = () => loja.getState().abrirPainel(null)

  function aoEntregar() {
    const s = loja.getState()
    const r = entregarAoBento(s.salvamento, diaDe(new Date()))
    if (!r.entregou) return
    s.mudar(() => r.salvamento)
    conversa.getState().responder(r.falas, true)
  }

  function aoPresentear(itemId: string) {
    const s = loja.getState()
    const r = presentearOBento(s.salvamento, itemId, diaDe(new Date()))
    s.mudar(() => r.salvamento)
    conversa.getState().responder(r.falas, r.reacao === 'adorou' || r.reacao === 'agradeceu')
  }

  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby="arq-bento-nome">
      <div className="arq-capi-topo">
        <h2 id="arq-bento-nome">Bento</h2>
        <Coracoes amizade={salvamento.moradores.bento.amizade} />
      </div>

      {tela === 'falas' ? (
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
      ) : null}

      {tela === 'escolhas' ? (
        <>
          {pedido ? (
            <div className="arq-capi-pedido">
              <b>Pedido de hoje</b>
              <span>{pedido}</span>
              {falta ? <span className="arq-capi-falta">{falta}</span> : null}
            </div>
          ) : entregueHoje ? (
            <div className="arq-capi-pedido feito">
              <b>Pedido de hoje entregue</b>
              <span>Amanhã ele pede outra coisa.</span>
            </div>
          ) : null}
          <div className="arq-menu-acoes">
            {pedido && !falta ? (
              <button ref={principal} type="button" className="arq-botao" onClick={aoEntregar}>
                Entregar o pedido
              </button>
            ) : null}
            <button
              ref={pedido && !falta ? undefined : principal}
              type="button"
              className="arq-botao leve"
              onClick={() => conversa.getState().escolherPresente()}
            >
              Dar um presente
            </button>
            <button type="button" className="arq-botao leve" onClick={fechar}>
              Tchau, Bento
            </button>
          </div>
        </>
      ) : null}

      {tela === 'presente' ? (
        <Presentes
          convite="Escolha um presente para o Bento. Milho e pipoca são os preferidos dele."
          aoEscolher={aoPresentear}
          aoVoltar={() => conversa.getState().voltarAsEscolhas()}
          principal={principal}
        />
      ) : null}
    </div>
  )
}
