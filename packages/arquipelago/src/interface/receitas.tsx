import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { festaAtual, useFesta } from '../estado/festas'
import type { Festa } from '../sistemas/festas'
import { ITENS, quantidade } from '../sistemas/itens'
import { salvamentoPausado } from '../sistemas/pausa'
import {
  dicaDaReceita,
  fazerReceita,
  type LugarDaReceita,
  PAINEL_DA_BANCADA,
  podeCozinhar,
  RECEITAS,
  type Receita,
  receitaConhecida,
  receitaEmEpoca,
  receitasConhecidas,
} from '../sistemas/receitas'

/** Fazer a receita na loja do jogo (o Zappy conta o que saiu). */
export function fazerNaLoja(
  loja: ReturnType<typeof useJogo>['loja'],
  r: Receita,
  festa: Festa | null = null,
): void {
  const s = loja.getState()
  if (
    s.acesso.somenteLeitura ||
    s.visita ||
    s.tempoAcabou ||
    s.tempoPausado ||
    s.tempoSincronizando ||
    salvamentoPausado(s.salvamentoSituacao) ||
    !receitaConhecida(r, s.salvamento)
  )
    return
  const feito = fazerReceita(s.salvamento, r, festa)
  if (!feito) return
  s.mudar(() => feito.salvamento)
  if (loja.getState().salvamento === feito.salvamento) s.dizer(feito.fala)
}

const nome = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

/** O que falta de uma receita, ou `null` se já dá para fazer. */
function oQueFalta(inv: Record<string, number>, r: Receita): string | null {
  const faltam = Object.entries(r.precisa)
    .filter(([id, q]) => quantidade(inv, id) < q)
    .map(([id, q]) => `${q - quantidade(inv, id)} ${nome(id)}`)
  if (faltam.length > 0) return `Falta ${faltam.join(', ')}.`
  return podeCozinhar(inv, r) ? null : 'Use ou guarde alguns pratos para caber a receita inteira.'
}

/**
 * As receitas de um lugar (o forno ou a bancada): as que ela sabe, com o que cada uma precisa e o
 * botão de fazer, e quantas o Bento ainda vai lembrar.
 */
export function ListaDeReceitas({ onde }: { onde: LugarDaReceita }) {
  const { loja, plataforma } = useJogo()
  const festa = useFesta()
  const salvamento = useEstado((s) => s.salvamento)
  const inventario = salvamento.inventario
  const sabidas = receitasConhecidas(salvamento).filter((r) => r.onde === onde)
  const faltam = RECEITAS.filter((r) => r.onde === onde && !receitaConhecida(r, salvamento))
  return (
    <section className="arq-receitas" aria-label={onde === 'forno' ? 'Assar no forno' : 'Cozinhar'}>
      <h3 className="arq-menu-titulo">{onde === 'forno' ? 'Assar' : 'Receitas'}</h3>
      {sabidas.length === 0 ? (
        <p className="arq-caderno-explica">
          Novas receitas chegam com as amizades e as coleções. Veja as pistas abaixo.
        </p>
      ) : (
        <ul className="arq-objeto-itens">
          {sabidas.map((r) => {
            const falta = receitaEmEpoca(r, festa)
              ? oQueFalta(inventario, r)
              : 'Esta receita volta com a festa. Seu prato pronto continua guardado.'
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className="arq-botao leve"
                  disabled={falta !== null}
                  onClick={() => {
                    fazerNaLoja(loja, r, festaAtual(plataforma))
                  }}
                >
                  {`${ITENS[r.faz.id]?.emoji ?? ''} ${r.nome}: ${Object.entries(r.precisa)
                    .map(([id, q]) => `${q} ${nome(id)}`)
                    .join(', ')}`}
                </button>
                {falta ? <small className="arq-receitas-falta">{falta}</small> : null}
                <small className="arq-caderno-explica">{dicaDaReceita(r, salvamento)}</small>
              </li>
            )
          })}
        </ul>
      )}
      {faltam.length > 0 ? (
        <details className="arq-caderno-explica">
          <summary>
            Mais {faltam.length}{' '}
            {faltam.length === 1 ? 'receita para aprender' : 'receitas para aprender'}
          </summary>
          <ul>
            {faltam.map((r) => (
              <li key={r.id}>
                <b>{r.nome}</b>: {dicaDaReceita(r, salvamento)}
              </li>
            ))}
          </ul>
        </details>
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
