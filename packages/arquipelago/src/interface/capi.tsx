import { type CSSProperties, useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaConversa, PAINEL_DA_CAPI, useConversa } from '../estado/moradores'
import {
  entregar,
  FALA_DA_ENTREGA,
  oQueFaltaNoPedido,
  pedidoDeHoje,
  presentear,
} from '../sistemas/conversa-da-capi'
import { itensVisiveis } from '../sistemas/itens'
import { AMIZADE, coracoes, diaDe } from '../sistemas/moradores'

const CORACOES = 5

function Coracoes({ amizade }: { amizade: number }) {
  const cheios = coracoes(amizade)
  return (
    <span className="arq-capi-coracoes" role="img" aria-label={`Amizade: ${cheios} de 5 corações`}>
      {Array.from({ length: CORACOES }, (_, i) => {
        // O coração que está enchendo mostra o quanto já encheu.
        const parte = Math.max(
          0,
          Math.min(1, (amizade - i * AMIZADE.porCoracao) / AMIZADE.porCoracao),
        )
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: os cinco corações são fixos e na ordem
            key={i}
            aria-hidden="true"
            style={{ '--cheio': `${Math.round(parte * 100)}%` } as CSSProperties}
          >
            ♥
          </span>
        )
      })}
    </span>
  )
}

/**
 * A conversa com a Capi, embaixo da tela como nos jogos de conversa: o nome e os corações, uma
 * fala por vez ("Continuar") e depois as escolhas (entregar o pedido do dia, dar um presente,
 * tchau). O jogo fica parado enquanto ela está aberta.
 */
export function PainelDaCapi() {
  const { loja } = useJogo()
  const conversa = lojaDaConversa(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_CAPI)
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
  const pedido = pedidoDeHoje(salvamento, dia)
  const falta = oQueFaltaNoPedido(salvamento)
  const entregueHoje =
    salvamento.moradores.capi.pedido?.dia === dia && salvamento.moradores.capi.pedido.entregue
  const fechar = () => loja.getState().abrirPainel(null)

  function aoEntregar() {
    const s = loja.getState()
    const r = entregar(s.salvamento)
    if (!r.entregou) return
    s.mudar(() => r.salvamento)
    conversa.getState().responder(FALA_DA_ENTREGA, true)
  }

  function aoPresentear(itemId: string) {
    const s = loja.getState()
    const r = presentear(s.salvamento, itemId, diaDe(new Date()))
    s.mudar(() => r.salvamento)
    conversa.getState().responder(r.fala, r.reacao === 'adorou' || r.reacao === 'agradeceu')
  }

  return (
    <div className="arq-capi" role="dialog" aria-modal="true" aria-labelledby="arq-capi-nome">
      <div className="arq-capi-topo">
        <h2 id="arq-capi-nome">Capi</h2>
        <Coracoes amizade={salvamento.moradores.capi.amizade} />
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
              <span>Amanhã ela pede outra coisa.</span>
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
              Tchau, Capi
            </button>
          </div>
        </>
      ) : null}

      {tela === 'presente' ? <Presentes aoEscolher={aoPresentear} principal={principal} /> : null}
    </div>
  )
}

function Presentes({
  aoEscolher,
  principal,
}: {
  aoEscolher: (itemId: string) => void
  principal: React.RefObject<HTMLButtonElement | null>
}) {
  const { loja } = useJogo()
  const inventario = useEstado((s) => s.salvamento.inventario)
  const itens = itensVisiveis(inventario)
  const voltar = () => lojaDaConversa(loja).getState().voltarAsEscolhas()
  return (
    <>
      <p className="arq-capi-fala">
        {itens.length > 0
          ? 'Escolha um presente para a Capi. Comida da horta é o que ela mais gosta.'
          : 'A sua mochila está vazia. A horta da sua ilha dá alface, tomate e milho.'}
      </p>
      {itens.length > 0 ? (
        <ul className="arq-capi-itens">
          {itens.map(({ item, qtd }) => (
            <li key={item.id}>
              <button type="button" className="arq-botao leve" onClick={() => aoEscolher(item.id)}>
                <span aria-hidden="true">{item.emoji}</span> {item.nome}{' '}
                <span className="arq-capi-qtd">{`x${qtd}`}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="arq-menu-acoes">
        <button ref={principal} type="button" className="arq-botao leve" onClick={voltar}>
          Voltar
        </button>
      </div>
    </>
  )
}
