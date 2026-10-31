import type { Companhia } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { lojaDoBicho, PAINEL_DO_BICHO, useBicho } from '../estado/bicho'
import { useEstado, useJogo } from '../estado/contexto'
import {
  CUIDADO,
  EMOJI_DO_BICHO,
  falaDaTroca,
  NOME_DO_BICHO,
  TRUQUE,
  tristinho,
  trocarBicho,
} from '../sistemas/bichos'
import {
  escolherCompanhia,
  falaDaCompanhia,
  opcoesDeCompanhia,
  podeEscolherCompanhia,
  quemAcompanha,
  rotuloDaCompanhia,
} from '../sistemas/companhia'
import { type Cuidado, cuidar } from '../sistemas/cuidar'
import { ITENS, itensVisiveis } from '../sistemas/itens'
import { diaDe } from '../sistemas/moradores'

/** Até esta distância da borda do lago (m) dá para dar banho. */
const PERTO_DA_AGUA = 2.5

const MEDIDAS = [
  { chave: 'fome', rotulo: 'Barriga', cor: '#e8774f' },
  { chave: 'limpeza', rotulo: 'Limpeza', cor: '#3f9fe0' },
  { chave: 'carinho', rotulo: 'Carinho', cor: '#e2475f' },
] as const

/**
 * Cuidar do bicho adotado, na caixa de baixo como a conversa com a Capi: o nome, as três medidas,
 * a última fala e os cuidados (comida da mochila, banho perto da água ou em casa, carinho, a aula
 * do truque uma vez por dia e pedir o truque depois de aprendido). O jogo fica parado enquanto ela
 * está aberta, e o Esc fecha.
 */
