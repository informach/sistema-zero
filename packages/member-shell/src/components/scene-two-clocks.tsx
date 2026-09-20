'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
  twoClockFrame,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

export function TwoClocksStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('two-clocks', cast)
  const mundo = useSceneCenario(actors, 'two-clocks')
  const clocks = state.twoClocks
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="Um relógio faz nascer; outro troca desenhos"
      descricao={`Quadro ${clocks.frames}. ${clocks.born} pedras nasceram. Uma nasce a cada ${clocks.birthEvery} quadros e cada pedra troca ${clocks.animationRate} desenhos por segundo. A mais recente começou no desenho 0.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          <ActorFigure figure={actorFigure(actors, 'hero')} x={280} y={255} />
          <rect
            x={12}
            y={12}
            width={536}
            height={47}
            rx={10}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={24}
            y={32}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {`Quadro ${clocks.frames} · nasceram ${clocks.born}`}
          </Texto>
          <Texto x={24} y={51} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink">
            {`nascer: ${clocks.birthEvery} quadros · giro: ${clocks.animationRate} desenhos/s`}
          </Texto>
          {clocks.rocks.map((rock) => {
            const age = clocks.frames - rock.bornAt
            const x = 60 + ((rock.id - 1) % 5) * 105
            const y = 100 + age * 1.7
            const frame = twoClockFrame(rock, clocks.frames, clocks.animationRate)
            return (
              <g key={rock.id}>
                <ActorFigure
                  figure={actorFigure(actors, 'obstacle')}
                  x={x}
                  y={y}
                  escala={frame === 0 ? 0.72 : 0.82}
                />
                <rect
                  x={x - 36}
                  y={y - 52}
                  width={72}
                  height={25}
                  rx={8}
                  className="fill-scene-card stroke-scene-line"
                />
                <Texto
                  x={x}
                  y={y - 34}
                  tamanho={palco.estreito ? 15 : 12}
                  textAnchor="middle"
                  className="fill-scene-ink"
                  fontWeight="700"
                >
                  {`quadro ${frame}`}
                </Texto>
              </g>
            )
          })}
          {clocks.born > 0 && (
            <Texto
              x={20}
              y={287}
              tamanho={palco.estreito ? 14 : 12}
              className="fill-scene-ink"
            >{`Pedra ${clocks.born} nasceu mostrando o quadro 0`}</Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function TwoClocksControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const clocks = state.twoClocks
  return (
    <div className="space-y-3">
      <Escolha
        label="A cada quantos quadros nasce uma pedra"
        valor={clocks.birthEvery}
        opcoes={[20, 40, 80].map((frames) => ({
          id: frames as 20 | 40 | 80,
          label: `${frames} quadros`,
        }))}
        onChange={(frames) => dispatch({ type: 'birth-every', frames })}
      />
      <Escolha
        label="Desenhos por segundo de cada pedra"
        valor={clocks.animationRate}
        opcoes={[2, 8, 16].map((rate) => ({
          id: rate as 2 | 8 | 16,
          label: `${rate} por segundo`,
        }))}
        onChange={(perSecond) => dispatch({ type: 'rate', perSecond })}
      />
      <SceneButton onClick={() => dispatch({ type: 'reset' })}>Voltar ao começo</SceneButton>
      <p className="text-sm text-muted-foreground">
        Pedras que nasceram: {clocks.born}. Cada pedra começa no desenho 0.
      </p>
    </div>
  )
}
