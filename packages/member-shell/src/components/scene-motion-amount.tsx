'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { useEffect } from 'react'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Medida } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

export function MotionAmountStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('motion-amount', cast)
  const mundo = useSceneCenario(actors, 'motion-amount')
  const motion = state.motionAmount
  const figure = actorFigure(actors, 'hero')
  const frameTwo = (x: number, y: number, second: boolean) => (
    <g>
      <ActorFigure figure={figure} x={x + (second ? motion.body * 2.5 : 0)} y={y} escala={1.2} />
      {(
        [
          [-17, -9],
          [8, -15],
          [4, 8],
        ] as const
      ).map(([dx, dy]) => (
        <circle
          key={`${dx}:${dy}`}
          cx={x + dx + (second ? motion.body * 2.5 + motion.crater * 2.5 : 0)}
          cy={y + dy}
          r={3}
          className="fill-scene-b"
        />
      ))}
      <path
        d={`M${x - 12 + (second ? motion.body * 2.5 : 0)} ${y + 20}q12 -22 24 0`}
        className="stroke-scene-alert"
        strokeWidth={3}
        fill="none"
      />
    </g>
  )
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="Dois quadros e uma Prévia"
      descricao={`Quadro 1 e quadro 2. No segundo, a cratera anda ${motion.crater} e a pedra inteira anda ${motion.body}. Prévia ${motion.playing ? 'tocando' : 'parada'} a 8 desenhos por segundo.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          {[20, 195, 370].map((x, index) => (
            <g key={x}>
              <rect
                x={x}
                y={54}
                width={166}
                height={218}
                rx={12}
                className="fill-scene-card stroke-scene-line"
              />
              <Texto
                x={x + 12}
                y={79}
                tamanho={palco.estreito ? 16 : 14}
                className="fill-scene-ink"
                fontWeight="700"
              >
                {index === 2 ? 'Prévia · 8/s' : `Quadro ${index + 1}`}
              </Texto>
            </g>
          ))}
          {frameTwo(102, 164, false)}
          {frameTwo(277, 164, true)}
          {frameTwo(452, 164, motion.previewFrame === 1)}
          <Texto x={382} y={245} tamanho={palco.estreito ? 16 : 13} className="fill-scene-ink">
            {motion.playing
              ? `mostra ${motion.previewFrame + 1}`
              : `parada no ${motion.previewFrame + 1}`}
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}

export function MotionAmountControls({
  state,
  dispatch,
  onRunning,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  onRunning: (on: boolean) => void
}) {
  const motion = state.motionAmount
  useEffect(() => {
    onRunning(motion.playing)
    return () => onRunning(false)
  }, [motion.playing, onRunning])
  return (
    <div className="space-y-3">
      <Medida
        label="O tanto que a cratera anda"
        value={motion.crater}
        min={0}
        max={12}
        step={1}
        onChange={(amount) => dispatch({ type: 'nudge', piece: 'crater', amount })}
      />
      <Medida
        label="O tanto que a pedra inteira anda"
        value={motion.body}
        min={0}
        max={12}
        step={1}
        onChange={(amount) => dispatch({ type: 'nudge', piece: 'body', amount })}
      />
      <SceneButton
        tom={motion.playing ? 'ligado' : 'gesto'}
        aria-pressed={motion.playing}
        onClick={() => dispatch({ type: 'play', on: !motion.playing })}
      >
        {motion.playing ? 'Parar a Prévia' : 'Tocar a Prévia'}
      </SceneButton>
    </div>
  )
}
