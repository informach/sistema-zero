import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFarol, useFarol } from '../estado/farol'
import { ALVOS_DO_FACHO } from '../mundo/alto-do-farol'
import {
  FALA_FINAL_DO_ZAPPY,
  fachosAcesos,
  opacidadeDoCorte,
  PAINEL_DA_IRIS,
  PAINEL_DO_FINAL,
  ULTIMA_PAGINA,
} from '../sistemas/final-do-farol'
import { PainelDeApresentacao } from './apresentacao'

export function PainelDaIris() {
  return (
    <PainelDeApresentacao quem="iris" painel={PAINEL_DA_IRIS} nome="Íris" tchau="Até logo, Íris" />
  )
}

export function PainelDoFarol() {
  const { loja } = useJogo()
  const farol = lojaDoFarol(loja)
  const etapa = useFarol(loja, (s) => s.etapa)
  const pagina = useFarol(loja, (s) => s.pagina)
  const quantidade = useFarol(loja, (s) => fachosAcesos(s.tempo, s.menosMovimento))
  const painel = useEstado((s) => s.painelAberto)
  const menu = useEstado((s) => s.menuAberto)
  const principal = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (etapa !== 'fora' && etapa !== 'sala' && pagina >= 0) principal.current?.focus()
  }, [etapa, pagina])
  if (etapa === 'fora' || menu || (painel !== null && painel !== PAINEL_DO_FINAL)) return null
  if (etapa === 'sala')
    return (
      <div className="arq-farol-orientacao">
        <section className="arq-agora arq-vidro" aria-label="Orientação no Farol">
          <h2>Agora</h2>
          <ul>
            <li>
              <span className="arq-agora-marca" aria-hidden="true" />
              Ler a última página na mesa da Íris
            </li>
          </ul>
        </section>
        <div className="arq-farol-voltar">
          <button
            ref={principal}
            type="button"
            className="arq-botao leve"
            onClick={() => farol.getState().sair?.()}
          >
            Descer do Farol
          </button>
        </div>
      </div>
    )
  const lendo = etapa === 'pagina'
  const fim = etapa === 'fim'
  const carregando = etapa === 'carregando'
  return (
    <section
      className="arq-capi arq-final-farol"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arq-final-titulo"
    >
      <h2 id="arq-final-titulo">
        {lendo
          ? 'A última página da Íris'
          : carregando
            ? 'Subindo o Farol'
            : fim
              ? 'Zappy'
              : 'A luz do Farol'}
      </h2>
      <p className="arq-capi-fala" aria-live="polite">
        {lendo
          ? ULTIMA_PAGINA[pagina]
          : carregando
            ? 'A sala está chegando.'
            : fim
              ? FALA_FINAL_DO_ZAPPY
              : quantidade
                ? `A luz ilumina ${ALVOS_DO_FACHO[quantidade - 1]?.ilha.nome ?? 'as ilhas'}.`
                : 'O Farol olha para as seis ilhas.'}
      </p>
      <div className="arq-menu-acoes">
        {lendo && (
          <button
            ref={principal}
            type="button"
            className="arq-botao"
            onClick={() => {
              if (pagina < ULTIMA_PAGINA.length - 1) farol.setState({ pagina: pagina + 1 })
              else {
                farol.getState().mostrarLuz?.()
              }
            }}
          >
            {pagina < ULTIMA_PAGINA.length - 1 ? 'Continuar' : 'Ver a luz do Farol'}
          </button>
        )}
        <button
          ref={lendo ? undefined : principal}
          type="button"
          className={`arq-botao${lendo ? ' leve' : ''}`}
          onClick={() => farol.getState().sair?.()}
        >
          {fim ? 'Voltar para casa' : 'Descer do Farol'}
        </button>
      </div>
    </section>
  )
}

/** A opacidade segue o relógio pausável da passagem, inclusive com poucos quadros por segundo. */
export function CorteDoFarol() {
  const { loja } = useJogo()
  const corte = useFarol(loja, (s) => s.corte)
  if (corte === null) return null
  return (
    <div
      className="arq-corte"
      aria-hidden="true"
      style={{ animation: 'none', opacity: opacidadeDoCorte(corte), pointerEvents: 'auto' }}
    />
  )
}
