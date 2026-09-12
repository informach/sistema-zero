'use client'

import { useId, useRef, useState } from 'react'
import { SceneButton } from './exploration-stage'

export function ExperienceConnection({
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
  const container = useRef<HTMLDivElement>(null)
  const destination = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState(false)
  const [wire, setWire] = useState<{
    pointer: number
    x: number
    y: number
    startX: number
    startY: number
  } | null>(null)
  const inside = (x: number, y: number) => {
    const b = destination.current?.getBoundingClientRect()
    return !!b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
  }
  const [compatible, setCompatible] = useState(false)
  const cancel = () => {
    setWire(null)
    setSelected(false)
    setCompatible(false)
  }
  return (
    <div
      ref={container}
      className="relative flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel()
      }}
    >
      <SceneButton
        aria-pressed={selected}
        className="touch-none"
        onClick={(e) => {
          if (e.detail === 0) setSelected((v) => !v)
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const bounds = container.current?.getBoundingClientRect()
          const start = e.currentTarget.getBoundingClientRect()
          if (!bounds) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setSelected(true)
          setWire({
            pointer: e.pointerId,
            startX: start.left + start.width / 2 - bounds.left,
            startY: start.top + start.height / 2 - bounds.top,
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
          })
        }}
        onPointerMove={(e) => {
          if (!wire || wire.pointer !== e.pointerId) return
          const bounds = container.current?.getBoundingClientRect()
          if (!bounds) return
          setWire({ ...wire, x: e.clientX - bounds.left, y: e.clientY - bounds.top })
          setCompatible(inside(e.clientX, e.clientY))
        }}
        onPointerUp={(e) => {
          if (wire?.pointer !== e.pointerId) return
          if (inside(e.clientX, e.clientY)) {
            onConnect(true)
            setSelected(false)
          }
          setWire(null)
          setCompatible(false)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={() => {
          setWire(null)
          setCompatible(false)
        }}
      >
        ◉ {source}
      </SceneButton>
      <svg
        width="44"
        height="24"
        viewBox="0 0 44 24"
        aria-hidden="true"
        className={enabled ? 'text-primary' : 'text-muted-foreground/50'}
      >
        <path
          d="M0 12H44"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={enabled ? undefined : '4 5'}
        />
        <circle cx="40" cy="12" r="4" fill="currentColor" />
      </svg>
      <button
        ref={destination}
        type="button"
        aria-describedby={`${id}-help`}
        onClick={() => {
          if (selected) {
            onConnect(true)
            cancel()
          }
        }}
        className={`min-h-14 rounded-xl border-2 border-dashed px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${compatible ? 'border-primary bg-primary/20 ring-4 ring-primary/15' : selected ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
      >
        ◎ {target}
        {compatible && <span className="ml-2">Solte aqui</span>}
      </button>
      {enabled && <SceneButton onClick={() => onConnect(false)}>{alternative}</SceneButton>}
      {wire && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
        >
          <path
            d={`M${wire.startX} ${wire.startY} C${wire.startX + 50} ${wire.startY},${wire.x - 50} ${wire.y},${wire.x} ${wire.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-primary"
          />
          <circle
            cx={wire.x}
            cy={wire.y}
            r="9"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
          />
        </svg>
      )}
      <p id={`${id}-help`} className="basis-full text-xs text-muted-foreground">
        {selected
          ? `Agora toque em ${target} para ligar.`
          : enabled
            ? `${source} está ligado a ${target}.`
            : 'Arraste o fio. Ou escolha a origem e depois o destino, com toque ou teclado.'}
      </p>
    </div>
  )
}
