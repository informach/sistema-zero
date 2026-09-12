'use client'

import {
  type ExplorationAction,
  type ExplorationActivity,
  type ExplorationState,
  explorationContact,
} from '@sistemazero/core/learning'
import { type ComponentProps, type PointerEvent, type ReactNode, useId, useRef } from 'react'

// A small workbench around the child's Dino: the scene, pieces and consequences share space.
// Existing Kids typography/tokens carry the chrome; blue gravity and amber impulse stay distinct.
export function DinoFigure({ x, y, ghost = false }: { x: number; y: number; ghost?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={ghost ? 0.3 : 1}>
      <path
        d="M-22 -8V-33H-12V-51H20V-30H4V-20H18V-13H-1V0H-11V-9H-18V0H-27V-12L-39 -24V-36L-22 -22Z"
        fill="currentColor"
      />
      <rect x="9" y="-44" width="5" height="5" rx="1" fill="white" />
    </g>
  )
}
export function CactusFigure({ x, y = 238 }: { x: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M-7 0V-20H-20V-40H-12V-29H-7V-54Q0 -64 7 -54V-36H14V-47H22V-27H7V0Z"
        fill="#457953"
      />
      <path d="M0 -49V-8" stroke="#b3d59a" strokeWidth="2" />
    </g>
  )
}
export function TreeFigure({
  x,
  y,
  scale = 1,
  dark = false,
}: {
  x: number
  y: number
  scale?: number
  dark?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-6 -73H6V0H-6Z" fill="#896746" />
      <path
        d="M-43 -28L-25 -61H-35L-16 -91H-25L0 -138L25 -91H16L35 -61H25L43 -28Z"
        fill={dark ? '#3e6a4e' : '#678865'}
      />
    </g>
  )
}
export function SceneButton({ children, className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-semibold shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  )
}

/** Pointer input has click destinations and semantic buttons elsewhere in the scene.
 * Pointer capture tracks touch without requiring native HTML drag-and-drop. */
function Handle({
  label,
  x,
  y,
  value,
  min,
  max,
  axis = 'x',
  unitsPerPixel = 1,
  onValue,
  children,
}: {
  label: string
  x: number
  y: number
  value: number
  min: number
  max: number
  axis?: 'x' | 'y'
  unitsPerPixel?: number
  onValue: (value: number) => void
  children: ReactNode
}) {
  const drag = useRef<{ start: number; value: number; scale: number } | null>(null)
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)))
  function down(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!bounds) return
    drag.current = {
      start: axis === 'x' ? event.clientX : event.clientY,
      value,
      scale: 600 / bounds.width,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="absolute z-10 grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-xl border-2 border-primary/60 bg-background/90 px-2 text-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:cursor-grabbing"
      style={{ left: `${x / 6}%`, top: `${y / 3.1}%` }}
      onPointerDown={down}
      onPointerMove={(event) => {
        if (!drag.current) return
        const offset =
          ((axis === 'x' ? event.clientX : event.clientY) - drag.current.start) * drag.current.scale
        onValue(clamp(drag.current.value + offset * unitsPerPixel * (axis === 'y' ? -1 : 1)))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) {
          event.preventDefault()
          onValue(
            clamp(
              value +
                (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1) *
                  (axis === 'y' ? 1 : 5),
            ),
          )
        }
      }}
    >
      {children}
    </button>
  )
}

