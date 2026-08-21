'use client'

/**
 * Os CONTROLES do console da página pública de jogar, na FORMA do Super Nintendo
 * (cruz à esquerda, tira SELECT/START no meio, diamante A/B/X/Y à direita) com as
 * CORES da casa — os tokens `--snes-*` do globals.css, que já viram o tema claro
 * e o escuro. Quem os arruma na tela é o `public-stage.tsx`.
 *
 * As teclas de cada botão vêm PRONTAS do `describeProjectControls` do Estúdio:
 * este arquivo não sabe o que é "pular", só manda o `key`/`code` que recebeu. É o
 * que faz o mesmo botão servir às seis extensões.
 *
 * A face carrega a LETRA; o significado ("Pular", "Soltar fogo") vai no
 * `aria-label` — é o que concilia a cara de videogame com o leitor de tela.
 */

import type {
  ControlBinding,
  ControlDirection,
  ProjectControls,
} from '@sistemazero/studio/controls'
import { Camera, Maximize, Minimize, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { CSSProperties, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFullscreen } from './use-fullscreen'

export const C = {
  body: 'var(--snes-body)',
  bodyDeep: 'var(--snes-body-deep)',
  bodyEdge: 'var(--snes-body-edge)',
  bodyGrad: 'linear-gradient(168deg, var(--snes-body) 0%, var(--snes-body-deep) 100%)',
  cross: 'var(--snes-cross)',
  crossEdge: 'var(--snes-cross-edge)',
  strip: 'var(--snes-strip)',
  ink: 'var(--snes-ink)',
  // ⚠️ A tinta da SETA contrasta com a CRUZ, não com o corpo: usar a tinta de
  // texto deixava seta escura sobre braço escuro no tema claro (1,2:1).
  crossInk: 'var(--snes-cross-ink)',
  bezel: 'var(--snes-bezel)',
  ctrl: 'color-mix(in oklab, var(--snes-cross) 18%, transparent)',
  ctrlBorder: 'color-mix(in oklab, var(--snes-body-edge) 60%, transparent)',
}

const MAX_SCREENSHOT_DATA_URL_LENGTH = 8_000_000
export const SCREENSHOT_REQUEST_TIMEOUT_MS = 5_000

function isSafePngScreenshot(
  data: unknown,
): data is { type: 'sz:screenshot:result'; dataUrl: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'sz:screenshot:result' &&
    'dataUrl' in data &&
    typeof data.dataUrl === 'string' &&
    data.dataUrl.length <= MAX_SCREENSHOT_DATA_URL_LENGTH &&
    /^data:image\/png;base64,[a-zA-Z0-9+/]+={0,2}$/.test(data.dataUrl)
  )
}

function sendKey(
  iframe: HTMLIFrameElement | null | undefined,
  action: 'keydown' | 'keyup',
  key: string,
  code: string,
) {
  iframe?.contentWindow?.postMessage({ type: 'sz:gamepad', action, key, code }, '*')
}

function sendBindings(
  iframe: HTMLIFrameElement | null | undefined,
  bindings: ControlBinding[],
  action: 'keydown' | 'keyup',
) {
  for (const binding of bindings) sendKey(iframe, action, binding.key, binding.code)
}

function isButtonActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}

/**
 * Ciclo compartilhado dos botões que simulam uma tecla segurada. Deduplica
 * pointer/teclado e garante o keyup ao perder foco, trocar bindings ou desmontar.
 */
function useHeldControls<K extends string>(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  bindings: Record<K, ControlBinding | null>,
) {
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings
  const heldRef = useRef(new Map<K, ControlBinding>())

  const press = useCallback(
    (slot: K): boolean => {
      if (heldRef.current.has(slot)) return false
      const binding = bindingsRef.current[slot]
      if (!binding) return false
      heldRef.current.set(slot, binding)
      sendKey(iframeRef.current, 'keydown', binding.key, binding.code)
      return true
    },
    [iframeRef],
  )

  const release = useCallback(
    (slot: K): boolean => {
      const binding = heldRef.current.get(slot)
      if (!binding) return false
      heldRef.current.delete(slot)
      sendKey(iframeRef.current, 'keyup', binding.key, binding.code)
      return true
    },
    [iframeRef],
  )

  useEffect(() => {
    // Se o projeto troca o significado de uma casa enquanto ela está segurada,
    // solta a tecla ANTIGA antes de aceitar o binding novo.
    for (const [slot, heldBinding] of heldRef.current) {
      if (bindings[slot] !== heldBinding) release(slot)
    }
  }, [bindings, release])

  useEffect(
    () => () => {
      for (const binding of heldRef.current.values()) {
        sendKey(iframeRef.current, 'keyup', binding.key, binding.code)
      }
      heldRef.current.clear()
    },
    [iframeRef],
  )

  return { press, release }
}

