'use client'

import {
  actorFigure,
  BOSS_HEALTH,
  bossHealthCanAdvance,
  bossHealthDown,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

/**
 * A tela do jogo (800 por 480, vista de cima) dentro do palco de 560 por 300: a mesma escala nos
 * dois eixos.
 */
const ESCALA = 0.6
const px = (x: number) => 40 + x * ESCALA
const py = (y: number) => 10 + y * ESCALA
const CHEFAO = { x: px(BOSS_HEALTH.middle), y: py(BOSS_HEALTH.bossY) } as const
const NAVE = { x: px(BOSS_HEALTH.middle), y: py(BOSS_HEALTH.shipY) } as const
const COR_DO_LASER = '#ff6b6b'
const COR_DA_VIDA = '#4ade80'
/** A barra de vida: um gomo por ponto de vida, acima do chefão. */
const BARRA = { largura: 120, altura: 10, y: CHEFAO.y - 52 } as const

/** A barra de vida do chefão: os gomos cheios são a vida que sobrou. */
function BarraDeVida({ vida }: { vida: number }) {
  const gomo = BARRA.largura / BOSS_HEALTH.life
  const x0 = CHEFAO.x - BARRA.largura / 2
  return (
    <g data-barra-de-vida={vida}>
      <rect
        x={x0 - 2}
        y={BARRA.y - 2}
        width={BARRA.largura + 4}
        height={BARRA.altura + 4}
        rx={4}
        fill="#1f2937"
        stroke="#f8fafc"
        strokeWidth={1.5}
      />
      {Array.from({ length: BOSS_HEALTH.life }, (_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: os gomos são posições fixas da barra.
          key={i}
          data-gomo={i < vida ? 'cheio' : 'vazio'}
          x={x0 + i * gomo + 1}
          y={BARRA.y}
          width={gomo - 2}
          height={BARRA.altura}
          rx={2}
          fill={i < vida ? COR_DA_VIDA : '#475569'}
        />
      ))}
    </g>
  )
}

/**
 * O palco do chefão com resistência (`boss-health`, Poder "Chefão com resistência" do Construtor,
 * 28/11/2026), visto de cima: o chefão no alto (o obstáculo do elenco, grande), com a barra de vida e
 * o número; a nave embaixo, no meio; o placar no canto. O laser do último acerto aparece com o
 * clarão no chefão. Com a vida no 0, o chefão sai da tela (fica só o contorno de onde estava, com a
 * seta da queda). O laser e a barra são enfeite do palco.
 */
export function BossHealthStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('boss-health', cast)
  const mundo = useSceneCenario(actors, 'boss-health')
  const b = state.bossHealth
  const caiu = bossHealthDown(b)
  const acabou = !bossHealthCanAdvance(b)
  const guarda = b.guard ? 'Ligada' : 'Desligada'
  const acertou = b.last === 'hit' || b.last === 'defeat'
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="A resistência do chefão"
      descricao={`${caiu ? 'O chefão saiu da tela.' : `O chefão está no alto, com ${b.life} de vida.`} Placar ${b.score}. Guarda do prêmio ${guarda}.${
        acabou ? ' A partida acabou.' : ''
      }`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          {caiu ? (
            <g data-chefao="caiu">
              <circle
                cx={CHEFAO.x}
                cy={CHEFAO.y}
                r={34}
                fill="none"
                stroke="#f8fafc"
                strokeOpacity={0.6}
                strokeWidth={2}
                strokeDasharray="6 5"
              />
              <path
                d={`M ${CHEFAO.x + 46} ${CHEFAO.y - 10} l 0 36 l -6 -8 m 6 8 l 6 -8`}
                fill="none"
                stroke="#f8fafc"
                strokeOpacity={0.6}
                strokeWidth={2}
              />
            </g>
          ) : (
            <g data-chefao={b.life}>
              <ActorFigure
                figure={actorFigure(actors, 'obstacle')}
                x={CHEFAO.x}
                y={CHEFAO.y}
                escala={1.4}
              />
            </g>
          )}
          <BarraDeVida vida={b.life} />
          <Texto
            x={CHEFAO.x + BARRA.largura / 2 + 10}
            y={BARRA.y + 9}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="800"
            className="fill-scene-ink"
          >
            {`Vida ${b.life}`}
          </Texto>
          {acertou && (
            <g data-laser-acertou>
              <line
                x1={NAVE.x}
                y1={NAVE.y - 22}
                x2={CHEFAO.x}
                y2={CHEFAO.y + 30}
                stroke={COR_DO_LASER}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="10 8"
              />
              <circle
                cx={CHEFAO.x}
                cy={CHEFAO.y + 30}
                r={9}
                fill="#fde047"
                stroke={COR_DO_LASER}
                strokeWidth={2}
              />
            </g>
          )}
          <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE.x} y={NAVE.y} escala={0.75} />
          <Texto
            x={14}
            y={26}
            tamanho={palco.estreito ? 18 : 16}
            fontWeight="800"
            className="fill-scene-ink"
          >
            {`Placar ${b.score}`}
          </Texto>
          <Texto
            x={14}
            y={290}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="700"
            className="fill-scene-ink"
          >
            {`Guarda do prêmio ${guarda}`}
          </Texto>
          {acabou && (
            <Texto
              x={280}
              y={160}
              textAnchor="middle"
              tamanho={palco.estreito ? 22 : 20}
              fontWeight="800"
              className="fill-scene-ink"
            >
              Fim da partida
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos controles, os mesmos da tela livre e das falas do Zappy. */
export const BOTOES_DO_CHEFAO = {
  disparar: 'Disparar',
  guarda: 'Guarda do prêmio',
  ligada: 'Ligada',
  desligada: 'Desligada',
  quadro: 'Avançar um quadro',
  recomecar: 'Recomeçar a partida',
} as const

/** A bancada fora da exploração livre (o bloco montado sem `freeExploration`). */
export function BossHealthControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const b = state.bossHealth
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton
        tom="gesto"
        fechado={bossHealthDown(b)}
        onClick={() => dispatch({ type: 'boss-fire' })}
      >
        {BOTOES_DO_CHEFAO.disparar}
      </SceneButton>
      <SceneButton
        aria-pressed={b.guard}
        tom={b.guard ? 'ligado' : 'ferramenta'}
        onClick={() => dispatch({ type: 'boss-guard', on: true })}
      >
        {`${BOTOES_DO_CHEFAO.guarda}: ${BOTOES_DO_CHEFAO.ligada}`}
      </SceneButton>
      <SceneButton
        aria-pressed={!b.guard}
        tom={b.guard ? 'ferramenta' : 'ligado'}
        onClick={() => dispatch({ type: 'boss-guard', on: false })}
      >
        {`${BOTOES_DO_CHEFAO.guarda}: ${BOTOES_DO_CHEFAO.desligada}`}
      </SceneButton>
      <SceneButton
        fechado={!bossHealthCanAdvance(b)}
        onClick={() => dispatch({ type: 'boss-frame' })}
      >
        {BOTOES_DO_CHEFAO.quadro}
      </SceneButton>
      <SceneButton
        fechado={b.life === BOSS_HEALTH.life}
        onClick={() => dispatch({ type: 'boss-restart' })}
      >
        {BOTOES_DO_CHEFAO.recomecar}
      </SceneButton>
    </div>
  )
}
