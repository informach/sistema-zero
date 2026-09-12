'use client'

import {
  type ExperienceTrial,
  type ExplorationActivity,
  type ExplorationState,
  experienceTrial,
  explorationContact,
  initialExploration,
  transitionExploration,
} from '@sistemazero/core/learning'
import { useId, useRef, useState } from 'react'
import { CactusFigure, DinoFigure } from './exploration-stage'

/** Live view and comparison use the same world coordinates and geometry. */
export function ExperienceScene({
  activity,
  state,
  onDistance,
  onJump,
  compact = false,
}: {
  activity: ExplorationActivity
  state: ExplorationState
  onDistance?: (distance: number) => void
  onJump?: (input: 'key' | 'tap') => void
  compact?: boolean
}) {
  const id = useId()
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ pointer: number; distance: number } | null>(null)
  const hitbox = activity.mission === 'hitbox'
  const distance = drag?.distance ?? state.distance
  const contact = explorationContact({ width: state.width, distance })
  const floor = 300
  const rise = Math.min(240, state.y * 0.65)
  const peak = Math.min(240, state.peak * 0.65)
  function worldX(clientX: number, clientY: number) {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return null
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()).x
  }
  return (
    <svg
      ref={svg}
      viewBox="0 0 640 360"
      role={onJump || onDistance ? 'group' : 'img'}
      aria-labelledby={`${id}-title ${id}-desc`}
      className="block h-auto w-full rounded-2xl"
      style={{ background: '#f7f5ee', touchAction: hitbox && onDistance ? 'none' : 'auto' }}
    >
      <title id={`${id}-title`}>{hitbox ? 'Áreas de colisão' : 'Laboratório de saltos'}</title>
      <desc id={`${id}-desc`}>
        {hitbox
          ? `Distância ${distance}. Largura ${state.width}. ${contact ? 'As áreas se tocam.' : 'As áreas estão separadas.'}`
          : `Impulso ${state.force}. Gravidade ${state.gravity ? 'ligada' : 'desligada'}. Altura máxima ${Math.round(state.peak)}. ${state.jumpCount} saltos, ${state.soundCount} sons.`}
      </desc>
      <defs>
        <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#d9ded3" />
        </pattern>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#eaf0e6" />
          <stop offset="1" stopColor="#f7f5ee" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="20" fill={`url(#${id}-sky)`} />
      <rect x="24" y="24" width="592" height="276" fill={`url(#${id}-grid)`} />
      <path d="M24 301H616" stroke="#506652" strokeWidth="2" />
      <path d="M24 313H616" stroke="#d0d8c6" strokeWidth="9" strokeDasharray="2 9" />
      <text x="32" y="44" fill="#536450" fontSize="12" fontWeight="700" letterSpacing="2">
        {hitbox ? 'OBSERVATÓRIO DE CONTATO' : 'OBSERVATÓRIO DO SALTO'}
      </text>
      {!hitbox && (
        <>
          {[0, 100, 200, 300].map((n) => (
            <g key={n}>
              <path d={`M48 ${floor - n * 0.65}h12`} stroke="#8a9986" />
              <text x="35" y={floor - n * 0.65 + 4} textAnchor="end" fill="#61735e" fontSize="10">
                {n}
              </text>
            </g>
          ))}
          {state.peak > 0 && (
            <g>
              <path
                d={`M74 ${floor - peak}H390`}
                stroke="#bf8733"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <text x="400" y={floor - peak + 4} fill="#85601f" fontSize="12">
                {Math.round(state.peak)} de altura
              </text>
            </g>
          )}
          <g
            style={{ color: '#287d59', cursor: onJump ? 'pointer' : undefined }}
            role={onJump ? 'button' : undefined}
            tabIndex={onJump ? 0 : undefined}
            aria-label={onJump ? 'Pular com o Dino' : undefined}
            onClick={() => onJump?.('tap')}
            onKeyDown={(e) => {
              if (onJump && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault()
                if (!e.repeat) onJump('key')
              }
            }}
          >
            <DinoFigure x={255} y={floor - rise} />
            {onJump && (
              <rect
                x="210"
                y={floor - rise - 65}
                width="80"
                height="80"
                rx="12"
                fill="transparent"
              />
            )}
          </g>
          {state.y > 369 && (
            <text x="140" y="78" fill="#536450" fontSize="13">
              ↑ Continua subindo: {Math.round(state.y)}
            </text>
          )}
          {state.y > 0 && (
            <ellipse
              cx="245"
              cy="302"
              rx={Math.max(10, 28 - rise / 14)}
              ry="4"
              fill="#7b8a74"
              opacity=".22"
            />
          )}
          <g transform="translate(468 94)">
            <rect width="132" height="78" rx="14" fill="#fffdf7" stroke="#d9dfd1" />
            <text x="14" y="26" fill="#536450" fontSize="12">
              IMPULSO
            </text>
            <text x="14" y="57" fill="#9e6a1b" fontSize="27" fontWeight="700">
              {state.force}
              <tspan fontSize="14"> ↑</tspan>
            </text>
          </g>
          <g transform="translate(468 185)">
            <rect width="132" height="78" rx="14" fill="#fffdf7" stroke="#d9dfd1" />
            <text x="14" y="26" fill="#536450" fontSize="12">
              GRAVIDADE
            </text>
            <text x="14" y="55" fill="#306da0" fontSize="17" fontWeight="700">
              {state.gravity ? 'Ligada ↓' : 'Desligada'}
            </text>
          </g>
          {activity.mission === 'jump-sound' && (
            <text x="78" y="340" fill="#4e634f" fontSize="14">
              ↑ {state.jumpCount} saltos <tspan dx="24">♫ {state.soundCount} sons</tspan>
              <tspan dx="24">Escuta: {state.soundOnJump ? 'Pulou' : 'Espaço'}</tspan>
            </text>
          )}
        </>
      )}
      {hitbox && (
        <>
          <g style={{ color: '#287d59' }}>
            <DinoFigure x={260} y={floor} />
          </g>
          <rect
            x={260 - state.width / 2}
            y={floor - 70}
            width={state.width}
            height="70"
            rx="4"
            fill={contact ? '#f9ac7150' : '#91bdec30'}
            stroke={contact ? '#b75c23' : '#347cad'}
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <g
            onPointerDown={
              onDistance
                ? (event) => {
                    if (event.button !== 0) return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDrag({ pointer: event.pointerId, distance: state.distance })
                  }
                : undefined
            }
            onPointerMove={(event) => {
              if (drag?.pointer !== event.pointerId) return
              const x = worldX(event.clientX, event.clientY)
              if (x !== null)
                setDrag({
                  pointer: event.pointerId,
                  distance: Math.round(Math.max(20, Math.min(260, x - 260))),
                })
            }}
            onPointerUp={(event) => {
              if (drag?.pointer === event.pointerId) {
                onDistance?.(drag.distance)
                setDrag(null)
              }
            }}
            onPointerCancel={() => setDrag(null)}
            onLostPointerCapture={() => setDrag(null)}
            style={{ cursor: onDistance ? (drag ? 'grabbing' : 'grab') : undefined }}
          >
            {drag && (
              <rect
                x={260 + distance - 28}
                y={floor - 76}
                width="56"
                height="80"
                rx="12"
                fill="#d5e5b5"
                stroke="#54803c"
                strokeDasharray="4 3"
              />
            )}
            <CactusFigure x={260 + distance} y={floor} />
            <rect
              x={260 + distance - 18}
              y={floor - 64}
              width="36"
              height="64"
              rx="3"
              fill="transparent"
              stroke="#ae7539"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <rect
              x={260 + distance - 28}
              y={floor - 76}
              width="56"
              height="86"
              fill="transparent"
            />
          </g>
          <g transform="translate(210 88)">
            <rect width="220" height="52" rx="26" fill={contact ? '#f5d9bb' : '#e0eada'} />
            <text
              x="110"
              y="32"
              textAnchor="middle"
              fill={contact ? '#85441b' : '#3e6542'}
              fontSize="17"
              fontWeight="700"
            >
              {contact ? '● As áreas se tocam' : '↔ Áreas separadas'}
            </text>
          </g>
          <text x="320" y="340" textAnchor="middle" fill="#536450" fontSize="13">
            {compact || !onDistance
              ? `Distância ${distance} · largura ${state.width}`
              : 'Arraste o cacto. Ou use o controle de distância abaixo.'}
          </text>
        </>
      )}
    </svg>
  )
}

