'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

const HITS = [1, 10, 30] as const

export function InvincibilityStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('invincibility', cast)
  const mundo = useSceneCenario(actors, 'invincibility')
  const shield = state.invincibility
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="Três batidas e uma proteção que conta"
      descricao={`Quadro ${shield.frames}. ${shield.hearts} vidas. ${shield.remaining} quadros de proteção restando. Pedras que bateram: ${shield.struck.join(', ') || 'nenhuma'}.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          <ActorFigure figure={actorFigure(actors, 'hero')} x={280} y={242} />
          {HITS.filter((frame) => !shield.struck.includes(frame)).map((frame, index) => {
            const progress = Math.min(1, shield.frames / frame)
            const x = 115 + index * 165 + (280 - (115 + index * 165)) * progress
            const y = 60 + 150 * progress
            return (
              <ActorFigure
                key={frame}
                figure={actorFigure(actors, 'obstacle')}
                x={x}
                y={y}
                escala={0.75}
              />
            )
          })}
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
            {`Quadro ${shield.frames} · proteção: ${shield.remaining} quadros restando`}
          </Texto>
          {[0, 1, 2].map((heart) => (
            <circle
              key={heart}
              cx={39 + heart * 28}
              cy={48}
              r={7}
              className={
                heart < shield.hearts ? 'fill-scene-alert' : 'fill-scene-card stroke-scene-line'
              }
            />
          ))}
          {HITS.map((frame, index) => (
            <g key={`hit-${frame}`}>
              <circle
                cx={160 + index * 120}
                cy={278}
                r={8}
                className={
                  shield.struck.includes(frame)
                    ? 'fill-scene-b'
                    : 'fill-scene-card stroke-scene-line'
                }
              />
              <Texto
                x={160 + index * 120}
                y={263}
                tamanho={palco.estreito ? 16 : 13}
                textAnchor="middle"
                className="fill-scene-ink"
              >
                {`batida ${frame}`}
              </Texto>
            </g>
          ))}
        </>
      )}
    </SceneCanvas>
  )
}

export function InvincibilityControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const shield = state.invincibility
  return (
    <div className="space-y-3">
      <Escolha
        label="Proteção em quadros"
        valor={shield.protection}
        opcoes={[0, 15, 45, 90].map((frames) => ({
          id: frames as 0 | 15 | 45 | 90,
          label: `${frames} quadros`,
        }))}
        onChange={(frames) => dispatch({ type: 'shield', frames })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton onClick={() => dispatch({ type: 'advance', seconds: 1 / 30 })}>
          Avançar 1 quadro
        </SceneButton>
        <SceneButton
          tom="gesto"
          fechado={shield.struck.length === 3}
          onClick={() => dispatch({ type: 'advance-to' })}
        >
          Avançar até a próxima pedra
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'reset' })}>Voltar ao começo</SceneButton>
      </div>
    </div>
  )
}
