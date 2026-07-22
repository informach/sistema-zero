import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SZIRInput } from '#ir'

export interface VirtualGamepadInput {
  action: 'keydown' | 'keyup'
  key: string
  code: string
}

interface VirtualGamepadProps {
  onInput: (input: VirtualGamepadInput) => void
}

interface GamepadKey {
  key: string
  code: string
  label: string
  symbol: string
  className: string
}

const KEYBOARD_IR_TYPES = new Set([
  'keyboardSimple',
  'inputKeyPressed',
  'g2d:onKey',
  'g2d:keyDown',
  'g2d:platformer',
  'g2d:topDown',
  'g2d:arrowsX',
  'g2d:steerThrust',
  'g2d:jumpOnGround',
  'g2d:controlDino',
  'g3d:keyDown',
  'g3d:controlWithKeys',
  'gk:keyDown',
  'gk:keyPressed',
  'gk:moveWithCustomKeys',
  'gk:moveWithKeys',
  'gk:setPauseKey',
  'g3k:keyDown',
  'g3k:keyPressed',
  'g3k:moveWithKeys',
  'g3k:moveFps',
  'g3k:setPauseKey',
  'g3k:platformerKeys',
  'w3d:keyDown',
  'w3d:keyPressed',
])

const GAMEPAD_KEYS: readonly GamepadKey[] = [
  {
    key: 'ArrowUp',
    code: 'ArrowUp',
    label: 'Mover para cima',
    symbol: '▲',
    className: 'col-start-2 row-start-1',
  },
  {
    key: 'ArrowLeft',
    code: 'ArrowLeft',
    label: 'Mover para a esquerda',
    symbol: '◀',
    className: 'col-start-1 row-start-2',
  },
  {
    key: 'ArrowRight',
    code: 'ArrowRight',
    label: 'Mover para a direita',
    symbol: '▶',
    className: 'col-start-3 row-start-2',
  },
  {
    key: 'ArrowDown',
    code: 'ArrowDown',
    label: 'Mover para baixo',
    symbol: '▼',
    className: 'col-start-2 row-start-3',
  },
]

const ACTION_KEYS: readonly GamepadKey[] = [
  {
    key: ' ',
    code: 'Space',
    label: 'Ação principal, barra de espaço',
    symbol: 'A',
    className: '',
  },
  {
    key: 'Enter',
    code: 'Enter',
    label: 'Ação secundária, Enter',
    symbol: 'B',
    className: '',
  },
]

export function projectUsesKeyboardControls(ir: SZIRInput | null): boolean {
  if (!ir) return false
  const pending: unknown[] = [ir]
  const visited = new WeakSet<object>()

  while (pending.length > 0) {
    const value = pending.pop()
    if (!value || typeof value !== 'object') continue
    if (visited.has(value)) continue
    visited.add(value)

    if (Array.isArray(value)) {
      pending.push(...value)
      continue
    }

    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') {
      if (KEYBOARD_IR_TYPES.has(record.type)) return true
      if (
        record.type === 'eventHandler' &&
        (record.event === 'keydown' || record.event === 'keyup')
      ) {
        return true
      }
    }
    pending.push(...Object.values(record))
  }

  return false
}

function getTouchInputSnapshot(): boolean {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
}

const subscribeToTouchInput = (): (() => void) => () => {}

export function useTouchInput(): boolean {
  return useSyncExternalStore(subscribeToTouchInput, getTouchInputSnapshot, () => false)
}

export function VirtualGamepad({ onInput }: VirtualGamepadProps): JSX.Element {
  const [hidden, setHidden] = useState(false)
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set())
  const pressedRef = useRef(new Set<string>())
  const onInputRef = useRef(onInput)
  onInputRef.current = onInput

  const emit = useCallback((action: 'keydown' | 'keyup', control: GamepadKey) => {
    onInputRef.current({ action, key: control.key, code: control.code })
  }, [])

  const press = useCallback(
    (control: GamepadKey) => {
      if (pressedRef.current.has(control.code)) return
      pressedRef.current.add(control.code)
      setPressed(new Set(pressedRef.current))
      emit('keydown', control)
    },
    [emit],
  )

  const release = useCallback(
    (control: GamepadKey) => {
      if (!pressedRef.current.delete(control.code)) return
      setPressed(new Set(pressedRef.current))
      emit('keyup', control)
    },
    [emit],
  )

  const releaseAll = useCallback(() => {
    for (const control of [...GAMEPAD_KEYS, ...ACTION_KEYS]) {
      if (pressedRef.current.delete(control.code)) emit('keyup', control)
    }
    setPressed(new Set())
  }, [emit])

  useEffect(() => releaseAll, [releaseAll])

  if (hidden) {
    return (
      <button
        type="button"
        aria-label="Mostrar controles na tela"
        onClick={() => setHidden(false)}
        className="absolute bottom-3 right-3 z-20 flex size-12 touch-manipulation items-center justify-center rounded-full border border-white/60 bg-slate-950/80 text-xl text-white shadow-lg backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        🎮
      </button>
    )
  }

  const controlButton = (control: GamepadKey) => {
    const isPressed = pressed.has(control.code)
    const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button != null && event.button !== 0) return
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      press(control)
    }
    const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      release(control)
    }

    return (
      <button
        key={control.code}
        type="button"
        aria-label={control.label}
        aria-pressed={isPressed}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onClick={(event) => {
          if (event.detail !== 0) return
          press(control)
          queueMicrotask(() => release(control))
        }}
        className={`flex size-12 touch-none select-none items-center justify-center rounded-xl border border-white/60 bg-slate-950/75 text-lg font-bold text-white shadow-md backdrop-blur-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${control.className} ${isPressed ? 'scale-95 bg-fuchsia-600/90' : 'active:scale-95'}`}
      >
        {control.symbol}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Controles do jogo"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-end justify-between gap-4 px-3"
    >
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1">
        {GAMEPAD_KEYS.map(controlButton)}
      </div>
      <div className="pointer-events-auto flex items-end gap-2 pb-4">
        {ACTION_KEYS.map(controlButton)}
        <button
          type="button"
          aria-label="Ocultar controles na tela"
          onClick={() => {
            releaseAll()
            setHidden(true)
          }}
          className="flex size-12 touch-manipulation items-center justify-center rounded-full border border-white/60 bg-slate-950/75 text-xl text-white shadow-md backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ×
        </button>
      </div>
    </div>
  )
}
