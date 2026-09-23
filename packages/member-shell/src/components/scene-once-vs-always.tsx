'use client'

import {
  actorFigure,
  castText,
  cenarioTemChao,
  type OnceArea,
  type OnceCardId,
  type OncePlacement,
  type OnceVsAlwaysPreset,
  oncePreset,
  type SceneAction,
  type SceneCast,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { useState } from 'react'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure, pisoDoMundo } from './scene-figures'

const AREA_LABEL: Record<OnceArea, string> = {
  start: 'Ao iniciar',
  loop: 'Enquanto estiver rodando',
  event: 'Quando acontecer',
}
const HERO_SLOTS = ['heroi-1', 'heroi-2', 'heroi-3', 'heroi-4'] as const
const SHOT_SLOTS = ['tiro-1', 'tiro-2', 'tiro-3', 'tiro-4'] as const
const HEART_SLOTS = ['vida-1', 'vida-2', 'vida-3'] as const

export function OnceVsAlwaysStage({
  state,
  cast,
  preset,
}: {
  state: SceneState
  cast?: SceneCast
  preset?: OnceVsAlwaysPreset
}) {
  const prepared = oncePreset(preset)
  const chosenCast: SceneCast =
    cast ??
    (prepared.id === 'duas-caixas-dino' || prepared.id === 'tres-caixas-som'
      ? {
          hero: { name: 'Dino', gender: 'm', figure: 'dino' },
          obstacle: { name: 'cacto', gender: 'm', figure: 'cacto' },
        }
      : {
          hero: { name: 'nave', gender: 'f', figure: 'nave' },
          obstacle: { name: 'asteroide', gender: 'm', figure: 'asteroide' },
        })
  const mundo = useSceneCenario(chosenCast, 'once-vs-always')
  const hero = actorFigure(chosenCast, 'hero')
  const obstacle = actorFigure(chosenCast, 'obstacle')
  const { frames, heroCount, heroX, background, shots, sounds, hearts, hits } = state.once
  const isLives = prepared.id === 'uma-ficha-vidas'
  const temChao = cenarioTemChao(mundo)
  const piso = pisoDoMundo(mundo, 248)
  const temFichaDeFundo = prepared.cards.some((card) => card.kind === 'paint')
  return (
    <SceneCanvas
      cast={chosenCast}
      mundo={mundo}
      titulo="O jogo reagindo às fichas do projeto"
      descricao={`Passo ${frames}. ${heroCount} personagens, ${shots} tiros, ${sounds} sons, ${hearts} vidas e ${hits} batidas.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario
            cenario={mundo}
            w={560}
            h={300}
            chao={temChao ? 248 : undefined}
            detalhe="calmo"
          />
          {temFichaDeFundo && !background && (
            <rect x={0} y={0} width={560} height={300} className="fill-scene-card" />
          )}
          {temChao && <path d="M0 248H560" className="stroke-scene-line" strokeWidth={2} />}
          <Texto x={24} y={35} tamanho={15} className="fill-scene-ink" fontWeight="700">
            {`Passo ${frames}`}
          </Texto>
          {prepared.cards.some((card) => card.id === 'move') && (
            <Texto x={24} y={67} tamanho={14} className="fill-scene-b-ink" fontWeight="700">
              {`Movimentos: ${state.once.fires.move}`}
            </Texto>
          )}
          {HERO_SLOTS.slice(0, heroCount).map((slot, index) => (
            <ActorFigure key={slot} figure={hero} x={Math.min(490, heroX + index * 76)} y={piso} />
          ))}
          <ActorFigure
            figure={obstacle}
            x={isLives ? (frames > 0 && frames % 3 === 0 ? 95 : 315 - (frames % 3) * 75) : 465}
            y={piso}
          />
          {shots > 0 && (
            <>
              {SHOT_SLOTS.slice(0, shots).map((slot, index) => (
                <circle key={slot} cx={320 + index * 36} cy={160} r={7} className="fill-scene-b" />
              ))}
              <Texto x={320} y={135} tamanho={14} className="fill-scene-b-ink">
                {`${shots} tiros`}
              </Texto>
            </>
          )}
          {sounds > 0 && (
            <Texto x={310} y={125} tamanho={18} className="fill-scene-b-ink" fontWeight="700">
              {`♪ ${sounds} vezes`}
            </Texto>
          )}
          {isLives && (
            <>
              <Texto x={24} y={75} tamanho={palco.estreito ? 17 : 15} className="fill-scene-ink">
                {`Vidas: ${hearts} · Batidas: ${hits}`}
              </Texto>
              {HEART_SLOTS.map((slot, index) => (
                <circle
                  key={slot}
                  cx={35 + index * 34}
                  cy={105}
                  r={10}
                  className={
                    index < hearts ? 'fill-scene-alert' : 'fill-scene-card stroke-scene-line'
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function OnceVsAlwaysControls({
  state,
  cast,
  preset,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  preset?: OnceVsAlwaysPreset
  dispatch: (action: SceneAction) => void
}) {
  const prepared = oncePreset(preset)
  const [selectedId, setSelectedId] = useState<OnceCardId | null>(null)
  const selected = prepared.cards.find((card) => card.id === selectedId) ?? null
  const place = (area: OncePlacement) => {
    if (!selected) return
    dispatch({ type: 'place-in-area', card: selected.id, area })
    setSelectedId(null)
  }
  return (
    <div className="sz-once-controls space-y-2">
      <p className="text-sm text-muted-foreground">
        Escolha uma ficha e depois onde colocá-la. Você também pode arrastar.
      </p>
      <div className="sz-once-areas">
        {(['outside', ...prepared.areas] as OncePlacement[]).map((area) => (
          <div
            key={area}
            className={`sz-once-area${area === 'outside' ? ' sz-once-area--available' : ''}`}
            data-once-area={area}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const card = prepared.cards.find(
                (item) => item.id === event.dataTransfer.getData('text/plain'),
              )
              if (card) {
                dispatch({ type: 'place-in-area', card: card.id, area })
                setSelectedId(null)
              }
            }}
          >
            <div className="sz-once-area-heading">
              <p className="text-sm font-semibold">
                {area === 'outside' ? 'Fichas disponíveis' : AREA_LABEL[area]}
              </p>
              {selected && state.once.placement[selected.id] !== area && (
                <SceneButton
                  className="h-auto max-w-full whitespace-normal px-2"
                  aria-label={`${area === 'outside' ? 'Devolver para Fichas disponíveis' : `Colocar em ${AREA_LABEL[area]}`}: ${castText(selected.label, cast)}`}
                  onClick={() => place(area)}
                >
                  {area === 'outside' ? 'Devolver aqui' : 'Colocar aqui'}
                </SceneButton>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {prepared.cards
                .filter((card) => state.once.placement[card.id] === area)
                .map((card) => (
                  <SceneButton
                    key={card.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
                    aria-pressed={selected?.id === card.id}
                    tom={selected?.id === card.id ? 'ligado' : 'ferramenta'}
                    className="sz-once-card cursor-grab active:cursor-grabbing"
                    onClick={() => setSelectedId(selected?.id === card.id ? null : card.id)}
                  >
                    <span className="sz-once-card-label">{castText(card.label, cast)}</span>
                    <span className="sz-once-card-count">
                      {state.once.fires[card.id]}{' '}
                      {state.once.fires[card.id] === 1 ? 'vez' : 'vezes'}
                    </span>
                  </SceneButton>
                ))}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <p role="status" className="text-sm font-medium text-primary">
          {castText(selected.label, cast)} escolhida. Agora escolha uma área.
        </p>
      )}
      {prepared.areas.includes('event') && (
        <div className="flex flex-wrap items-center gap-3">
          <SceneButton
            tom="gesto"
            fechado={state.once.placement.event !== 'event'}
            onClick={() => dispatch({ type: 'trigger' })}
          >
            Apertar a tecla
          </SceneButton>
          {state.once.placement.event !== 'event' && (
            <p className="text-sm text-muted-foreground">
              Abre quando a ficha do evento estiver em Quando acontecer.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
