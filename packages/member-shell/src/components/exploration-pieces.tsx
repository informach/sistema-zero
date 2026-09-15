'use client'

import type {
  SceneAction,
  SceneActivity,
  SceneCast,
  ScenePort,
  SceneState,
} from '@sistemazero/core/learning/scene'
import { castText } from '@sistemazero/core/learning/scene'
import { type PointerEvent, type RefObject, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExperienceConnection as Connection } from './experience-connection'
import { CactusFigure, DinoFigure, SceneButton, TreeFigure } from './exploration-stage'

function usePieceDrag(zones: RefObject<HTMLDivElement | null>, label: string) {
  const [drag, setDrag] = useState<{
    id: number
    x: number
    y: number
    slot: number | null
  } | null>(null)
  const locate = (event: PointerEvent<HTMLButtonElement>) => {
    const b = zones.current?.getBoundingClientRect()
    return b &&
      event.clientX >= b.left &&
      event.clientX <= b.right &&
      event.clientY >= b.top &&
      event.clientY <= b.bottom
      ? event.clientX < b.left + b.width / 2
        ? 0
        : 1
      : null
  }
  return {
    slot: drag?.slot,
    active: drag !== null,
    start: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setDrag({ id: e.pointerId, x: e.clientX, y: e.clientY, slot: locate(e) })
    },
    move: (e: PointerEvent<HTMLButtonElement>) => {
      if (drag?.id === e.pointerId)
        setDrag({ ...drag, x: e.clientX, y: e.clientY, slot: locate(e) })
    },
    cancel: () => setDrag(null),
    ghost: drag
      ? createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-primary bg-background px-5 py-3 text-sm font-semibold text-primary shadow-lg"
            style={{ left: drag.x, top: drag.y }}
          >
            {label}
          </div>,
          document.body,
        )
      : null,
  }
}

