'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneSkin,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { useEffect } from 'react'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

const THEMES: { id: SceneSkin; label: string }[] = [
  { id: 'space', label: 'Nave no espaço' },
  { id: 'road', label: 'Carrinho na estrada' },
  { id: 'sea', label: 'Submarino no mar' },
]

function scenery(theme: SceneSkin) {
  if (theme === 'road')
    return (
      <g>
        <rect x={10} y={58} width={360} height={217} rx={12} fill="#596271" />
        {[75, 145, 215, 285].map((x) => (
          <rect key={x} x={x} y={58} width={28} height={9} rx={4} fill="#f9d874" />
        ))}
        <path d="M25 58v217M354 58v217" stroke="#f9d874" strokeWidth={4} />
      </g>
    )
  if (theme === 'sea')
    return (
      <g>
        <rect x={10} y={58} width={360} height={217} rx={12} fill="#146d96" />
        <path
          d="M10 82 Q80 69 144 82 T277 82 T370 82"
          fill="none"
          stroke="#70daed"
          strokeWidth={4}
        />
        {[60, 110, 290, 335].map((x, i) => (
          <g key={x} fill="none" stroke="#9de7ed" strokeWidth={2}>
            <circle cx={x} cy={120 + i * 27} r={4} />
            <circle cx={x + 9} cy={136 + i * 27} r={3} />
          </g>
        ))}
      </g>
    )
  return null
}

function vehicle(
  theme: SceneSkin,
  x: number,
  y: number,
  figure: ReturnType<typeof actorFigure>,
  obstacle: boolean,
) {
  if (theme === 'space')
    return <ActorFigure figure={figure} x={x} y={y} escala={obstacle ? 0.75 : 0.9} />
  if (theme === 'road')
    return obstacle ? (
      <g transform={`translate(${x} ${y})`}>
        <path d="M0 -33 L-18 0 H18 Z" fill="#ffb13b" stroke="#773d2b" strokeWidth={3} />
        <path d="M-10 -16h20" stroke="#fff1b4" strokeWidth={3} />
      </g>
    ) : (
      <g transform={`translate(${x} ${y})`}>
        <rect
          x={-22}
          y={-36}
          width={44}
          height={49}
          rx={12}
          fill="#ff6b79"
          stroke="#842d47"
          strokeWidth={3}
        />
        <rect x={-15} y={-26} width={30} height={20} rx={7} fill="#9be9f5" />
        <circle cx={-15} cy={17} r={7} fill="#222f46" />
        <circle cx={15} cy={17} r={7} fill="#222f46" />
      </g>
    )
  return obstacle ? (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-15} r={19} fill="#253d5b" stroke="#89d3e6" strokeWidth={3} />
      <circle cx={-8} cy={-21} r={3} fill="#b7e5e7" />
      <circle cx={9} cy={-10} r={3} fill="#b7e5e7" />
      <path d="M-27 -15h-8M27 -15h8" stroke="#9de7ed" strokeWidth={4} />
    </g>
  ) : (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={-9} rx={29} ry={18} fill="#ffbf62" stroke="#925b35" strokeWidth={3} />
      <rect
        x={-8}
        y={-36}
        width={16}
        height={16}
        rx={3}
        fill="#ffbf62"
        stroke="#925b35"
        strokeWidth={3}
      />
      <circle cx={12} cy={-11} r={7} fill="#9be9f5" stroke="#246485" strokeWidth={2} />
      <path d="M-28 -10h-12v17h12" fill="#ffbf62" stroke="#925b35" strokeWidth={3} />
    </g>
  )
}

