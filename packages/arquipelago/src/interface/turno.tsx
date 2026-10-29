import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoTurno, PAINEL_DO_TURNO, useTurno } from '../estado/turno'
import { diaDe } from '../sistemas/moradores'
import {
  BALCOES,
  falaDoPedido,
  jaPagouHoje,
  MAXIMO_NA_BANDEJA,
  pedidoDaVez,
  totalNaBandeja,
} from '../sistemas/turnos'

const ESTRELAS = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

/**
 * O turno num balcão da Vila Doce: o convite, o balcão (o freguês da vez, os produtos e a
 * bandeja) e o fim com as estrelas e o pagamento. O jogo fica parado enquanto ele está aberto.
 */
export function PainelDoTurno() {
  const { loja } = useJogo()
  const turnoDaLoja = lojaDoTurno(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_TURNO)
  const salvamento = useEstado((s) => s.salvamento)
  const posto = useTurno(turnoDaLoja, (s) => s.posto)
  const tela = useTurno(turnoDaLoja, (s) => s.tela)
  const turno = useTurno(turnoDaLoja, (s) => s.turno)
  const resposta = useTurno(turnoDaLoja, (s) => s.resposta)
  const fim = useTurno(turnoDaLoja, (s) => s.fim)
  const principal = useRef<HTMLButtonElement>(null)

  const passo = aberto ? `${tela}:${turno?.atual ?? 0}` : null
  useEffect(() => {
    if (passo) principal.current?.focus({ preventScroll: true })
  }, [passo])

  if (!aberto) return null
  const balcao = BALCOES[posto]
  const registro = salvamento.turnos[posto]
  const fechar = () => loja.getState().abrirPainel(null)
  const comecar = () => turnoDaLoja.getState().comecar(diaDe(new Date()), registro?.vezes ?? 0)

  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-turno"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-turno-titulo"
      >
        <h2 id="arq-turno-titulo">{balcao.titulo}</h2>

        {tela === 'convite' ? (
          <>
            <p className="arq-quadro-sub">{balcao.convite}</p>
            <p className="arq-turno-info">
              {jaPagouHoje(salvamento, posto, diaDe(new Date()))
                ? 'O turno de hoje já foi pago. Dá para fazer outro só pela diversão.'
                : 'O primeiro turno do dia é pago.'}
              {registro ? (
                <span>
                  {' '}
                  Melhor turno:{' '}
                  <b role="img" aria-label={`${registro.melhor} de 3 estrelas`}>
                    {ESTRELAS(registro.melhor)}
                  </b>
                </span>
              ) : null}
            </p>
            <div className="arq-menu-acoes">
              <button ref={principal} type="button" className="arq-botao" onClick={comecar}>
                Começar o turno
              </button>
              <button type="button" className="arq-botao leve" onClick={fechar}>
                Agora não
              </button>
            </div>
          </>
        ) : null}

        {tela === 'balcao' && turno ? <Balcao principal={principal} resposta={resposta} /> : null}

        {tela === 'fim' && fim ? (
          <>
            <p className="arq-turno-estrelas">
              <span role="img" aria-label={`${fim.estrelas} de 3 estrelas`}>
                {ESTRELAS(fim.estrelas)}
              </span>
            </p>
            <p className="arq-quadro-sub">
              {turno?.erros === 0
                ? 'Seis fregueses atendidos sem nenhum engano.'
                : `Seis fregueses atendidos, com ${turno?.erros} ${turno?.erros === 1 ? 'engano' : 'enganos'} no caminho.`}
            </p>
            <ul className="arq-turno-falas" aria-live="polite">
              {fim.falas.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="arq-menu-acoes">
              <button ref={principal} type="button" className="arq-botao" onClick={fechar}>
                Voltar ao jogo
              </button>
              <button type="button" className="arq-botao leve" onClick={comecar}>
                Outro turno
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function Balcao({
  principal,
  resposta,
}: {
  principal: React.RefObject<HTMLButtonElement | null>
  resposta: string | null
}) {
  const { loja } = useJogo()
  const turnoDaLoja = lojaDoTurno(loja)
  const turno = useTurno(turnoDaLoja, (s) => s.turno)
  if (!turno) return null
  const balcao = BALCOES[turno.posto]
  const pedido = pedidoDaVez(turno)
  const total = totalNaBandeja(turno)
  const naBandeja = balcao.produtos.filter((p) => (turno.bandeja[p.id] ?? 0) > 0)
  const t = turnoDaLoja.getState()
  return (
    <>
      <p className="arq-turno-info">
        Freguês {turno.atual + 1} de {turno.pedidos.length}
      </p>
      {resposta ? (
        <p className="arq-turno-resposta" aria-live="polite">
          {resposta}
        </p>
      ) : null}
      <div className="arq-turno-pedido" aria-live="polite">
        <b>{pedido?.quem}</b>
        <span>{falaDoPedido(turno)}</span>
      </div>
      <ul className="arq-turno-produtos" aria-label="O que tem no balcão">
        {balcao.produtos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="arq-botao leve"
              disabled={total >= MAXIMO_NA_BANDEJA}
              onClick={() => t.por(p.id)}
            >
              <span aria-hidden="true">{p.emoji}</span> {p.nome}
            </button>
          </li>
        ))}
      </ul>
      <div className="arq-turno-bandeja">
        <b>Na bandeja</b>
        {naBandeja.length === 0 ? (
          <span>Nada ainda.</span>
        ) : (
          <ul>
            {naBandeja.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="arq-turno-tirar"
                  aria-label={`Tirar da bandeja: ${p.nome} (${turno.bandeja[p.id]})`}
                  onClick={() => t.tirar(p.id)}
                >
                  <span aria-hidden="true">{p.emoji}</span> {turno.bandeja[p.id]}{' '}
                  <small>tirar</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="arq-menu-acoes">
        <button
          ref={principal}
          type="button"
          className="arq-botao"
          disabled={total === 0}
          onClick={() => t.entregar(diaDe(new Date()))}
        >
          Entregar
        </button>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Sair do turno
        </button>
      </div>
    </>
  )
}