function LayerPieces({
  front,
  dispatch,
  cast,
}: {
  front: boolean
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
}) {
  const [selected, setSelected] = useState<'dino' | 'forest'>('dino')
  const tray = useRef<HTMLDivElement>(null)
  // ⚠️ O nome das peças passa pelo ELENCO: numa turma de nave a criança arrasta "Nave" e
  // "Nebulosa", não "Dino" e "Floresta". Sem isto a bancada continuava falando de um curso e a
  // faixa de estado logo acima, de outro.
  const nome = (peca: string) => castText(peca === 'dino' ? 'Dino' : 'Floresta', cast)
  const drag = usePieceDrag(tray, nome(selected))
  function place(last: boolean, piece = selected) {
    dispatch({ type: 'layer', front: piece === 'dino' ? last : !last })
  }
  return (
    <div
      className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') drag.cancel()
      }}
    >
      {drag.ghost}
      <p className="text-sm font-semibold">A ordem de desenhar</p>
      <div ref={tray} className="grid grid-cols-2 gap-3">
        {(front ? ['forest', 'dino'] : ['dino', 'forest']).map((piece, index) => (
          <button
            type="button"
            key={piece}
            className={`flex min-h-24 touch-none items-center justify-center gap-3 rounded-xl border-2 bg-background p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${drag.slot === index ? 'border-dashed border-primary ring-4 ring-primary/15' : selected === piece ? 'border-primary' : 'border-border'}`}
            aria-pressed={selected === piece}
            onClick={() => setSelected(piece === 'dino' ? 'dino' : 'forest')}
            onPointerDown={(event) => {
              drag.start(event)
              setSelected(piece === 'dino' ? 'dino' : 'forest')
            }}
            onPointerUp={(event) => {
              if (!drag.active) return
              const bounds = tray.current?.getBoundingClientRect()
              if (
                bounds &&
                event.clientX >= bounds.left &&
                event.clientX <= bounds.right &&
                event.clientY >= bounds.top &&
                event.clientY <= bounds.bottom
              )
                place(
                  event.clientX > bounds.left + bounds.width / 2,
                  piece === 'dino' ? 'dino' : 'forest',
                )
              drag.cancel()
            }}
            onPointerMove={drag.move}
            onPointerCancel={drag.cancel}
            onLostPointerCapture={drag.cancel}
          >
            <svg viewBox="0 0 70 64" className="h-14 w-16 text-primary" aria-hidden="true">
              {piece === 'dino' ? (
                <DinoFigure x={37} y={58} />
              ) : (
                <>
                  <TreeFigure x={26} y={60} scale={0.4} />
                  <TreeFigure x={48} y={60} scale={0.32} dark />
                </>
              )}
            </svg>
            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">
                {index === 0 ? 'Antes' : 'Depois'}
              </span>
              {nome(piece)}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Arraste a peça ou escolha seu lugar:</span>
        <SceneButton onClick={() => place(false)}>Antes</SceneButton>
        <SceneButton onClick={() => place(true)}>Depois</SceneButton>
      </div>
    </div>
  )
}

function ConditionPiece({
  state,
  dispatch,
  score,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  score: boolean
}) {
  const [picked, setPicked] = useState(false)
  const zones = useRef<HTMLDivElement>(null)
  const label = score ? '＋ Somar ponto' : '◷ Relógio'
  const drag = usePieceDrag(zones, label)
  const put = (enabled: boolean) => {
    dispatch({ type: 'connect', port: 'condition', enabled })
    setPicked(false)
  }
  const piece = (
    <SceneButton
      aria-pressed={picked}
      className="touch-none"
      onClick={(event) => {
        if (event.detail === 0) setPicked(true)
      }}
      onPointerDown={(event) => {
        drag.start(event)
        setPicked(true)
      }}
      onPointerUp={(event) => {
        if (!drag.active) return
        const bounds = zones.current?.getBoundingClientRect()
        if (
          bounds &&
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        )
          put(event.clientX >= bounds.left + bounds.width / 2)
        drag.cancel()
      }}
      onPointerMove={drag.move}
      onPointerCancel={() => {
        drag.cancel()
        setPicked(false)
      }}
      onLostPointerCapture={drag.cancel}
    >
      {label}
    </SceneButton>
  )
  return (
    <div
      className="space-y-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          drag.cancel()
          setPicked(false)
        }
      }}
    >
      {drag.ghost}
      <div ref={zones} className="grid grid-cols-2 gap-3">
        {[false, true].map((guarded) => (
          <div
            key={String(guarded)}
            className={`min-h-28 space-y-3 rounded-2xl border-2 border-dashed p-3 ${drag.slot === (guarded ? 1 : 0) ? 'border-primary bg-primary/10 ring-4 ring-primary/15' : guarded ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}
          >
            <p className="text-sm font-semibold">{guarded ? 'Se jogando' : 'Em qualquer tela'}</p>
            {state.match.guarded === guarded ? (
              piece
            ) : (
              <SceneButton tom="gesto" disabled={!picked} onClick={() => put(guarded)}>
                Colocar aqui
              </SceneButton>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Mova a peça ou toque nela e depois em Colocar aqui.
      </p>
    </div>
  )
}

export function ExplorationPieces({
  activity,
  state,
  dispatch,
  more,
}: {
  activity: SceneActivity
  state: SceneState
  dispatch: (action: SceneAction) => void
  more: boolean
}) {
  const m = activity.scene
  // ⚠️ O elenco entra AQUI, no helper, e não em cada chamada: os nomes dos fios citam o
  // personagem e o obstáculo ("Dino", "Nascer cacto"), e uma chamada esquecida deixaria um fio
  // falando do Corre Dino no meio de um curso de nave.
  const connection = (
    port: ScenePort,
    source: string,
    target: string,
    enabled: boolean,
    alternative = 'Desligar fio',
  ) => (
    <Connection
      source={castText(source, activity.cast)}
      target={castText(target, activity.cast)}
      alternative={castText(alternative, activity.cast)}
      enabled={enabled}
      onConnect={(enabled) => dispatch({ type: 'connect', port, enabled })}
    />
  )
  return (
    <div className="space-y-3">
      {m === 'world' && (
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-primary/25 p-3">
          {/* ⚠️⚠️ A linha "Bastidores · ainda vazio" SAIU (lote 5). Desde que o palco mostra os
              bastidores e a tela lado a lado, ela era a mesma informação escrita duas vezes na
              mesma tela — e o desenho diz melhor: a caixa ou está vazia, ou tem o Dino dentro. */}
          {!state.world.created ? (
            /* ⚠️⚠️ É ESTE o botão do print: a ação que MOVE a cena era um botãozinho de
               ferramenta dentro de uma caixa tracejada, enquanto "Ver de novo" era o azul grande
               do rodapé. A criança abria a primeira experimentação do curso carro-chefe e o
               caminho para a frente era a coisa mais fraca da tela. */
            <SceneButton tom="gesto" onClick={() => dispatch({ type: 'create' })}>
              {castText('＋ Criar Dino', activity.cast)}
            </SceneButton>
          ) : (
            <>
              {connection('draw', 'Desenhar', 'Tela do jogo', state.world.drawn)}
              <span className="text-xs text-muted-foreground">
                {/* ⚠️ "continua nos bastidores" e não "continua guardado": a régua do elenco só
                  flexiona o que está COLADO ao nome, então um particípio distante viraria "A nave
                  continua guardado" numa turma de nave. Texto do player precisa sobreviver à
                  troca de elenco. */}
                {castText(
                  'O Dino continua nos bastidores com o desenho ligado ou desligado.',
                  activity.cast,
                )}
              </span>
            </>
          )}
        </div>
      )}
      {m === 'layers' && (
        <LayerPieces front={state.world.front} dispatch={dispatch} cast={activity.cast} />
      )}
      {m === 'gravity' &&
        (state.evidence.discoveries.includes('floating') || state.flight.gravity || more) &&
        connection('gravity', 'Gravidade do mundo', 'Dino', state.flight.gravity, 'Não aplicar')}
      {m === 'jump-sound' &&
        (state.evidence.discoveries.includes('false-sound') || state.sound.onJump || more) &&
        connection('sound', 'Som', 'Pulou', state.sound.onJump, 'Voltar para Espaço')}
      {m === 'spawn' &&
        (state.evidence.discoveries.includes('every-frame') || state.crowd.timer || more) && (
          <>
            {connection(
              'timer',
              'Relógio',
              'Nascer cacto',
              state.crowd.timer,
              'Criar a cada quadro',
            )}
            {state.crowd.timer && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">◷ Intervalo</span>
                {[0.5, 1, 2].map((seconds) => (
                  <SceneButton
                    key={seconds}
                    aria-pressed={state.crowd.interval === seconds}
                    onClick={() => dispatch({ type: 'interval', seconds })}
                  >
                    {seconds.toLocaleString('pt-BR')} s
                  </SceneButton>
                ))}
              </div>
            )}
          </>
        )}
      {m === 'cleanup' &&
        (state.evidence.discoveries.includes('invisible-stored') || state.crowd.cleanup || more) &&
        connection(
          'cleanup',
          'Remover do grupo',
          'Saída da tela',
          state.crowd.cleanup,
          'Retirar regra',
        )}
      {m === 'lives' && (
        <div className="space-y-3">
          {/* ⚠️ Os DOIS fios juntos, e nenhum deles escondido atrás de descoberta: a cena é
            sobre as duas contagens serem independentes, e isso só aparece quando dá para
            ligar e desligar cada uma delas com a outra à vista. */}
          {connection(
            'condition',
            '＋ Somar ponto',
            'Enquanto tem vida',
            state.lifeline.scoring,
            'Desligar fio',
          )}
          {connection('life', 'Bateu', '− Perder uma vida', state.lifeline.onHit, 'Desligar fio')}
        </div>
      )}
      {(m === 'game-state' || m === 'score') && (
        <ConditionPiece state={state} dispatch={dispatch} score={m === 'score'} />
      )}
      {m === 'controls' &&
        (state.evidence.discoveries.includes('missing-touch') || state.match.touch || more) &&
        connection('touch', 'Toque', 'Começar', state.match.touch)}
      {m === 'restart' &&
        (state.match.screen === 'end' || state.match.restartConnected || more) &&
        connection(
          'restart',
          'Jogar de novo',
          'Iniciar outra rodada',
          state.match.restartConnected,
        )}
      {m === 'random' && (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-semibold">🎲 Sorteador · compare uma coisa por vez</p>
          <div className="flex flex-wrap gap-2">
            <SceneButton
              onClick={() =>
                dispatch({
                  type: 'sample',
                  kind: 'position',
                  unit: state.speed.samples.positions.length === 1 ? 1 : 0,
                  guided: true,
                })
              }
            >
              Exemplo de posição {state.speed.samples.positions.length === 1 ? 'B' : 'A'}
            </SceneButton>
            {(state.evidence.discoveries.includes('positions') || more) && (
              <SceneButton
                onClick={() =>
                  dispatch({
                    type: 'sample',
                    kind: 'velocity',
                    unit: state.speed.samples.velocities.length === 1 ? 1 : 0,
                    guided: true,
                  })
                }
              >
                Exemplo de velocidade {state.speed.samples.velocities.length === 1 ? 'B' : 'A'}
              </SceneButton>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Os exemplos A e B foram escolhidos para mostrar o contraste.
          </p>
          {more && (
            <div className="flex flex-wrap gap-2">
              {(['position', 'velocity'] as const).map((kind) => (
                <SceneButton
                  key={kind}
                  onClick={() =>
                    dispatch({ type: 'sample', kind, unit: Math.random(), guided: false })
                  }
                >
                  Sortear {kind === 'position' ? 'posição' : 'velocidade'}
                </SceneButton>
              ))}
              <p className="basis-full text-xs text-muted-foreground">
                No sorteio livre, resultados podem se repetir.
              </p>
            </div>
          )}
        </div>
      )}
      {m === 'acceleration' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <SceneButton
              onClick={() =>
                dispatch({
                  type: 'sample',
                  kind: 'velocity',
                  unit: state.crowd.born === 0 ? 0 : 1,
                  guided: true,
                })
              }
            >
              <svg width="18" height="24" viewBox="-25 -65 55 70" aria-hidden="true">
                <CactusFigure x={0} y={0} />
              </svg>
              {castText('Novo cacto · descontar', activity.cast)}{' '}
              {state.crowd.born === 0 ? '0' : '1'}
            </SceneButton>
            <SceneButton tom="gesto" onClick={() => dispatch({ type: 'clock' })}>
              ◷ Avançar o relógio
            </SceneButton>
          </div>
          {connection(
            'limit',
            'Placa: limite −9',
            'Base de velocidade',
            state.speed.limited,
            'Retirar limite',
          )}
        </div>
      )}
    </div>
  )
}
