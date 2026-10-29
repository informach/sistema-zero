import { ILHAS, type IlhaId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { abertasNoMapa, ilhasNoMapa, PAINEL_DO_MAPA } from '../sistemas/mapa'
import { useVoz } from './voz'

/** A cor de cada ilha aberta no papel (as fechadas ficam cinza). */
const COR_NO_MAPA: Readonly<Record<IlhaId, string>> = {
  'sua-ilha': '#7bc67e',
  bosque: '#3f9a4f',
  'vila-doce': '#f39fb8',
  recife: '#2fb3c4',
  pico: '#cfe6f5',
  'vale-dos-dinos': '#d9a35b',
  nuvens: '#b9a9f0',
  farol: '#ffd56b',
}
const CINZA = '#b9bcc6'

/**
 * O mapa do arquipélago da mesa da Maré: as ilhas no lugar do anel, coloridas quando abertas, e a
 * lista para ler (o desenho é só enfeite para o leitor de tela). Só olhar; Esc ou "Voltar ao
 * jogo" fecha.
 */
export function PainelDoMapa() {
  const { loja } = useJogo()
  const voz = useVoz()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_MAPA)
  const jornada = useEstado((s) => s.jornada)
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // O botão fica no fim: focar sem rolar deixa o título e o mapa à vista.
    if (aberto) fechar.current?.focus({ preventScroll: true })
  }, [aberto])
  if (!aberto) return null
  const ilhas = ilhasNoMapa(jornada, 'recife')
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-mapa"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-mapa-titulo"
      >
        <h2 id="arq-mapa-titulo">Mapa do arquipélago</h2>
        <p className="arq-quadro-sub">
          {`O mapa da Maré. As ilhas com cor já abriram: ${abertasNoMapa(jornada)} de ${ILHAS.length}.`}
        </p>
        <svg className="arq-mapa-papel" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" className="arq-mapa-mar" />
          <circle cx="50" cy="50" r="36" className="arq-mapa-rota" />
          {ilhas.map((i) => {
            const raio = i.ilha.id === 'farol' ? 2.6 : i.ilha.angulo === null ? 9 : 7
            return (
              <g key={i.ilha.id}>
                <circle
                  cx={i.x}
                  cy={i.y}
                  r={raio}
                  fill={i.aberta ? COR_NO_MAPA[i.ilha.id] : CINZA}
                  className={i.aqui ? 'arq-mapa-aqui' : undefined}
                />
                {i.aqui ? (
                  <circle cx={i.x} cy={i.y} r={raio + 2.4} className="arq-mapa-marca" />
                ) : null}
              </g>
            )
          })}
        </svg>
        <ul className="arq-mapa-lista">
          {ilhas.map((i) => (
            <li key={i.ilha.id}>
              <span
                className="arq-mapa-cor"
                aria-hidden="true"
                style={{ background: i.aberta ? COR_NO_MAPA[i.ilha.id] : CINZA }}
              />
              <b>{i.ilha.nome}</b>
              <small>
                {i.aqui ? 'Você está aqui.' : i.aberta ? 'Aberta.' : voz.ilhaFechadaNoMapa(i.ilha)}
              </small>
            </li>
          ))}
        </ul>
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
