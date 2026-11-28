'use client'

import {
  actorFigure,
  quantos,
  type SceneAction,
  type SceneCast,
  type SceneState,
  SPREAD_SHOT,
  SPREAD_SHOT_DEVIATIONS,
  sceneNativeCast,
  spreadShotHits,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

/**
 * A tela do jogo (800 por 480, vista de cima) dentro do palco de 560 por 300: a mesma escala nos
 * dois eixos, para o ângulo de cada laser ser o do jogo.
 */
const ESCALA = 0.6
const px = (x: number) => 40 + x * ESCALA
const py = (y: number) => 10 + y * ESCALA
const NAVE = { x: px(SPREAD_SHOT.ship.x), y: py(SPREAD_SHOT.ship.y) } as const
/** O comprimento do traço do laser, em quadros do caminho dele. */
const RABO = 4
const COR_DO_LASER = '#ff6b6b'

/** O lado de cada laser da rajada (a chave do desenho: a rajada nunca muda de ordem). */
const ladoDoLaser = (total: number, i: number) =>
  total === 1 ? 'meio' : (['esquerda', 'meio', 'direita'][i] ?? 'meio')

/** Um laser: um traço curto no sentido em que ele anda (7 para cima, vx para o lado). */
function Laser({
  x,
  y,
  vx,
  ...data
}: {
  x: number
  y: number
  vx: number
  [k: `data-${string}`]: string
}) {
  return (
    <line
      {...data}
      x1={px(x)}
      y1={py(y)}
      x2={px(x - vx * RABO)}
      y2={py(y + SPREAD_SHOT.speed * RABO)}
      stroke={COR_DO_LASER}
      strokeWidth={4}
      strokeLinecap="round"
    />
  )
}

/**
 * O palco do tiro triplo (`spread-shot`, Poder "Tiro triplo" do Construtor, 28/11/2026), visto de
 * cima: a nave embaixo no meio, as três pedras paradas no alto e, depois de "Ver os lasers
 * chegarem", o caminho de cada laser da última rajada (tracejado), com o ponto onde ele acertou uma
 * pedra ou saiu da tela. Os lasers são enfeite do palco, não papel do elenco.
 */
export function SpreadShotStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('spread-shot', cast)
  const mundo = useSceneCenario(actors, 'spread-shot')
  const sp = state.spreadShot
  const acertos = spreadShotHits(sp)
  const chegou = sp.volley !== null && sp.lasers.length === 0
  const noLugar = sp.rocks.filter(Boolean).length
  const tiro = sp.triple ? `Tiro triplo ligado, desvio ${sp.deviation}` : 'Tiro triplo desligado'
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="O leque de tiros"
      descricao={`${tiro}. ${quantos(sp.lasers.length, 'laser', 'lasers')} no ar. ${quantos(noLugar, 'pedra', 'pedras')} no lugar.${
        chegou
          ? ` No último disparo, ${quantos(acertos.length, 'pedra acertada', 'pedras acertadas')}.`
          : ''
      }`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          {SPREAD_SHOT.rocks.map((x, rock) =>
            sp.rocks[rock] ? (
              <ActorFigure
                key={`pedra-${x}`}
                figure={actorFigure(actors, 'obstacle')}
                x={px(x)}
                y={py(SPREAD_SHOT.rockY)}
                escala={0.6}
              />
            ) : (
              <circle
                key={`pedra-${x}`}
                data-pedra-acertada={rock}
                cx={px(x)}
                cy={py(SPREAD_SHOT.rockY)}
                r={(SPREAD_SHOT.rockSize / 2) * ESCALA}
                fill="none"
                stroke={COR_DO_LASER}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            ),
          )}
          {chegou &&
            sp.volley?.ends.map((end, i) => {
              const vx = sp.volley?.vx[i] ?? 0
              const y = Math.max(end.y, 0)
              return (
                <g
                  key={ladoDoLaser(sp.volley?.ends.length ?? 1, i)}
                  data-caminho={end.rock === null ? 'saiu' : `pedra-${end.rock}`}
                >
                  <line
                    x1={NAVE.x}
                    y1={NAVE.y}
                    x2={px(end.x)}
                    y2={py(y)}
                    stroke={COR_DO_LASER}
                    strokeOpacity={0.7}
                    strokeWidth={2}
                    strokeDasharray="6 5"
                  />
                  {end.rock === null ? (
                    <Laser x={end.x} y={y} vx={vx} />
                  ) : (
                    <circle cx={px(end.x)} cy={py(end.y)} r={6} fill={COR_DO_LASER} />
                  )}
                </g>
              )
            })}
          <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE.x} y={NAVE.y} escala={0.75} />
          {sp.lasers.map((laser, i) => (
            <Laser
              key={ladoDoLaser(sp.lasers.length, i)}
              data-laser-no-ar={String(laser.vx)}
              x={laser.x}
              y={laser.y - 24}
              vx={laser.vx}
            />
          ))}
          <Texto
            x={14}
            y={290}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="700"
            className="fill-scene-ink"
          >
            {sp.triple ? `Tiro triplo · desvio ${sp.deviation}` : 'Tiro simples'}
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos controles, os mesmos da tela livre e das falas do Zappy. */
export const BOTOES_DO_TIRO_TRIPLO = {
  triplo: 'Tiro triplo',
  desvio: (d: number) => `Desvio ${d}`,
  disparar: 'Disparar',
  chegar: 'Ver os lasers chegarem',
  voltar: 'Voltar ao começo',
} as const

/** A bancada fora da exploração livre (o bloco montado sem `freeExploration`). */
export function SpreadShotControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const sp = state.spreadShot
  const noAr = sp.lasers.length > 0
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton
        aria-pressed={sp.triple}
        tom={sp.triple ? 'ligado' : 'ferramenta'}
        onClick={() => dispatch({ type: 'spread-triple', on: !sp.triple })}
      >
        {BOTOES_DO_TIRO_TRIPLO.triplo}
      </SceneButton>
      {SPREAD_SHOT_DEVIATIONS.map((d) => (
        <SceneButton
          key={d}
          aria-pressed={sp.deviation === d}
          tom={sp.deviation === d ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'spread-deviation', deviation: d })}
        >
          {BOTOES_DO_TIRO_TRIPLO.desvio(d)}
        </SceneButton>
      ))}
      <SceneButton tom="gesto" fechado={noAr} onClick={() => dispatch({ type: 'spread-fire' })}>
        {BOTOES_DO_TIRO_TRIPLO.disparar}
      </SceneButton>
      <SceneButton fechado={!noAr} onClick={() => dispatch({ type: 'spread-arrive' })}>
        {BOTOES_DO_TIRO_TRIPLO.chegar}
      </SceneButton>
      <SceneButton onClick={() => dispatch({ type: 'reset' })}>
        {BOTOES_DO_TIRO_TRIPLO.voltar}
      </SceneButton>
    </div>
  )
}