export function PainelDoBicho() {
  const { loja, rastro, movimento } = useJogo()
  const bicho = lojaDoBicho(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_BICHO)
  const adotado = useEstado((s) => s.salvamento.bichos.adotado)
  const outros = useEstado((s) => s.salvamento.bichos.outros)
  const dentroDeCasa = useEstado((s) => s.dentroDeCasa)
  const pet = useEstado((s) => s.quarto.pet)
  const escolhe = useEstado((s) => podeEscolherCompanhia(s.salvamento, s.quarto.pet))
  const acompanha = useEstado((s) => quemAcompanha(s.salvamento, s.quarto.pet))
  const opcoes = useEstado((s) => opcoesDeCompanhia(s.salvamento, s.quarto.pet).join(','))
    .split(',')
    .filter((c): c is Companhia => c === 'adotado' || c === 'quarto' || c === 'filhote')
  const nomeDoFilhote = useEstado((s) => s.salvamento.vale.filhote?.nome ?? null)
  const falas = useBicho(bicho, (s) => s.falas)
  const tela = useBicho(bicho, (s) => s.tela)
  const principal = useRef<HTMLButtonElement>(null)

  const passo = aberto ? tela : null
  useEffect(() => {
    if (passo) principal.current?.focus()
  }, [passo])

  if (!aberto || !adotado) return null
  const nome = adotado.nome
  const nomes = { adotado: nome, pet, filhote: nomeDoFilhote }
  const pertoDaAgua = movimento.aguas.some(
    (a) => Math.hypot(rastro.x - a.x, rastro.z - a.z) < Math.max(a.raioX, a.raioZ) + PERTO_DA_AGUA,
  )
  const podeBanho = dentroDeCasa || pertoDaAgua
  const fechar = () => loja.getState().abrirPainel(null)

  function aoCuidar(c: Cuidado) {
    const s = loja.getState()
    const r = cuidar(s.salvamento, c, diaDe(new Date()))
    if (r.salvamento !== s.salvamento) s.mudar(() => r.salvamento)
    bicho.getState().responder(r.falas, r.reacao)
  }

  const aulas = adotado.truque.aprendido
    ? null
    : `${adotado.truque.sessoes} de ${CUIDADO.sessoesDoTruque} aulas`

  return (
    <div
      className="arq-capi arq-bicho"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arq-bicho-nome"
    >
      <div className="arq-capi-topo">
        <h2 id="arq-bicho-nome">
          <span aria-hidden="true">{EMOJI_DO_BICHO[adotado.id]}</span> {nome}
        </h2>
        <span className="arq-bicho-fase">
          {`${NOME_DO_BICHO[adotado.id]}, ${adotado.fase === 'adulto' ? 'adulto' : 'filhote'}`}
        </span>
      </div>

      <dl className="arq-bicho-medidas">
        {MEDIDAS.map((m) => {
          const valor = Math.round(adotado[m.chave])
          return (
            <div key={m.chave}>
              <dt>{m.rotulo}</dt>
              <dd>
                <span className="arq-barra" aria-hidden="true">
                  <i style={{ width: `${valor}%`, background: m.cor }} />
                </span>
                <span className="arq-sr">{`${valor} de 100`}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      {outros.length > 0 ? (
        <section className="arq-bicho-outros" aria-label="Os outros bichos adotados">
          <p className="arq-quadro-sub">
            {outros.map((b) => b.nome).join(' e ')} {outros.length > 1 ? 'esperam' : 'espera'} no
            cercadinho do Bosque.
          </p>
          <div className="arq-menu-acoes">
            {outros.map((b) => (
              <button
                key={b.id}
                type="button"
                className="arq-botao leve"
                onClick={() => {
                  const s = loja.getState()
                  s.mudar((sv) => ({ ...sv, bichos: trocarBicho(sv.bichos, b.id) }))
                  s.dizer(falaDaTroca(b.nome, nome))
                }}
              >
                Levar {b.nome}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <p className="arq-capi-fala" aria-live="polite">
        {falas.length > 0
          ? falas.join(' ')
          : tristinho(adotado)
            ? `${nome} está meio triste. Comida, banho e carinho deixam o dia melhor.`
            : `${nome} balança de contente perto de você.`}
      </p>

      {tela === 'cuidar' ? (
        <>
          <div className="arq-menu-acoes arq-bicho-acoes">
            <button
              ref={principal}
              type="button"
              className="arq-botao leve"
              onClick={() => bicho.getState().escolherComida()}
            >
              Dar comida
            </button>
            <button
              type="button"
              className="arq-botao leve"
              disabled={!podeBanho}
              aria-describedby={podeBanho ? undefined : 'arq-bicho-banho'}
              onClick={() => aoCuidar({ tipo: 'banho' })}
            >
              Dar banho
            </button>
            <button
              type="button"
              className="arq-botao leve"
              onClick={() => aoCuidar({ tipo: 'carinho' })}
            >
              Fazer carinho
            </button>
            {adotado.truque.aprendido ? (
              <button
                type="button"
                className="arq-botao leve"
                onClick={() => aoCuidar({ tipo: 'truque' })}
              >
                {`Pedir para ${TRUQUE[adotado.id]}`}
              </button>
            ) : (
              <button
                type="button"
                className="arq-botao leve"
                onClick={() => aoCuidar({ tipo: 'ensinar' })}
              >
                Ensinar o truque
              </button>
            )}
          </div>
          {podeBanho ? null : (
            <p id="arq-bicho-banho" className="arq-capi-falta">
              O banho é perto do lago do Bosque ou dentro de casa.
            </p>
          )}
          {escolhe ? (
            <fieldset className="arq-bicho-companhia">
              <legend>Quem vai com você pela ilha</legend>
              {opcoes.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="arq-botao leve"
                  aria-pressed={acompanha === c}
                  onClick={() => {
                    const s = loja.getState()
                    if (s.salvamento.companhia !== c) s.mudar((v) => escolherCompanhia(v, c))
                    bicho.getState().responder([falaDaCompanhia(c, nomes)], null)
                  }}
                >
                  {rotuloDaCompanhia(c, nomes)}
                </button>
              ))}
            </fieldset>
          ) : null}
          <div className="arq-bicho-rodape">
            {aulas ? <span className="arq-bicho-fase">{`Truque: ${aulas}`}</span> : <span />}
            <button type="button" className="arq-botao leve" onClick={fechar}>
              Voltar ao jogo
            </button>
          </div>
        </>
      ) : (
        <Comidas
          aoEscolher={(itemId) => aoCuidar({ tipo: 'comida', itemId })}
          principal={principal}
        />
      )}
    </div>
  )
}

function Comidas({
  aoEscolher,
  principal,
}: {
  aoEscolher: (itemId: string) => void
  principal: React.RefObject<HTMLButtonElement | null>
}) {
  const { loja } = useJogo()
  const inventario = useEstado((s) => s.salvamento.inventario)
  const comidas = itensVisiveis(inventario).filter(({ item }) => ITENS[item.id]?.comida)
  return (
    <>
      {comidas.length > 0 ? (
        <ul className="arq-capi-itens">
          {comidas.map(({ item, qtd }) => (
            <li key={item.id}>
              <button type="button" className="arq-botao leve" onClick={() => aoEscolher(item.id)}>
                <span aria-hidden="true">{item.emoji}</span> {item.nome}{' '}
                <span className="arq-capi-qtd">{`x${qtd}`}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="arq-capi-falta">
          A mochila está sem comida. A horta dá alface, tomate e milho.
        </p>
      )}
      <div className="arq-menu-acoes">
        <button
          ref={principal}
          type="button"
          className="arq-botao leve"
          onClick={() => lojaDoBicho(loja).getState().voltar()}
        >
          Voltar
        </button>
      </div>
    </>
  )
}
