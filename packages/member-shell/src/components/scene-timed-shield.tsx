'use client'

import {
  actorFigure,
  quantos,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
  TIMED_SHIELD,
  timedShieldNextRock,
  timedShieldOver,
  timedShieldRock,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

/** Onde a nave fica, embaixo, e de onde as pedras descem (um degrau por segundo que falta). */
const NAVE = { x: 280, y: 226 } as const
const DEGRAU = 52
/** O item do escudo, à esquerda da nave: um enfeite do palco, não um papel do elenco. */
const ITEM = { x: 110, y: 214 } as const
/** Uma bolinha por vida da partida (0, 1 e 2). */
const VIDAS = Array.from({ length: TIMED_SHIELD.lives }, (_, i) => i)

/** O item do escudo: um escudinho azul de contorno claro, enfeite ao lado da nave (o botão o nomeia). */
function ItemDoEscudo({ x, y }: { x: number; y: number }) {
  return (
    <g data-item-do-escudo="" transform={`translate(${x} ${y})`}>
      <path
        d="M0 -22 L18 -15 L16 6 Q12 18 0 24 Q-12 18 -16 6 L-18 -15 Z"
        fill="#4cc9f0"
        fillOpacity={0.35}
        stroke="#e3edff"
        strokeWidth={2.5}
      />
      <path d="M0 -12 L9 -8 L8 4 Q6 11 0 14 Q-6 11 -8 4 L-9 -8 Z" fill="#e3edff" opacity={0.6} />
    </g>
  )
}

/**
 * O palco do escudo temporário (`timed-shield`, Poder "Escudo temporário" do Construtor, 28/11/2026):
 * a nave embaixo, as próximas pedras descendo (uma posição por segundo que falta para a batida), o
 * item do escudo ao lado e, com o Escudo maior que 0, uma bolha transparente em volta da nave, que
 * pisca no último segundo. Embaixo, os quatro segundos das pedras.
 */
export function TimedShieldStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('timed-shield', cast)
  const mundo = useSceneCenario(actors, 'timed-shield')
  const t = state.timedShield
  const proxima = timedShieldNextRock(t.second)
  const acabou = timedShieldOver(t)
  const bateuAgora = t.last === 'tick' && timedShieldRock(t.second)
  const tirouVida = bateuAgora && t.damaged.includes(t.second)
  const batidas = TIMED_SHIELD.rocks.filter((rock) => rock <= t.second)
  // As pedras que ainda vêm e cabem no céu (até três segundos de distância).
  const chegando = acabou
    ? []
    : TIMED_SHIELD.rocks.filter((rock) => rock > t.second && rock - t.second <= 3)
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="O escudo que acaba"
      descricao={`Segundo ${t.second}. ${quantos(t.lives, 'vida', 'vidas')}. Escudo em ${t.shield}. ${
        proxima === null ? 'Não vem mais pedra.' : `A próxima pedra bate no segundo ${proxima}.`
      } Pedras que bateram: ${batidas.join(', ') || 'nenhuma'}.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          <ItemDoEscudo x={ITEM.x} y={ITEM.y} />
          <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE.x} y={NAVE.y} />
          {t.shield > 0 && (
            <circle
              data-bolha={t.shield}
              cx={NAVE.x}
              cy={NAVE.y - 4}
              r={46}
              fill="#4cc9f0"
              fillOpacity={0.22}
              stroke="#4cc9f0"
              strokeOpacity={0.85}
              strokeWidth={3}
              className={t.shield === 1 ? 'motion-safe:animate-pulse' : undefined}
            />
          )}
          {chegando.map((rock, index) => (
            <ActorFigure
              key={rock}
              figure={actorFigure(actors, 'obstacle')}
              x={NAVE.x + (index % 2 === 0 ? 0 : 60)}
              y={NAVE.y - 30 - (rock - t.second) * DEGRAU}
              escala={0.7}
            />
          ))}
          {bateuAgora && (
            <g data-batida={tirouVida ? 'vida' : 'saiu'}>
              {!tirouVida && (
                <ActorFigure
                  figure={actorFigure(actors, 'obstacle')}
                  x={NAVE.x + 95}
                  y={NAVE.y - 48}
                  escala={0.55}
                />
              )}
              <Texto
                x={NAVE.x + 70}
                y={NAVE.y + 12}
                tamanho={palco.estreito ? 18 : 16}
                fontWeight="800"
                className={tirouVida ? 'fill-scene-alert' : 'fill-scene-ink'}
              >
                {tirouVida ? '−1 vida' : 'saiu'}
              </Texto>
            </g>
          )}
          <rect
            x={15}
            y={12}
            width={530}
            height={48}
            rx={10}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={28}
            y={33}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {`Segundo ${t.second} · Escudo: ${t.shield}`}
          </Texto>
          {VIDAS.map((heart) => (
            <circle
              key={heart}
              cx={39 + heart * 28}
              cy={48}
              r={7}
              className={heart < t.lives ? 'fill-scene-alert' : 'fill-scene-card stroke-scene-line'}
            />
          ))}
          {TIMED_SHIELD.rocks.map((rock, index) => (
            <g key={`pedra-${rock}`} data-segundo-da-pedra={rock}>
              <circle
                cx={130 + index * 100}
                cy={286}
                r={7}
                className={
                  t.damaged.includes(rock)
                    ? 'fill-scene-alert'
                    : rock <= t.second
                      ? 'fill-scene-b'
                      : 'fill-scene-card stroke-scene-line'
                }
              />
              <Texto
                x={130 + index * 100}
                y={272}
                tamanho={palco.estreito ? 16 : 13}
                textAnchor="middle"
                className="fill-scene-ink"
              >
                {`segundo ${rock}`}
              </Texto>
            </g>
          ))}
        </>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos quatro botões, os mesmos da tela livre e das falas do Zappy. */
export const BOTOES_DO_ESCUDO = {
  pegar: 'Pegar o item do escudo',
  segundo: 'Avançar 1 segundo',
  pedra: 'Avançar até a próxima pedra',
  voltar: 'Voltar ao começo',
} as const

/** A bancada fora da exploração livre (o bloco montado sem `freeExploration`). */
export function TimedShieldControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const t = state.timedShield
  const acabou = timedShieldOver(t)
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton fechado={acabou} onClick={() => dispatch({ type: 'pick-shield' })}>
        {BOTOES_DO_ESCUDO.pegar}
      </SceneButton>
      <SceneButton fechado={acabou} onClick={() => dispatch({ type: 'tick-second' })}>
        {BOTOES_DO_ESCUDO.segundo}
      </SceneButton>
      <SceneButton
        tom="gesto"
        fechado={acabou || timedShieldNextRock(t.second) === null}
        onClick={() => dispatch({ type: 'next-rock' })}
      >
        {BOTOES_DO_ESCUDO.pedra}
      </SceneButton>
      <SceneButton onClick={() => dispatch({ type: 'reset' })}>
        {BOTOES_DO_ESCUDO.voltar}
      </SceneButton>
    </div>
  )
}