export function ExperienceComparison({
  activity,
  trials,
  current,
}: {
  activity: ExplorationActivity
  trials: ExperienceTrial[]
  current: ExplorationState
}) {
  const [selected, setSelected] = useState(1)
  const [time, setTime] = useState<number | null>(null)
  if (!trials.length)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Guarde uma experiência para comparar no mesmo tamanho.
      </p>
    )
  const trial = trials[Math.min(selected, trials.length - 1)]
  if (!trial) return null
  return (
    <div className="space-y-3">
      {trials.length > 1 && (
        <div className="flex gap-2">
          {trials.map((t, i) => (
            <button
              key={t.label}
              type="button"
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className="min-h-11 rounded-xl border border-border px-3 text-sm"
            >
              {i === 0 ? 'Anterior' : 'Mais recente'}
            </button>
          ))}
        </div>
      )}
      {['gravity', 'impulse'].includes(activity.mission) && (
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
          Rever os saltos no mesmo instante{' '}
          <input
            aria-label="Instante da comparação"
            className="h-11 min-w-32 flex-1 accent-primary"
            type="range"
            min="0"
            max="2"
            step="0.02"
            value={time ?? 0}
            onChange={(e) => setTime(Number(e.target.value))}
          />
          <output>{time?.toFixed(2) ?? '0.00'} s</output>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: 'Experiência guardada',
            state: { ...initialExploration(activity), ...trial.state },
          },
          { label: 'Agora', state: { ...current, ...experienceTrial(current, '').state } },
        ].map((item) => (
          <figure key={item.label} className="min-w-0 space-y-2">
            <figcaption className="text-sm font-semibold">{item.label}</figcaption>
            <ExperienceScene
              activity={activity}
              state={
                time === null || !['gravity', 'impulse'].includes(activity.mission)
                  ? item.state
                  : replayTrial(activity, item.state, time)
              }
              compact
            />
          </figure>
        ))}
      </div>
    </div>
  )
}

function replayTrial(activity: ExplorationActivity, state: ExplorationState, seconds: number) {
  const initial = { ...initialExploration(activity), force: state.force, gravity: state.gravity }
  const jumped = transitionExploration(activity, initial, { type: 'jump', input: 'tap' })
  return seconds > 0
    ? transitionExploration(activity, jumped, { type: 'advance', seconds })
    : jumped
}