export function SameRulesStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const actors = sceneNativeCast('same-rules-new-skin', cast)
  const mundo = useSceneCenario(actors, 'same-rules-new-skin')
  const game = state.skinGame
  const x = (value: number) => 20 + value * 0.62
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dispatch) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      dispatch({ type: 'play-move', direction: event.key === 'ArrowLeft' ? -1 : 1 })
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      dispatch({ type: 'play-shoot' })
    }
  }
  return (
    <div
      tabIndex={dispatch ? 0 : undefined}
      role="group"
      aria-label="Jogo: use as setas para mover e Espaço para atirar"
      onKeyDown={onKeyDown}
    >
      <SceneCanvas
        cast={actors}
        mundo={mundo}
        titulo="O mesmo jogo em três histórias"
        descricao={`Tema ${THEMES.find((theme) => theme.id === game.theme)?.label}. Quatro regras, com a de atirar ${game.shootEnabled ? 'ligada' : 'desligada'}. ${game.lives} vidas e ${game.points} pontos.`}
      >
        {(palco) => (
          <>
            <FundoDoCenario cenario={mundo} w={560} h={300} chao={275} detalhe="calmo" />
            {scenery(game.theme)}
            <rect
              x={380}
              y={18}
              width={168}
              height={264}
              rx={12}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={392}
              y={46}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              Regras do jogo
            </Texto>
            {['as setas movem', 'a tecla atira', 'o obstáculo vem', 'encostou, perde vida'].map(
              (rule, index) => (
                <g key={rule}>
                  <circle
                    cx={401}
                    cy={81 + 42 * index}
                    r={7}
                    className={
                      index === 1 && !game.shootEnabled ? 'fill-scene-alert' : 'fill-scene-a'
                    }
                  />
                  <Texto
                    x={416}
                    y={86 + 42 * index}
                    tamanho={palco.estreito ? 15 : 12}
                    className={
                      index === 1 && !game.shootEnabled ? 'fill-scene-muted' : 'fill-scene-ink'
                    }
                  >
                    {rule}
                  </Texto>
                </g>
              ),
            )}
            <Texto
              x={391}
              y={262}
              tamanho={palco.estreito ? 14 : 12}
              className="fill-scene-ink"
            >{`vidas ${game.lives} · pontos ${game.points}`}</Texto>
            {vehicle(
              game.theme,
              x(game.obstacleX),
              59 + game.obstacleY * 0.72,
              actorFigure(actors, 'obstacle'),
              true,
            )}
            {game.shots.map((shot) => (
              <circle key={shot.id} cx={x(shot.x)} cy={59 + shot.y * 0.72} r={4} fill="#ffe28a" />
            ))}
            {vehicle(game.theme, x(game.x), 257, actorFigure(actors, 'hero'), false)}
          </>
        )}
      </SceneCanvas>
    </div>
  )
}

export function SameRulesControls({
  state,
  dispatch,
  onRunning,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  onRunning: (running: boolean) => void
}) {
  const game = state.skinGame
  useEffect(() => {
    onRunning(true)
    return () => onRunning(false)
  }, [onRunning])
  return (
    <div className="space-y-3">
      <Escolha
        label="Tema do mesmo jogo"
        valor={game.theme}
        opcoes={THEMES}
        onChange={(theme) => dispatch({ type: 'skin', theme })}
      />
      <SceneButton
        tom={game.shootEnabled ? 'ligado' : 'ferramenta'}
        aria-pressed={game.shootEnabled}
        onClick={() => dispatch({ type: 'rule-toggle', enabled: !game.shootEnabled })}
      >
        Regra: a tecla atira {game.shootEnabled ? 'ligada' : 'desligada'}
      </SceneButton>
      <div className="flex flex-wrap gap-2">
        <SceneButton onClick={() => dispatch({ type: 'play-move', direction: -1 })}>
          ← Mover
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'play-move', direction: 1 })}>
          Mover →
        </SceneButton>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'play-shoot' })}>
          Atirar · Espaço
        </SceneButton>
      </div>
      <p className="text-sm text-muted-foreground">
        Foque o palco para jogar com as setas e Espaço. O obstáculo vem de cima nos três temas.
      </p>
    </div>
  )
}