// Segurar um botão não pode abrir menu de contexto nem selecionar texto: as
// crianças seguram as direções o tempo todo.
const holdSafe: CSSProperties = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
}

const FOCUS_RING = '0 0 0 3px color-mix(in oklab, var(--ring) 85%, transparent)'

// ─── Cruz direcional ─────────────────────────────────────────────────────────

const DPAD_SIZE = 124
const DPAD_ARM = 46
/**
 * Metade da cruz em que o dedo já conta como "para aquele lado". Abaixo disso é
 * zona morta (o centro), e o canto ativa os DOIS eixos — que é a diagonal.
 */
const DEAD_ZONE = 0.3

/**
 * Que direções o dedo está pedindo, a partir de ONDE ele está na cruz.
 *
 * O centro é zona morta; passar do limiar num eixo pede aquela direção; passar
 * nos DOIS pede a diagonal — que é o que os jogos já sabem fazer e o pad de
 * botões separados não conseguia produzir.
 */
export function directionsAtPoint(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): ControlDirection[] {
  if (!rect.width || !rect.height) return []
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1
  const ny = ((clientY - rect.top) / rect.height) * 2 - 1
  const next: ControlDirection[] = []
  if (ny < -DEAD_ZONE) next.push('up')
  if (ny > DEAD_ZONE) next.push('down')
  if (nx < -DEAD_ZONE) next.push('left')
  if (nx > DEAD_ZONE) next.push('right')
  return next
}

const ARROW_PATH: Record<ControlDirection, string> = {
  up: 'M7 1L13 9H1Z',
  down: 'M7 13L1 5H13Z',
  left: 'M1 7L9 1V13Z',
  right: 'M13 7L5 13V1Z',
}

/**
 * A cruz é UMA superfície de toque, não quatro botões.
 *
 * ⭐ É o que devolve a DIAGONAL: os jogos já a suportam (andar em 4 direções, voo
 * livre e nado normalizam movimento diagonal), mas com um botão por braço, cada
 * um capturando o ponteiro, não havia como o dedo alcançar dois braços — nem
 * rolar de um para o outro sem levantar, que é o gesto do videogame.
 *
 * Teclado e leitor de tela entram pelos quatro botões invisíveis por cima, que
 * não recebem ponteiro (`pointer-events: none`) para não roubar o gesto.
 */
