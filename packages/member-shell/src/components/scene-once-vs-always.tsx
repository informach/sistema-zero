'use client'

import {
  actorFigure,
  castText,
  type OnceArea,
  type OncePlacement,
  type OnceVsAlwaysPreset,
  oncePreset,
  type SceneAction,
  type SceneCast,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

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
  return (
    <SceneCanvas
      cast={chosenCast}
      mundo={mundo}
      titulo="O jogo reagindo às fichas do projeto"
      descricao={`Quadro ${frames}. ${heroCount} personagens, ${shots} tiros, ${sounds} sons, ${hearts} vidas e ${hits} batidas.`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={248} detalhe="calmo" />
          {!background && <rect x={0} y={0} width={560} height={300} className="fill-scene-card" />}
          <path d="M0 248H560" className="stroke-scene-line" strokeWidth={2} />
          <Texto x={24} y={35} tamanho={15} className="fill-scene-ink" fontWeight="700">
            {`Quadro ${frames}`}
          </Texto>
          {HERO_SLOTS.slice(0, heroCount).map((slot, index) => (
            <ActorFigure key={slot} figure={hero} x={Math.min(490, heroX + index * 76)} y={248} />
          ))}
          <ActorFigure
            figure={obstacle}
            x={isLives ? (frames > 0 && frames % 3 === 0 ? 95 : 315 - (frames % 3) * 75) : 465}
            y={248}
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
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Arraste as fichas entre as áreas ou escolha a área pelos botões. Depois avance quadros para
        ver o que acontece.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(['outside', ...prepared.areas] as OncePlacement[]).map((area) => (
          <div
            key={area}
            className="min-h-28 rounded-2xl border-2 border-dashed border-border bg-card p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const card = prepared.cards.find(
                (item) => item.id === event.dataTransfer.getData('text/plain'),
              )
              if (card) dispatch({ type: 'place-in-area', card: card.id, area })
            }}
          >
            <p className="mb-2 text-sm font-semibold">
              {area === 'outside' ? 'Fichas de fora' : AREA_LABEL[area]}
            </p>
            <div className="flex flex-wrap gap-2">
              {prepared.cards
                .filter((card) => state.once.placement[card.id] === area)
                .map((card) => (
                  <span
                    key={card.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
                    className="cursor-grab rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary active:cursor-grabbing"
                  >
                    {castText(card.label, cast)} · {state.once.fires[card.id]}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3">
        {prepared.cards.map((card) => (
          <Escolha<OncePlacement>
            key={card.id}
            label={`${castText(card.label, cast)} · disparou ${state.once.fires[card.id]} ${state.once.fires[card.id] === 1 ? 'vez' : 'vezes'}`}
            valor={state.once.placement[card.id]}
            opcoes={[
              { id: 'outside', label: 'Fora' },
              ...prepared.areas.map((area) => ({ id: area, label: AREA_LABEL[area] })),
            ]}
            onChange={(area) => dispatch({ type: 'place-in-area', card: card.id, area })}
          />
        ))}
      </div>
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
