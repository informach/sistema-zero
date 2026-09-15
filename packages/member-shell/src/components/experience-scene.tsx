'use client'

import {
  castText,
  initialScene,
  type SceneActivity,
  type SceneState,
  type SceneTrial,
  sceneContact,
  sceneFromTrial,
  sceneTrial,
  stepScene,
} from '@sistemazero/core/learning/scene'
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
  activity: SceneActivity
  state: SceneState
  onDistance?: (distance: number) => void
  onJump?: (input: 'key' | 'tap') => void
  compact?: boolean
}) {
  const id = useId()
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ pointer: number; distance: number } | null>(null)
  const hitbox = activity.scene === 'hitbox'
  const distance = drag?.distance ?? state.contact.distance
  const contact = sceneContact({ width: state.contact.width, distance })
  const floor = 300
  const rise = Math.min(240, state.flight.y * 0.65)
  const peak = Math.min(240, state.flight.peak * 0.65)
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
      className="block h-auto w-full rounded-2xl bg-scene-ground"
      style={{ touchAction: hitbox && onDistance ? 'none' : 'auto' }}
    >
      <title id={`${id}-title`}>{hitbox ? 'Áreas de colisão' : 'Laboratório de saltos'}</title>
      <desc id={`${id}-desc`}>
        {hitbox
          ? `Distância ${distance}. Largura ${state.contact.width}. ${contact ? 'As áreas se tocam.' : 'As áreas estão separadas.'}`
          : `Impulso ${state.flight.force}. Gravidade ${state.flight.gravity ? 'ligada' : 'desligada'}. Altura máxima ${Math.round(state.flight.peak)}. ${state.sound.jumps} saltos, ${state.sound.count} sons.`}
      </desc>
      <defs>
        <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse">
          <circle className="fill-scene-grid" cx="1" cy="1" r="1" />
        </pattern>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          {/* ⚠️ `stopColor` é atributo de apresentação: `var()` nele é ignorado pelos
              navegadores, então o token só chega pelo `style`. */}
          <stop style={{ stopColor: 'var(--color-scene-sky)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-scene-ground)' }} />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="20" fill={`url(#${id}-sky)`} />
      <rect x="24" y="24" width="592" height="276" fill={`url(#${id}-grid)`} />
      <path className="stroke-scene-ink-soft" d="M24 301H616" strokeWidth="2" />
      <path className="stroke-scene-grid" d="M24 313H616" strokeWidth="9" strokeDasharray="2 9" />
      {/* ⚠️ Era "OBSERVATÓRIO DE CONTATO" / "OBSERVATÓRIO DO SALTO", em caixa alta e com
          entreletra — vocabulário de adulto no alto do palco de quem tem 9 anos. O selo diz o
          que este lugar MOSTRA, na língua da criança, e sem repetir o título do bloco (que o
          professor escreve e já aparece acima). */}
      <text className="fill-scene-ink-soft" x="32" y="44" fontSize="13" fontWeight="700">
        {hitbox ? 'Onde a batida acontece' : 'A altura do salto'}
      </text>
      {!hitbox && (
        <>
          {[0, 100, 200, 300].map((n) => (
            <g key={n}>
              {/* Os traços da régua de altura. */}
              <path className="stroke-scene-rule" d={`M48 ${floor - n * 0.65}h12`} />
              <text
                className="fill-scene-ink-soft"
                x="35"
                y={floor - n * 0.65 + 4}
                textAnchor="end"
                fontSize="10"
              >
                {n}
              </text>
            </g>
          ))}
          {state.flight.peak > 0 && (
            <g>
              <path
                className="stroke-scene-b"
                d={`M74 ${floor - peak}H390`}
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <text className="fill-scene-b-ink" x="400" y={floor - peak + 4} fontSize="12">
                {Math.round(state.flight.peak)} de altura
              </text>
            </g>
          )}
          <g
            className="text-primary"
            style={{ cursor: onJump ? 'pointer' : undefined }}
            role={onJump ? 'button' : undefined}
            tabIndex={onJump ? 0 : undefined}
            aria-label={onJump ? castText('Pular com o Dino', activity.cast) : undefined}
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
          {state.flight.y > 369 && (
            <text className="fill-scene-ink-soft" x="140" y="78" fontSize="13">
              ↑ Continua subindo: {Math.round(state.flight.y)}
            </text>
          )}
          {state.flight.y > 0 && (
            <ellipse
              className="fill-scene-ink-soft"
              cx="245"
              cy="302"
              rx={Math.max(10, 28 - rise / 14)}
              ry="4"
              opacity=".22"
            />
          )}
          <g transform="translate(468 94)">
            <rect
              className="fill-scene-card stroke-scene-card-line"
              width="132"
              height="78"
              rx="14"
            />
            <text className="fill-scene-ink-soft" x="14" y="26" fontSize="12">
              IMPULSO
            </text>
            <text className="fill-scene-b-ink" x="14" y="57" fontSize="27" fontWeight="700">
              {state.flight.force}
              <tspan fontSize="14"> ↑</tspan>
            </text>
          </g>
          <g transform="translate(468 185)">
            <rect
              className="fill-scene-card stroke-scene-card-line"
              width="132"
              height="78"
              rx="14"
            />
            <text className="fill-scene-ink-soft" x="14" y="26" fontSize="12">
              GRAVIDADE
            </text>
            <text className="fill-scene-a" x="14" y="55" fontSize="17" fontWeight="700">
              {state.flight.gravity ? 'Ligada ↓' : 'Desligada'}
            </text>
          </g>
          {activity.scene === 'jump-sound' && (
            <text className="fill-scene-ink-soft" x="78" y="340" fontSize="14">
              ↑ {state.sound.jumps} saltos <tspan dx="24">♫ {state.sound.count} sons</tspan>
              <tspan dx="24">Escuta: {state.sound.onJump ? 'Pulou' : 'Espaço'}</tspan>
            </text>
          )}
        </>
      )}
      {hitbox && (
        <>
          <g className="text-primary">
            <DinoFigure x={260} y={floor} />
          </g>
          <rect
            x={260 - state.contact.width / 2}
            y={floor - 70}
            width={state.contact.width}
            height="70"
            rx="4"
            className={
              contact ? 'fill-scene-b-wash stroke-scene-alert' : 'fill-scene-a-wash stroke-scene-a'
            }
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <g
            onPointerDown={
              onDistance
                ? (event) => {
                    if (event.button !== 0) return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDrag({ pointer: event.pointerId, distance: state.contact.distance })
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
                className="fill-scene-grass stroke-scene-line"
                x={260 + distance - 28}
                y={floor - 76}
                width="56"
                height="80"
                rx="12"
                strokeDasharray="4 3"
              />
            )}
            <CactusFigure x={260 + distance} y={floor} />
            <rect
              className="stroke-scene-bark"
              x={260 + distance - 18}
              y={floor - 64}
              width="36"
              height="64"
              rx="3"
              fill="transparent"
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
            <rect
              width="220"
              height="52"
              rx="26"
              className={contact ? 'fill-scene-alert-wash' : 'fill-scene-grass'}
            />
            <text
              x="110"
              y="32"
              textAnchor="middle"
              className={contact ? 'fill-scene-alert' : 'fill-scene-ink'}
              fontSize="17"
              fontWeight="700"
            >
              {contact ? '● As áreas se tocam' : '↔ Áreas separadas'}
            </text>
          </g>
          <text className="fill-scene-ink-soft" x="320" y="340" textAnchor="middle" fontSize="13">
            {compact || !onDistance
              ? `Distância ${distance} · largura ${state.contact.width}`
              : castText('Arraste o cacto. Ou use o controle de distância abaixo.', activity.cast)}
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
  activity: SceneActivity
  trials: SceneTrial[]
  current: SceneState
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
      {['gravity', 'impulse'].includes(activity.scene) && (
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
            state: sceneFromTrial(activity, trial),
          },
          // ⚠️ "Agora" passa pelo MESMO retrato: depois de um salto o que interessa comparar são
          // as condições daquele voo, não as que estão nos controles neste instante.
          { label: 'Agora', state: sceneFromTrial(activity, sceneTrial(current, '')) },
        ].map((item) => (
          <figure key={item.label} className="min-w-0 space-y-2">
            <figcaption className="text-sm font-semibold">{item.label}</figcaption>
            <ExperienceScene
              activity={activity}
              state={
                time === null || !['gravity', 'impulse'].includes(activity.scene)
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

function replayTrial(activity: SceneActivity, state: SceneState, seconds: number) {
  const base = initialScene(activity)
  const initial: SceneState = {
    ...base,
    flight: { ...base.flight, force: state.flight.force, gravity: state.flight.gravity },
  }
  const jumped = stepScene(activity, initial, { type: 'jump', input: 'tap' })
  return seconds > 0 ? stepScene(activity, jumped, { type: 'advance', seconds }) : jumped
}