export function ExplorationStage({
  activity,
  state,
  dispatch,
  paused,
}: {
  activity: ExplorationActivity
  state: ExplorationState
  dispatch: (action: ExplorationAction) => void
  paused: boolean
}) {
  const sceneId = useId()
  const m = activity.mission
  const motion = ['gravity', 'impulse', 'jump-sound'].includes(m)
  const collision = m === 'hitbox' || m === 'restart'
  const speed = m === 'random' || m === 'acceleration'
  const visibleSpeedCacti = state.cacti.filter((c) => c.x >= 0 && c.x * 0.9 <= 600)
  const outsideSpeedCount = state.cacti.length - visibleSpeedCacti.length
  const population = ['spawn', 'cleanup', 'game-state'].includes(m)
  const screen = ['controls', 'restart', 'game-state', 'score'].includes(m)
  const dinoY = 238 - Math.min(160, state.y * 0.8)
  const contact = explorationContact(state)
  const layer = (
    <g>
      {[110, 170, 235].map((x, i) => (
        <TreeFigure key={x} x={x} y={i === 1 ? 238 : 253} dark={i === 1} />
      ))}
    </g>
  )
  const dino = (
    <g className="text-primary">
      <DinoFigure x={170} y={motion ? dinoY : 238} />
    </g>
  )
  const canJump = motion && (state.flightTime === null || m === 'jump-sound')
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[#f8f6e9]">
        <svg
          viewBox="0 0 600 310"
          className="block w-full"
          role="img"
          aria-labelledby={`${sceneId}-title ${sceneId}-desc`}
        >
          <title id={`${sceneId}-title`}>Cena da descoberta</title>
          <desc id={`${sceneId}-desc`}>
            {state.caption ||
              (activity.mode === 'demonstrate'
                ? 'Observe o que acontece na cena.'
                : 'Use as peças e os controles da cena para começar.')}
          </desc>
          <defs>
            <pattern id={`${sceneId}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#c9ceba" />
            </pattern>
          </defs>
          <rect width="600" height="310" fill={`url(#${sceneId}-dots)`} opacity="0.35" />
          <path d="M0 238H600V310H0Z" fill="#e4ebd2" />
          <path d="M0 238H600" stroke="#8ba077" strokeWidth="2" />
          <path d="M390 180L460 115L530 180Z" fill="#dfe5d0" />
          <text x="20" y="28" fill="#42503a" fontSize="13" fontWeight="600">
            {m === 'world'
              ? 'TELA DO JOGO'
              : screen
                ? state.screen === 'start'
                  ? 'INÍCIO'
                  : state.screen === 'end'
                    ? 'FIM DA PARTIDA'
                    : 'JOGANDO'
                : 'SEU LABORATÓRIO DINO'}
          </text>
          {m === 'layers' ? (
            <>
              {state.front ? layer : dino}
              {state.front ? dino : layer}
            </>
          ) : state.created && state.drawn && (!screen || state.screen !== 'start') ? (
            dino
          ) : null}
          {m === 'world' && !state.drawn && (
            <text x="300" y="150" textAnchor="middle" fill="#576750" fontSize="16">
              {state.created ? 'Existe nos bastidores. E aqui?' : 'Quem vai morar neste jogo?'}
            </text>
          )}
          {motion && (
            <>
              <path d="M220 238V58" stroke="#9aa78c" strokeDasharray="3 5" />
              {state.observations
                .filter((o) => ['first-height', 'other-height', 'landed'].includes(o.id))
                .slice(-2)
                .map((o, i) => (
                  <g key={o.id}>
                    <path
                      d={`M115 ${238 - o.height * 0.8}H245`}
                      stroke={i ? '#c67431' : '#587f9a'}
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <text x="250" y={242 - o.height * 0.8} fill="#42503a" fontSize="12">
                      {i ? 'outra altura' : 'altura anterior'}
                    </text>
                  </g>
                ))}
              {state.y > 200 && (
                <text x="170" y="60" textAnchor="middle" fill="#315f92" fontSize="14">
                  ↑ continua subindo · {Math.round(state.y)} unidades
                </text>
              )}
              {m === 'impulse' && (
                <g stroke="#c67431" strokeWidth="5" fill="none">
                  <path d={`M105 236V${225 - state.force * 9}`} />
                  <path
                    d={`M97 ${235 - state.force * 9}L105 ${225 - state.force * 9}L113 ${235 - state.force * 9}`}
                  />
                </g>
              )}
              {state.gravity && (
                <g fill="#315f92">
                  <path d="M300 100V128H290L306 147L322 128H312V100Z" />
                  <text x="306" y="165" textAnchor="middle" fontSize="12">
                    gravidade
                  </text>
                </g>
              )}
              {m === 'jump-sound' && (
                <text x="410" y="85" textAnchor="middle" fill="#42503a" fontSize="15">
                  ♪ {state.soundCount} sons · {state.jumpCount} saltos
                </text>
              )}
            </>
          )}
          {collision && (
            <>
              <CactusFigure x={170 + state.distance} />
              <rect
                x={170 - state.width / 2}
                y="181"
                width={state.width}
                height="57"
                fill={contact ? '#de674d22' : '#5196c522'}
                stroke={contact ? '#ae3e2c' : '#315f92'}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <rect
                x={152 + state.distance}
                y="181"
                width="36"
                height="57"
                fill="none"
                stroke={contact ? '#ae3e2c' : '#457953'}
                strokeWidth="2"
              />
              <text
                x="430"
                y="64"
                fill={contact ? '#ae3e2c' : '#42503a'}
                fontSize="16"
                fontWeight="600"
              >
                {contact ? 'As áreas encostaram!' : 'Ainda estão separadas'}
              </text>
            </>
          )}
          {population &&
            state.cacti
              .filter((c) => c.x >= 0 && c.x <= 480)
              .slice(-24)
              .map((c) => <CactusFigure key={c.id} x={60 + c.x} />)}
          {population && (
            <text x="24" y="282" fill="#42503a" fontSize="14">
              {state.cacti.filter((c) => c.x >= 0 && c.x <= 480).length} na tela ·{' '}
              {state.born - state.removed} no grupo · {state.removed} removidos
            </text>
          )}
          {m === 'cleanup' && (
            <>
              <path d="M60 75V238" stroke="#a56838" strokeWidth="3" strokeDasharray="7 4" />
              <text x="65" y="90" fill="#825730" fontSize="12">
                saída
              </text>
            </>
          )}
          {m === 'score' && (
            <g>
              <rect
                x="345"
                y="72"
                width="170"
                height="110"
                rx="18"
                fill="#fffdf4"
                stroke="#a3af8f"
              />
              <text x="430" y="102" textAnchor="middle" fill="#42503a" fontSize="14">
                SEU PLACAR
              </text>
              <text
                x="430"
                y="156"
                textAnchor="middle"
                fill="#42503a"
                fontSize="46"
                fontWeight="700"
              >
                {state.points}
              </text>
            </g>
          )}
          {speed && (
            <>
              <path d="M450 76H504" stroke="#c67431" strokeWidth="8" opacity="0.5" />
              <text x="477" y="60" textAnchor="middle" fill="#825730" fontSize="13">
                {m === 'random' ? 'nascer: 500–560' : 'nascer: 500'}
              </text>
              {visibleSpeedCacti.slice(-4).map((c, i) => {
                const x = 0.9 * c.x
                return (
                  <g key={c.id} aria-label={`Cacto ${c.id}, velocidade ${c.velocity}`}>
                    <CactusFigure x={x} y={232 - i * 3} />
                    <path
                      d={`M${x} ${124 + i * 22}h${c.velocity * 9}l8 -5m-8 5l8 5`}
                      stroke={i % 2 ? '#c67431' : '#315f92'}
                      strokeWidth="3"
                      fill="none"
                    />
                    <text x={x + 5} y={129 + i * 22} fill="#42503a" fontSize="13">
                      {c.velocity}
                    </text>
                  </g>
                )
              })}
              <text x="22" y="282" fill="#42503a" fontSize="14">
                {m === 'acceleration'
                  ? `base ${state.base} · ${state.ticks} passos do relógio`
                  : 'Base −5 · descontar 0 ou 1 → −5 ou −6'}
              </text>
            </>
          )}
        </svg>
        {motion && (
          <button
            type="button"
            aria-label="Tocar no Dino para pular"
            disabled={!canJump}
            className="absolute z-10 min-h-14 min-w-16 -translate-x-1/2 -translate-y-full rounded-2xl border-2 border-dashed border-primary/60 bg-transparent focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
            style={{ left: '28.33%', top: `${dinoY / 3.1}%`, height: '23%', width: '13%' }}
            onClick={() => dispatch({ type: 'jump', input: 'tap' })}
          >
            <span className="sr-only">Pular</span>
          </button>
        )}
        {m === 'impulse' && (
          <Handle
            label="Ajustar seta do impulso com arraste ou setas"
            x={105}
            y={225 - state.force * 9}
            value={state.force}
            min={5}
            max={14}
            axis="y"
            unitsPerPixel={1 / 9}
            onValue={(force) => dispatch({ type: 'impulse', force })}
          >
            ↕
          </Handle>
        )}
        {collision && (
          <Handle
            label="Mover cacto com arraste ou setas"
            x={170 + state.distance}
            y={215}
            value={state.distance}
            min={20}
            max={260}
            onValue={(distance) => dispatch({ type: 'move', distance })}
          >
            ↔
          </Handle>
        )}
        {m === 'hitbox' && (
          <Handle
            label="Redimensionar área do Dino com arraste ou setas"
            x={170 + state.width / 2}
            y={180}
            value={state.width}
            unitsPerPixel={2}
            min={24}
            max={120}
            onValue={(width) => dispatch({ type: 'resize', width })}
          >
            ↔
          </Handle>
        )}
        {screen && state.screen === 'start' && (
          <div className="absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2">
            <SceneButton onClick={() => dispatch({ type: 'start', input: 'tap' })}>
              ▶ Toque para começar
            </SceneButton>
          </div>
        )}
        {m === 'restart' && state.screen === 'end' && (
          <div className="absolute left-1/2 top-[40%] -translate-x-1/2">
            <SceneButton onClick={() => dispatch({ type: 'restart' })}>↻ Jogar de novo</SceneButton>
          </div>
        )}
      </div>
      {motion && (
        <div className="flex flex-wrap items-center gap-2">
          <SceneButton onClick={() => dispatch({ type: 'jump', input: 'key' })} disabled={!canJump}>
            Espaço: pular
          </SceneButton>
          {m === 'impulse' &&
            [5, 9, 14].map((force, i) => (
              <SceneButton
                key={force}
                aria-pressed={state.force === force}
                onClick={() => dispatch({ type: 'impulse', force })}
              >
                {['↓ Baixo', '↕ Médio', '↑ Alto'][i]}
              </SceneButton>
            ))}
          {paused && state.flightTime !== null && (
            <span className="text-xs text-muted-foreground">
              Pausado: avance por passos para observar.
            </span>
          )}
        </div>
      )}
      {speed && outsideSpeedCount > 0 && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {outsideSpeedCount} {outsideSpeedCount === 1 ? 'cacto fora' : 'cactos fora'} da pista
        </p>
      )}
      {collision && (
        <div
          role="group"
          className="flex flex-wrap gap-2"
          aria-label="Destinos do cacto sem arrastar"
        >
          {[25, 60, 180].map((distance, i) => (
            <SceneButton key={distance} onClick={() => dispatch({ type: 'move', distance })}>
              {['Perto', 'No meio', 'Longe'][i]}
            </SceneButton>
          ))}
          {m === 'hitbox' && (
            <>
              <SceneButton
                onClick={() => dispatch({ type: 'resize', width: Math.max(24, state.width - 24) })}
              >
                − Área menor
              </SceneButton>
              <SceneButton
                onClick={() => dispatch({ type: 'resize', width: Math.min(120, state.width + 24) })}
              >
                + Área maior
              </SceneButton>
            </>
          )}
        </div>
      )}
      {screen && (
        <div className="flex flex-wrap gap-2">
          <SceneButton
            disabled={state.screen !== 'start'}
            onClick={() => dispatch({ type: 'start', input: 'key' })}
          >
            Enter: começar
          </SceneButton>
          <SceneButton
            disabled={state.screen === 'start'}
            onClick={() => dispatch({ type: 'home' })}
          >
            Voltar ao início
          </SceneButton>
          {(m === 'score' || m === 'restart') && (
            <SceneButton
              disabled={state.screen !== 'playing'}
              onClick={() => dispatch({ type: 'collide' })}
            >
              Aproximar até bater
            </SceneButton>
          )}
        </div>
      )}
    </div>
  )
}
