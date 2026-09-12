'use client'

import type {
  ExplorationAction,
  ExplorationActivity,
  ExplorationPort,
  ExplorationState,
} from '@sistemazero/core/learning'
import { useId, useRef, useState } from 'react'
import { CactusFigure, DinoFigure, SceneButton, TreeFigure } from './exploration-stage'

function Connection({
  source,
  target,
  alternative,
  enabled,
  onConnect,
}: {
  source: string
  target: string
  alternative: string
  enabled: boolean
  onConnect: (enabled: boolean) => void
}) {
  const id = useId()
  const [selected, setSelected] = useState(false)
  const targetRef = useRef<HTMLButtonElement>(null)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      <SceneButton
        aria-pressed={selected}
        className="touch-none"
        onClick={(event) => {
          if (event.detail === 0) setSelected(true)
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setSelected(true)
        }}
        onPointerUp={(event) => {
          const bounds = targetRef.current?.getBoundingClientRect()
          if (
            bounds &&
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom
          ) {
            onConnect(true)
            setSelected(false)
          }
        }}
      >
        ◉ {source}
      </SceneButton>
      <svg
        width="54"
        height="24"
        viewBox="0 0 54 24"
        aria-hidden="true"
        className={enabled ? 'text-primary' : 'text-muted-foreground/50'}
      >
        <path
          d="M0 12H54"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={enabled ? undefined : '4 5'}
        />
        <circle cx="48" cy="12" r="4" fill="currentColor" />
      </svg>
      <button
        ref={targetRef}
        type="button"
        aria-describedby={`${id}-help`}
        onClick={() => {
          if (selected) {
            onConnect(true)
            setSelected(false)
          }
        }}
        className={`min-h-14 rounded-xl border-2 border-dashed px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${selected ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
      >
        ◎ {target}
      </button>
      {enabled && <SceneButton onClick={() => onConnect(false)}>{alternative}</SceneButton>}
      <p id={`${id}-help`} className="basis-full text-xs text-muted-foreground">
        {selected
          ? `Agora toque em ${target} para ligar.`
          : enabled
            ? `${source} está ligado a ${target}.`
            : 'Pegue o fio e leve ao destino. Ou toque na origem e depois no destino.'}
      </p>
    </div>
  )
}

function LayerPieces({
  front,
  dispatch,
}: {
  front: boolean
  dispatch: (action: ExplorationAction) => void
}) {
  const [selected, setSelected] = useState<'dino' | 'forest'>('dino')
  const tray = useRef<HTMLDivElement>(null)
  function place(last: boolean, piece = selected) {
    dispatch({ type: 'layer', front: piece === 'dino' ? last : !last })
  }
  return (
    <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-semibold">A ordem de desenhar</p>
      <div ref={tray} className="grid grid-cols-2 gap-3">
        {(front ? ['forest', 'dino'] : ['dino', 'forest']).map((piece, index) => (
          <button
            type="button"
            key={piece}
            className={`flex min-h-24 touch-none items-center justify-center gap-3 rounded-xl border-2 bg-background p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${selected === piece ? 'border-primary' : 'border-border'}`}
            aria-pressed={selected === piece}
            onClick={() => setSelected(piece === 'dino' ? 'dino' : 'forest')}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setSelected(piece === 'dino' ? 'dino' : 'forest')
            }}
            onPointerUp={(event) => {
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
            }}
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
              {piece === 'dino' ? 'Dino' : 'Floresta'}
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
  state: ExplorationState
  dispatch: (action: ExplorationAction) => void
  score: boolean
}) {
  const [picked, setPicked] = useState(false)
  const zones = useRef<HTMLDivElement>(null)
  const label = score ? '＋ Somar ponto' : '◷ Relógio'
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
        event.currentTarget.setPointerCapture(event.pointerId)
        setPicked(true)
      }}
      onPointerUp={(event) => {
        const bounds = zones.current?.getBoundingClientRect()
        if (
          bounds &&
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        )
          put(event.clientX >= bounds.left + bounds.width / 2)
      }}
    >
      {label}
    </SceneButton>
  )
  return (
    <div className="space-y-2">
      <div ref={zones} className="grid grid-cols-2 gap-3">
        {[false, true].map((guarded) => (
          <div
            key={String(guarded)}
            className={`min-h-28 space-y-3 rounded-2xl border-2 border-dashed p-3 ${guarded ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}
          >
            <p className="text-sm font-semibold">{guarded ? 'Se jogando' : 'Em qualquer tela'}</p>
            {state.guarded === guarded ? (
              piece
            ) : (
              <SceneButton disabled={!picked} onClick={() => put(guarded)}>
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
  activity: ExplorationActivity
  state: ExplorationState
  dispatch: (action: ExplorationAction) => void
  more: boolean
}) {
  const m = activity.mission
  const connection = (
    port: ExplorationPort,
    source: string,
    target: string,
    enabled: boolean,
    alternative = 'Desligar fio',
  ) => (
    <Connection
      source={source}
      target={target}
      alternative={alternative}
      enabled={enabled}
      onConnect={(enabled) => dispatch({ type: 'connect', port, enabled })}
    />
  )
  return (
    <div className="space-y-3">
      {m === 'world' && (
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-primary/25 p-3">
          <p className="text-sm font-semibold">
            Bastidores · {state.created ? '1 Dino guardado' : 'ainda vazio'}
          </p>
          {!state.created ? (
            <SceneButton onClick={() => dispatch({ type: 'create' })}>＋ Criar Dino</SceneButton>
          ) : (
            <>
              {connection('draw', 'Desenhar', 'Tela do jogo', state.drawn)}
              <span className="text-xs text-muted-foreground">
                O Dino continua guardado aqui com o desenho ligado ou desligado.
              </span>
            </>
          )}
        </div>
      )}
      {m === 'layers' && <LayerPieces front={state.front} dispatch={dispatch} />}
      {m === 'gravity' &&
        (state.discoveries.includes('floating') || state.gravity || more) &&
        connection('gravity', 'Gravidade do mundo', 'Dino', state.gravity, 'Não aplicar')}
      {m === 'jump-sound' &&
        (state.discoveries.includes('false-sound') || state.soundOnJump || more) &&
        connection('sound', 'Som', 'Pulou', state.soundOnJump, 'Voltar para Espaço')}
      {m === 'spawn' && (state.discoveries.includes('every-frame') || state.timer || more) && (
        <>
          {connection('timer', 'Relógio', 'Nascer cacto', state.timer, 'Criar a cada quadro')}
          {state.timer && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">◷ Intervalo</span>
              {[0.5, 1, 2].map((seconds) => (
                <SceneButton
                  key={seconds}
                  aria-pressed={state.interval === seconds}
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
        (state.discoveries.includes('invisible-stored') || state.cleanup || more) &&
        connection('cleanup', 'Remover do grupo', 'Saída da tela', state.cleanup, 'Retirar regra')}
      {(m === 'game-state' || m === 'score') && (
        <ConditionPiece state={state} dispatch={dispatch} score={m === 'score'} />
      )}
      {m === 'controls' &&
        (state.discoveries.includes('missing-touch') || state.touch || more) &&
        connection('touch', 'Toque', 'Começar', state.touch)}
      {m === 'restart' &&
        (state.screen === 'end' || state.restartConnected || more) &&
        connection('restart', 'Jogar de novo', 'Iniciar outra rodada', state.restartConnected)}
      {m === 'random' && (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-semibold">🎲 Sorteador · compare uma coisa por vez</p>
          <div className="flex flex-wrap gap-2">
            <SceneButton
              onClick={() =>
                dispatch({
                  type: 'sample',
                  kind: 'position',
                  unit: state.positionSamples.length === 1 ? 1 : 0,
                  guided: true,
                })
              }
            >
              Exemplo de posição {state.positionSamples.length === 1 ? 'B' : 'A'}
            </SceneButton>
            {(state.discoveries.includes('positions') || more) && (
              <SceneButton
                onClick={() =>
                  dispatch({
                    type: 'sample',
                    kind: 'velocity',
                    unit: state.velocitySamples.length === 1 ? 1 : 0,
                    guided: true,
                  })
                }
              >
                Exemplo de velocidade {state.velocitySamples.length === 1 ? 'B' : 'A'}
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
                  unit: state.born === 0 ? 0 : 1,
                  guided: true,
                })
              }
            >
              <svg width="18" height="24" viewBox="-25 -65 55 70" aria-hidden="true">
                <CactusFigure x={0} y={0} />
              </svg>
              Novo cacto · descontar {state.born === 0 ? '0' : '1'}
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'clock' })}>
              ◷ Avançar o relógio
            </SceneButton>
          </div>
          {connection(
            'limit',
            'Placa: limite −9',
            'Base de velocidade',
            state.limited,
            'Retirar limite',
          )}
        </div>
      )}
    </div>
  )
}
