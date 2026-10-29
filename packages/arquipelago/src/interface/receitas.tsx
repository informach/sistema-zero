import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { festaAtual } from '../estado/festas'
import { ITENS, quantidade } from '../sistemas/itens'
import { coracoes } from '../sistemas/moradores'
import {
  fazerReceita,
  type LugarDaReceita,
  PAINEL_DA_BANCADA,
  RECEITAS,
  type Receita,
  receitasConhecidas,
} from '../sistemas/receitas'

/** Fazer a receita na loja do jogo (o Zappy conta o que saiu). */
export function fazerNaLoja(loja: ReturnType<typeof useJogo>['loja'], r: Receita): void {
  const s = loja.getState()
  const feito = fazerReceita(s.salvamento, r)
  if (!feito) return
  s.mudar(() => feito.salvamento)
  s.dizer(feito.fala)
}

const nome = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

/** O que falta de uma receita, ou `null` se já dá para fazer. */
function oQueFalta(inv: Record<string, number>, r: Receita): string | null {
  const faltam = Object.entries(r.precisa)
    .filter(([id, q]) => quantidade(inv, id) < q)
    .map(([id, q]) => `${q - quantidade(inv, id)} ${nome(id)}`)
  return faltam.length > 0 ? `Falta ${faltam.join(', ')}.` : null
}

/**
 * As receitas de um lugar (o forno ou a bancada): as que ela sabe, com o que cada uma precisa e o
 * botão de fazer, e quantas o Bento ainda vai lembrar.
 */
export function ListaDeReceitas({ onde }: { onde: LugarDaReceita }) {
  const { loja, plataforma } = useJogo()
  const inventario = useEstado((s) => s.salvamento.inventario)
  const amizade = useEstado((s) => s.salvamento.moradores.bento.amizade)
  const sabidas = receitasConhecidas(coracoes(amizade)).filter((r) => r.onde === onde)
  const faltam = RECEITAS.filter((r) => r.onde === onde).length - sabidas.length
  return (
    <section className="arq-receitas" aria-label={onde === 'forno' ? 'Assar no forno' : 'Cozinhar'}>
      <h3 className="arq-menu-titulo">{onde === 'forno' ? 'Assar' : 'Receitas'}</h3>
      {sabidas.length === 0 ? (
        <p className="arq-caderno-explica">
          O Bento, da padaria da Vila Doce, ainda está lembrando as receitas do forno.
        </p>
      ) : (
        <ul className="arq-objeto-itens">
          {sabidas.map((r) => {
            const falta = oQueFalta(inventario, r)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className="arq-botao leve"
                  disabled={falta !== null}
                  onClick={() => {
                    if (onde === 'fogueira' && festaAtual(plataforma) !== 'junina') return
                    fazerNaLoja(loja, r)
                  }}
                >
                  {`${ITENS[r.faz.id]?.emoji ?? ''} ${r.nome}: ${Object.entries(r.precisa)
                    .map(([id, q]) => `${q} ${nome(id)}`)
                    .join(', ')}`}
                </button>
                {falta ? <small className="arq-receitas-falta">{falta}</small> : null}
              </li>
            )
          })}
        </ul>
      )}
      {faltam > 0 && sabidas.length > 0 ? (
        <p className="arq-caderno-explica">
          {faltam === 1
            ? 'O Bento ainda vai lembrar mais uma receita daqui.'
            : `O Bento ainda vai lembrar mais ${faltam} receitas daqui.`}
        </p>
      ) : null}
    </section>
  )
}

/** A bancada com a escolha da receita (abre quando há mais de uma ou nenhuma para fazer). */
export function PainelDaBancada() {
  const { loja } = useJogo()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_BANCADA)
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (aberto) fechar.current?.focus({ preventScroll: true })
  }, [aberto])
  if (!aberto) return null
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-objeto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-bancada-titulo"
      >
        <h2 id="arq-bancada-titulo">Bancada</h2>
        <p className="arq-quadro-sub">O fogão e a pia da ilha: escolha o que fazer.</p>
        <ListaDeReceitas onde="bancada" />
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