export function DPad({
  iframeRef,
  directions,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  directions: ProjectControls['directions']
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heldRef = useRef<ControlDirection[]>([])
  // ⚠️ A cruz atende UM dedo por vez, e o primeiro manda. Sem isto, um segundo
  // toque (o polegar da outra mão raspando no console) reassumia o gesto e o
  // `pointerup` DELE soltava a direção que o primeiro dedo ainda segurava —
  // medido: a criança para de andar com o dedo apertado. Antes cada braço era um
  // botão com captura própria, então isto é regressão, não detalhe.
  const pointerRef = useRef<number | null>(null)
  const directionsRef = useRef(directions)
  directionsRef.current = directions
  const [held, setHeld] = useState<ControlDirection[]>([])

  const apply = useCallback(
    (next: ControlDirection[]) => {
      const before = heldRef.current
      for (const dir of before) {
        if (!next.includes(dir))
          sendBindings(iframeRef.current, directionsRef.current[dir], 'keyup')
      }
      for (const dir of next) {
        if (!before.includes(dir)) {
          sendBindings(iframeRef.current, directionsRef.current[dir], 'keydown')
        }
      }
      heldRef.current = next
      setHeld(next)
    },
    [iframeRef],
  )

  // Sair da tela segurando uma direção deixaria a tecla presa no jogo — e o pad
  // some quando a criança esconde os controles, não só quando fecha a página.
  useEffect(() => () => apply([]), [apply])

  function directionsAt(clientX: number, clientY: number): ControlDirection[] {
    const el = rootRef.current
    if (!el) return []
    return directionsAtPoint(el.getBoundingClientRect(), clientX, clientY)
  }

  const S = DPAD_SIZE
  const A = DPAD_ARM
  const barBase: CSSProperties = {
    position: 'absolute',
    borderRadius: 13,
    background: `linear-gradient(150deg, color-mix(in oklab, ${C.cross} 82%, white) 0%, ${C.cross} 62%, ${C.crossEdge} 100%)`,
    backgroundSize: `${S}px ${S}px`,
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Direcional"
      style={{ position: 'relative', width: S, height: S, flexShrink: 0, ...holdSafe }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (pointerRef.current !== null) return
        pointerRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        apply(directionsAt(e.clientX, e.clientY))
      }}
      onPointerMove={(e) => {
        if (pointerRef.current !== e.pointerId) return
        apply(directionsAt(e.clientX, e.clientY))
      }}
      onPointerUp={(e) => {
        if (pointerRef.current !== e.pointerId) return
        pointerRef.current = null
        e.currentTarget.releasePointerCapture(e.pointerId)
        apply([])
      }}
      onPointerCancel={(e) => {
        if (pointerRef.current !== e.pointerId) return
        pointerRef.current = null
        apply([])
      }}
      onLostPointerCapture={(e) => {
        if (pointerRef.current !== e.pointerId) return
        pointerRef.current = null
        apply([])
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 4px 0 ${C.crossEdge})` }}
      >
        <div
          style={{
            ...barBase,
            left: (S - A) / 2,
            top: 0,
            width: A,
            height: S,
            backgroundPosition: `${-(S - A) / 2}px 0px`,
          }}
        />
        <div
          style={{
            ...barBase,
            left: 0,
            top: (S - A) / 2,
            width: S,
            height: A,
            backgroundPosition: `0px ${-(S - A) / 2}px`,
          }}
        />
      </div>
      {/* Setas gravadas nos braços, e o realce de qual direção está indo */}
      {(['up', 'down', 'left', 'right'] as const).map((dir) => {
        const on = held.includes(dir)
        const box =
          dir === 'up'
            ? { left: (S - A) / 2, top: 0, width: A, height: (S - A) / 2 }
            : dir === 'down'
              ? { left: (S - A) / 2, top: (S + A) / 2, width: A, height: (S - A) / 2 }
              : dir === 'left'
                ? { left: 0, top: (S - A) / 2, width: (S - A) / 2, height: A }
                : { left: (S + A) / 2, top: (S - A) / 2, width: (S - A) / 2, height: A }
        return (
          <div
            key={dir}
            aria-hidden
            style={{
              position: 'absolute',
              ...box,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: on ? 'rgba(255,255,255,0.22)' : 'transparent',
              transition: 'background 80ms',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
              <path d={ARROW_PATH[dir]} fill={C.crossInk} opacity={0.95} />
            </svg>
          </div>
        )
      })}
      {/* Miolo levemente afundado, como o da cruz original */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: (S - A) / 2 + 5,
          top: (S - A) / 2 + 5,
          width: A - 10,
          height: A - 10,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 38%, color-mix(in oklab, ${C.cross} 70%, white), ${C.crossEdge})`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35)',
        }}
      />
      {/* Teclado e leitor de tela. Sem ponteiro: o gesto é da superfície. */}
      {(['up', 'down', 'left', 'right'] as const).map((dir) => {
        const label = directions[dir][0]?.label ?? dir
        const box =
          dir === 'up'
            ? { left: (S - A) / 2, top: 0, width: A, height: (S - A) / 2 }
            : dir === 'down'
              ? { left: (S - A) / 2, top: (S + A) / 2, width: A, height: (S - A) / 2 }
              : dir === 'left'
                ? { left: 0, top: (S - A) / 2, width: (S - A) / 2, height: A }
                : { left: (S + A) / 2, top: (S - A) / 2, width: (S - A) / 2, height: A }
        return (
          <button
            key={`tecla-${dir}`}
            type="button"
            aria-label={label}
            aria-pressed={held.includes(dir)}
            style={{
              position: 'absolute',
              ...box,
              padding: 0,
              border: 0,
              borderRadius: 12,
              background: 'transparent',
              pointerEvents: 'none',
              color: 'transparent',
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              if (e.repeat) return
              apply([...heldRef.current, dir])
            }}
            onKeyUp={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              apply(heldRef.current.filter((d) => d !== dir))
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = FOCUS_RING
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = ''
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Diamante A / B / X / Y ──────────────────────────────────────────────────

const FACE_SIZE = 140

/**
 * Largura que a cruz + o diamante + a folga mínima ocupam. O corpo do console
 * deitado reserva isto ao lado do palco — derivado, para não virar número mágico
 * que envelhece quando os controles mudam de tamanho.
 */
export const DECK_RESERVE_PX = DPAD_SIZE + FACE_SIZE + 80
const FACE_BUTTON = 52

/** As casas do Super Nintendo: X em cima, Y à esquerda, A à direita, B embaixo. */
const FACE_LAYOUT = [
  { slot: 'X', color: 'var(--snes-x)', pos: { left: '50%', top: 0 } },
  { slot: 'Y', color: 'var(--snes-y)', pos: { left: 0, top: '50%' } },
  { slot: 'A', color: 'var(--snes-a)', pos: { right: 0, top: '50%' } },
  { slot: 'B', color: 'var(--snes-b)', pos: { left: '50%', bottom: 0 } },
] as const

export function FaceButtons({
  iframeRef,
  face,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  face: ProjectControls['face']
}) {
  const { press, release } = useHeldControls(iframeRef, face)
  return (
    <div
      role="group"
      aria-label="Botões do jogo"
      style={{ position: 'relative', width: FACE_SIZE, height: FACE_SIZE, flexShrink: 0 }}
    >
      {FACE_LAYOUT.map(({ slot, color, pos }) => {
        const binding = face[slot]
        const nudge =
          'left' in pos && pos.left === '50%'
            ? 'translateX(-50%)'
            : 'top' in pos && pos.top === '50%'
              ? 'translateY(-50%)'
              : ''
        return (
          <button
            key={slot}
            type="button"
            // A face mostra a LETRA; quem diz o que ela faz é o rótulo acessível.
            aria-label={binding ? `${binding.label} (${slot})` : undefined}
            aria-hidden={binding ? undefined : true}
            disabled={!binding}
            tabIndex={binding ? undefined : -1}
            style={{
              position: 'absolute',
              ...pos,
              transform: nudge,
              width: FACE_BUTTON,
              height: FACE_BUTTON,
              borderRadius: '50%',
              background: binding
                ? `radial-gradient(circle at 36% 32%, color-mix(in oklab, ${color} 65%, white), ${color})`
                : `color-mix(in oklab, ${C.bodyEdge} 45%, transparent)`,
              border: 0,
              borderBottom: `4px solid color-mix(in oklab, ${color} 62%, black)`,
              boxShadow: binding
                ? `0 4px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
                : 'none',
              color: binding ? 'white' : `color-mix(in oklab, ${C.ink} 40%, transparent)`,
              opacity: binding ? 1 : 0.4,
              fontWeight: 800,
              fontSize: 19,
              fontFamily: 'var(--font-display, sans-serif)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: binding ? 'pointer' : 'default',
              transition: 'transform 60ms, box-shadow 60ms',
              ...holdSafe,
            }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (!press(slot)) return
              e.currentTarget.setPointerCapture(e.pointerId)
              e.currentTarget.style.transform = `${nudge} translateY(3px)`
              e.currentTarget.style.boxShadow = `0 1px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
            }}
            onPointerUp={(e) => {
              if (!release(slot)) return
              e.currentTarget.releasePointerCapture(e.pointerId)
              e.currentTarget.style.transform = nudge
              e.currentTarget.style.boxShadow = `0 4px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
            }}
            onPointerCancel={(e) => {
              if (!release(slot)) return
              e.currentTarget.style.transform = nudge
              e.currentTarget.style.boxShadow = `0 4px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
            }}
            onLostPointerCapture={(e) => {
              if (!release(slot)) return
              e.currentTarget.style.transform = nudge
            }}
            onKeyDown={(e) => {
              if (!isButtonActivationKey(e.key)) return
              e.preventDefault()
              if (e.repeat || !press(slot)) return
              e.currentTarget.style.transform = `${nudge} translateY(3px)`
              e.currentTarget.style.boxShadow = `0 1px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
            }}
            onKeyUp={(e) => {
              if (!isButtonActivationKey(e.key)) return
              e.preventDefault()
              if (!release(slot)) return
              e.currentTarget.style.transform = nudge
              e.currentTarget.style.boxShadow = `${FOCUS_RING}, 0 4px 0 color-mix(in oklab, ${color} 62%, black)`
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = 'none'
              e.currentTarget.style.boxShadow = `${FOCUS_RING}, 0 4px 0 color-mix(in oklab, ${color} 62%, black)`
            }}
            onBlur={(e) => {
              release(slot)
              e.currentTarget.style.transform = nudge
              e.currentTarget.style.boxShadow = binding
                ? `0 4px 0 color-mix(in oklab, ${color} 62%, black), inset 0 1px 0 rgba(255,255,255,0.28)`
                : 'none'
            }}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}

// ─── Tira SELECT / START ─────────────────────────────────────────────────────

const STRIP_LABEL: Record<'select' | 'start', string> = { select: 'SELECT', start: 'START' }

/** As duas pílulas inclinadas do meio — as únicas que trazem NOME escrito. */
export function StripButtons({
  iframeRef,
  strip,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  strip: ProjectControls['strip']
}) {
  const { press, release } = useHeldControls(iframeRef, strip)
  return (
    <div
      role="group"
      aria-label="Menu do jogo"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexShrink: 0,
      }}
    >
      {(['select', 'start'] as const).map((slot) => {
        const binding = strip[slot]
        return (
          <div key={slot} style={{ display: 'grid', justifyItems: 'center', gap: 5 }}>
            <button
              type="button"
              aria-label={binding ? `${binding.label} (${STRIP_LABEL[slot]})` : undefined}
              aria-hidden={binding ? undefined : true}
              disabled={!binding}
              tabIndex={binding ? undefined : -1}
              style={{
                width: 54,
                height: 20,
                minHeight: 20,
                borderRadius: 999,
                transform: 'rotate(-24deg)',
                background: binding ? C.strip : `color-mix(in oklab, ${C.strip} 35%, transparent)`,
                border: 0,
                borderBottom: `3px solid ${C.crossEdge}`,
                opacity: binding ? 1 : 0.4,
                cursor: binding ? 'pointer' : 'default',
                ...holdSafe,
              }}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                if (!press(slot)) return
                e.currentTarget.setPointerCapture(e.pointerId)
                e.currentTarget.style.borderBottomWidth = '1px'
              }}
              onPointerUp={(e) => {
                if (!release(slot)) return
                e.currentTarget.releasePointerCapture(e.pointerId)
                e.currentTarget.style.borderBottomWidth = '3px'
              }}
              onPointerCancel={(e) => {
                if (!release(slot)) return
                e.currentTarget.style.borderBottomWidth = '3px'
              }}
              onLostPointerCapture={(e) => {
                if (!release(slot)) return
                e.currentTarget.style.borderBottomWidth = '3px'
              }}
              onKeyDown={(e) => {
                if (!isButtonActivationKey(e.key)) return
                e.preventDefault()
                if (e.repeat || !press(slot)) return
                e.currentTarget.style.borderBottomWidth = '1px'
              }}
              onKeyUp={(e) => {
                if (!isButtonActivationKey(e.key)) return
                e.preventDefault()
                if (!release(slot)) return
                e.currentTarget.style.borderBottomWidth = '3px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = 'none'
                e.currentTarget.style.boxShadow = FOCUS_RING
              }}
              onBlur={(e) => {
                release(slot)
                e.currentTarget.style.borderBottomWidth = '3px'
                e.currentTarget.style.boxShadow = ''
              }}
            />
            <span
              aria-hidden
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: C.ink,
                opacity: binding ? 0.75 : 0.3,
              }}
            >
              {STRIP_LABEL[slot]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Barra de controle (reiniciar / tela cheia / foto / som) ─────────────────

export function CtrlBar({
  iframeRef,
  fullscreenTargetRef,
  onRestart,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  fullscreenTargetRef: RefObject<HTMLDivElement | null>
  onRestart: () => void
}) {
  const [muted, setMuted] = useState(false)
  const [shooting, setShooting] = useState(false)
  const { fullscreen, alternar: alternarTelaCheia } = useFullscreen(fullscreenTargetRef)
  const screenshotPendingRef = useRef(false)
  const screenshotExpiresAtRef = useRef(0)
  const screenshotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finishScreenshotRequest = useCallback(() => {
    screenshotPendingRef.current = false
    screenshotExpiresAtRef.current = 0
    if (screenshotTimeoutRef.current !== null) {
      clearTimeout(screenshotTimeoutRef.current)
      screenshotTimeoutRef.current = null
    }
    setShooting(false)
  }, [])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return
      if (!screenshotPendingRef.current) return
      if (Date.now() > screenshotExpiresAtRef.current) {
        finishScreenshotRequest()
        return
      }
      if (!isSafePngScreenshot(e.data)) {
        finishScreenshotRequest()
        return
      }
      finishScreenshotRequest()
      const a = document.createElement('a')
      a.href = e.data.dataUrl
      a.download = 'jogo.png'
      a.click()
    }
    window.addEventListener('message', onMsg)
    return () => {
      window.removeEventListener('message', onMsg)
      screenshotPendingRef.current = false
      if (screenshotTimeoutRef.current !== null) clearTimeout(screenshotTimeoutRef.current)
    }
  }, [finishScreenshotRequest, iframeRef])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:audio', muted: next }, '*')
  }

  function screenshot() {
    if (screenshotPendingRef.current || !iframeRef.current?.contentWindow) return
    screenshotPendingRef.current = true
    screenshotExpiresAtRef.current = Date.now() + SCREENSHOT_REQUEST_TIMEOUT_MS
    setShooting(true)
    screenshotTimeoutRef.current = setTimeout(
      finishScreenshotRequest,
      SCREENSHOT_REQUEST_TIMEOUT_MS,
    )
    iframeRef.current.contentWindow.postMessage({ type: 'sz:screenshot' }, '*')
  }

  const btnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: C.ctrl,
    border: `1px solid ${C.ctrlBorder}`,
    color: C.ink,
    cursor: 'pointer',
    transition: 'background 120ms, transform 80ms',
    touchAction: 'manipulation',
    flexShrink: 0,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        // marginTop:auto empurra a barra pro PÉ do console — longe da cruz e do
        // diamante, pra criança não esbarrar nela no meio do jogo.
        marginTop: 'auto',
        padding: '10px 14px 12px',
        borderTop: `1px solid ${C.ctrlBorder}`,
      }}
    >
      {/* ⚠️ A `key` é o ID, e não o rótulo: os botões que TROCAM de rótulo (tela
          cheia, som) seriam remontados a cada toque, e quem clicou pelo teclado
          perderia o foco no ato. */}
      {[
        { id: 'reiniciar', label: 'Reiniciar', icon: <RefreshCw size={18} />, onClick: onRestart },
        {
          id: 'tela-cheia',
          label: fullscreen ? 'Sair da tela cheia' : 'Tela cheia',
          icon: fullscreen ? <Minimize size={18} /> : <Maximize size={18} />,
          onClick: alternarTelaCheia,
        },
        {
          id: 'foto',
          label: 'Screenshot',
          icon: <Camera size={18} style={{ opacity: shooting ? 0.4 : 1 }} />,
          onClick: screenshot,
        },
        {
          id: 'som',
          label: muted ? 'Ativar som' : 'Silenciar',
          icon: muted ? <VolumeX size={18} /> : <Volume2 size={18} />,
          onClick: toggleMute,
        },
      ].map(({ id, label, icon, onClick }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          onClick={onClick}
          style={btnStyle}
          onPointerDown={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'color-mix(in oklab, var(--snes-cross) 34%, transparent)'
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'
          }}
          onPointerUp={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = C.ctrl
            ;(e.currentTarget as HTMLButtonElement).style.transform = ''
          }}
          onPointerLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = C.ctrl
            ;(e.currentTarget as HTMLButtonElement).style.transform = ''
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
