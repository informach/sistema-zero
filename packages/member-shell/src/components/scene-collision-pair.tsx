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

const ROCK_X = [140, 280, 420] as const
const SHOT_X = [90, 280, 470] as const

export function CollisionPairStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('collision-pair', cast)
  const mundo = useSceneCenario(actors, 'collision-pair')
  const pair = state.collisionPair
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="Um tiro encontra uma pedra"
      descricao={`Quadro ${pair.frames}. Pedras no grupo: ${pair.rocks.length}. Tiros no grupo: ${pair.shots.length}. Só o tiro do meio encontra uma pedra.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
          <ActorFigure figure={actorFigure(actors, 'hero')} x={280} y={265} />
          <path
            d="M280 60V255"
            className="stroke-scene-line"
            strokeDasharray="4 6"
            strokeWidth={2}
          />
          {pair.rocks.map((id) => (
            <ActorFigure
              key={`rock-${id}`}
              figure={actorFigure(actors, 'obstacle')}
              x={ROCK_X[id] ?? 280}
              y={40 + pair.frames * 10}
              escala={0.8}
            />
          ))}
          {pair.shots.map((id) => (
            <ActorFigure
              key={`shot-${id}`}
              figure={actorFigure(actors, 'scenery')}
              x={SHOT_X[id] ?? 280}
              y={260 - pair.frames * 12}
              escala={0.7}
            />
          ))}
          <rect
            x={12}
            y={10}
            width={210}
            height={54}
            rx={10}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={24}
            y={31}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {`pedras no grupo: ${pair.rocks.length}`}
          </Texto>
          <Texto
            x={24}
            y={53}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {`tiros no grupo: ${pair.shots.length}`}
          </Texto>
          {pair.collided && (
            <Texto x={340} y={35} tamanho={palco.estreito ? 16 : 14} className="fill-scene-ink">
              A trombada aconteceu
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function CollisionPairControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const pair = state.collisionPair
  return (
    <div className="space-y-3">
      <Escolha
        label="O tiro que sai"
        valor={pair.shotTarget}
        opcoes={[
          { id: 'group', label: 'tiros (o grupo inteiro)' },
          { id: 'alias', label: 'tiro (o apelido)' },
        ]}
        onChange={(target) => dispatch({ type: 'command-target', subject: 'shot', target })}
      />
      <Escolha
        label="A pedra que sai"
        valor={pair.rockTarget}
        opcoes={[
          { id: 'group', label: 'asteroides (o grupo inteiro)' },
          { id: 'alias', label: 'asteroide (o apelido)' },
        ]}
        onChange={(target) => dispatch({ type: 'command-target', subject: 'rock', target })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'advance', seconds: 1 })}>
          {pair.collided ? 'Deixar o tempo passar' : 'Deixar a trombada acontecer'}
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'reset' })}>Voltar ao começo</SceneButton>
      </div>
    </div>
  )
}
