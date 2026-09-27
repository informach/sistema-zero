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
import { Escolha, Medida } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

const palcoX = (x: number) => 28 + x * 0.63
const palcoY = (y: number) => 24 + y * 0.48

export function FixedVsReadStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('fixed-vs-read', cast)
  const mundo = useSceneCenario(actors, 'fixed-vs-read')
  const hero = actorFigure(actors, 'hero')
  const shot = actorFigure(actors, 'scenery')
  const x = palcoX(state.fixedRead.heroX)
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="O tiro e o x da nave"
      descricao={`Nave em x ${state.fixedRead.heroX}. ${state.fixedRead.marks.length} marcas de nascimento. Os tiros continuam subindo do lugar onde nasceram.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          <path d="M28 274H532" className="stroke-scene-line" strokeWidth={2} />
          {[0, 200, 400, 600, 800].map((tick) => (
            <g key={tick}>
              <path d={`M${palcoX(tick)} 270v8`} className="stroke-scene-line" strokeWidth={2} />
              <Texto
                x={palcoX(tick)}
                y={294}
                tamanho={palco.estreito ? 16 : 13}
                textAnchor="middle"
                className="fill-scene-ink"
              >
                {tick}
              </Texto>
            </g>
          ))}
          {state.fixedRead.boxMarks && (
            <g>
              <rect
                x={x - 24}
                y={213}
                width={48}
                height={44}
                fill="none"
                className="stroke-scene-a"
                strokeDasharray="4 3"
                strokeWidth={2}
              />
              <path
                d={`M${x} 198v68`}
                className="stroke-scene-a"
                strokeDasharray="4 3"
                strokeWidth={2}
              />
              <path d={`M${x - 28} 213h56`} className="stroke-scene-b" strokeWidth={2} />
              <Texto
                x={x}
                y={190}
                tamanho={palco.estreito ? 16 : 13}
                textAnchor="middle"
                className="fill-scene-ink"
              >
                centro x
              </Texto>
            </g>
          )}
          <ActorFigure figure={hero} x={x} y={245} />
          {state.fixedRead.marks.map((mark) => (
            <g key={mark.id}>
              <circle cx={palcoX(mark.x)} cy={212} r={6} className="fill-scene-b" />
              <Texto
                x={palcoX(mark.x)}
                y={203}
                tamanho={palco.estreito ? 16 : 12}
                textAnchor="middle"
                className="fill-scene-ink"
              >
                {mark.x}
              </Texto>
            </g>
          ))}
          {state.fixedRead.shots.map((bullet) => (
            <ActorFigure
              key={bullet.id}
              figure={shot}
              x={palcoX(bullet.x)}
              y={palcoY(bullet.y)}
              escala={0.6}
            />
          ))}
          <Texto
            x={20}
            y={38}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {state.fixedRead.source === 'fixed'
              ? 'x do tiro = 400'
              : 'x do tiro = centro x da nave'}
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}

export function FixedVsReadControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  return (
    <div className="space-y-3">
      <Medida
        label="x da nave"
        value={state.fixedRead.heroX}
        min={0}
        max={800}
        step={1}
        passo={40}
        onChange={(x) => dispatch({ type: 'place', x, y: 0 })}
      />
      <Escolha
        label="De onde vem o x do tiro"
        valor={state.fixedRead.source}
        opcoes={[
          { id: 'fixed', label: 'O número 400' },
          { id: 'read', label: 'O centro x da nave' },
        ]}
        onChange={(source) => dispatch({ type: 'value-source', source })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'shoot' })}>
          Atirar
        </SceneButton>
        <SceneButton
          aria-pressed={state.fixedRead.boxMarks}
          tom={state.fixedRead.boxMarks ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'box-marks', on: !state.fixedRead.boxMarks })}
        >
          Marcas da caixa: {state.fixedRead.boxMarks ? 'ligadas' : 'desligadas'}
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'clear-marks' })}>
          Limpar as marcas
        </SceneButton>
      </div>
    </div>
  )
}
