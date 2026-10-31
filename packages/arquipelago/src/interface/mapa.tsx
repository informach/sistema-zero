import { ILHAS, type IlhaId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { ilhasEmVolta } from '../mundo/medidas'
import { ilhaMaisPerto } from '../sistemas/hud'
import { abertasNoMapa, ilhasNoMapa, PAINEL_DO_MAPA, visitadasNoMapa } from '../sistemas/mapa'
import {
  MEDIDAS_DO_MAPA,
  meioDaParte,
  partesDeTerra,
  partesVistas,
  parteVista,
  porcentoDoMapa,
  temMapa,
} from '../sistemas/mapa-da-ilha'
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

const ANEL = ilhasEmVolta().map((i) => ({ id: i.ilha.id, ...i.centro }))
/** De quanto em quanto tempo o HUD e o mapa conferem onde a pessoa está. */
const CONFERIR_A_ILHA_MS = 500

/** A ilha onde a pessoa está agora (a mais perto dela), conferida duas vezes por segundo. */
export function useIlhaAqui(): IlhaId {
  const { rastro } = useJogo()
  const [aqui, setAqui] = useState<IlhaId>(() => ilhaMaisPerto(rastro, ANEL))
  useEffect(() => {
    const t = setInterval(() => setAqui(ilhaMaisPerto(rastro, ANEL)), CONFERIR_A_ILHA_MS)
    return () => clearInterval(t)
  }, [rastro])
  return aqui
}

/** Preenchimento indica visita; contorno colorido indica acesso ainda por explorar. */
function PapelDoMapa({ aqui, className }: { aqui: IlhaId; className: string }) {
  const jornada = useEstado((s) => s.jornada)
  const visitas = useEstado((s) => s.salvamento.ilhasVisitadas)
  const ilhas = ilhasNoMapa(jornada, aqui, visitas)
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
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
              fill={i.visitada ? COR_NO_MAPA[i.ilha.id] : CINZA}
              stroke={i.aberta ? COR_NO_MAPA[i.ilha.id] : undefined}
              strokeWidth={i.aberta && !i.visitada ? 1.5 : 0}
              strokeDasharray={i.aberta && !i.visitada ? '2 1' : undefined}
              className={i.aqui ? 'arq-mapa-aqui' : undefined}
            />
            {i.aqui ? <circle cx={i.x} cy={i.y} r={raio + 2.4} className="arq-mapa-marca" /> : null}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * O mapa da ilha onde a pessoa está (E02): as partes de terra, coloridas as já vistas e em névoa
 * as outras, e a marca de onde ela está. Só enfeite para o leitor de tela (o texto conta as partes).
 */
function MapaDaIlhaAqui({ ilha }: { ilha: IlhaId }) {
  const { rastro } = useJogo()
  const mapa = useEstado((s) => (temMapa(ilha) ? s.salvamento.mapa[ilha] : undefined))
  if (!temMapa(ilha)) return null
  const centro = ilha === 'sua-ilha' ? { x: 0, z: 0 } : (ANEL.find((i) => i.id === ilha) ?? null)
  if (!centro) return null
  const { meioLado } = MEDIDAS_DO_MAPA[ilha]
  const lado = (2 * meioLado) / 8
  const escala = 100 / (2 * meioLado)
  const aqui = {
    x: (rastro.x - centro.x + meioLado) * escala,
    y: (rastro.z - centro.z + meioLado) * escala,
  }
  const { vistas, total } = partesVistas(ilha, mapa)
  return (
    <figure className="arq-mapa-ilha">
      <svg className="arq-mapa-papel" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="0" y="0" width="100" height="100" className="arq-mapa-mar" />
        {partesDeTerra(ilha).map((i) => {
          const p = meioDaParte(ilha, i)
          return (
            <rect
              key={i}
              x={(p.x - lado / 2 + meioLado) * escala}
              y={(p.z - lado / 2 + meioLado) * escala}
              width={lado * escala}
              height={lado * escala}
              rx={2}
              fill={parteVista(mapa, i) ? COR_NO_MAPA[ilha] : CINZA}
              opacity={parteVista(mapa, i) ? 1 : 0.55}
            />
          )
        })}
        {aqui.x >= 0 && aqui.x <= 100 && aqui.y >= 0 && aqui.y <= 100 ? (
          <circle cx={aqui.x} cy={aqui.y} r={3} className="arq-mapa-marca" />
        ) : null}
      </svg>
      <figcaption>{`Mapa desta ilha: ${vistas} de ${total} partes descobertas.`}</figcaption>
    </figure>
  )
}

/** O mapa pequeno do menu de pausa (só enfeite: a lista para ler fica no painel do mapa). */
export function MapaPequeno() {
  const aqui = useIlhaAqui()
  const visitas = useEstado((s) => s.salvamento.ilhasVisitadas)
  return (
    <div className="arq-mapa-pequeno">
      <PapelDoMapa aqui={aqui} className="arq-mapa-papel" />
      <small>{`${visitadasNoMapa(visitas)} de ${ILHAS.length} ilhas visitadas`}</small>
    </div>
  )
}

/**
 * O mapa do arquipélago (da mesa da Maré e do menu): acesso e visitas distintos,
 * a marca da região atual e a lista para ler (o desenho é só enfeite para o leitor
 * de tela). Só olhar; Esc ou "Voltar ao jogo" fecha.
 */
export function PainelDoMapa() {
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_MAPA)
  // Fechado, nada roda (nem a conferência de onde a pessoa está).
  return aberto ? <MapaAberto /> : null
}

function MapaAberto() {
  const { loja } = useJogo()
  const voz = useVoz()
  const jornada = useEstado((s) => s.jornada)
  const visitas = useEstado((s) => s.salvamento.ilhasVisitadas)
  const aqui = useIlhaAqui()
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // O botão fica no fim: focar sem rolar deixa o título e o mapa à vista.
    fechar.current?.focus({ preventScroll: true })
  }, [])
  const ilhas = ilhasNoMapa(jornada, aqui, visitas)
  const mapas = useEstado((s) => s.salvamento.mapa)
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
          {`${visitadasNoMapa(visitas)} de ${ILHAS.length} ilhas visitadas. ${abertasNoMapa(jornada)} abertas para explorar.`}
        </p>
        <p>
          As ilhas preenchidas já receberam sua visita. O contorno colorido mostra onde você pode
          ir.
        </p>
        <PapelDoMapa aqui={aqui} className="arq-mapa-papel" />
        <MapaDaIlhaAqui ilha={aqui} />
        <ul className="arq-mapa-lista">
          {ilhas.map((i) => (
            <li key={i.ilha.id}>
              <span
                className="arq-mapa-cor"
                aria-hidden="true"
                style={{ background: i.visitada ? COR_NO_MAPA[i.ilha.id] : CINZA }}
              />
              <b>{i.ilha.nome}</b>
              <small>
                {i.aberta
                  ? i.visitada
                    ? 'Visitada.'
                    : 'Aberta para explorar.'
                  : voz.ilhaFechadaNoMapa(i.ilha)}
                {i.visitada && temMapa(i.ilha.id)
                  ? ` Mapa ${porcentoDoMapa(i.ilha.id, mapas[i.ilha.id])}% descoberto.`
                  : ''}
                {i.aqui ? ' Você está nesta região.' : ''}
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
