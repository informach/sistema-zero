'use client'

import { Camera, Maximize, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface MobileGamepadProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
  onRestart: () => void
  className?: string
}

type DpadDir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

function sendKey(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  action: 'keydown' | 'keyup',
  key: string,
  code: string,
) {
  iframeRef.current?.contentWindow?.postMessage({ type: 'sz:gamepad', action, key, code }, '*')
}

/** Botão circular grande para ação (A ou B). */
function ActionButton({
  label,
  keyVal,
  code,
  color,
  iframeRef,
}: {
  label: string
  keyVal: string
  code: string
  color: string
  iframeRef: RefObject<HTMLIFrameElement | null>
}) {
  const pressedRef = useRef(false)

  const down = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      if (pressedRef.current) return
      pressedRef.current = true
      sendKey(iframeRef, 'keydown', keyVal, code)
    },
    [iframeRef, keyVal, code],
  )

  const up = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      if (!pressedRef.current) return
      pressedRef.current = false
      sendKey(iframeRef, 'keyup', keyVal, code)
    },
    [iframeRef, keyVal, code],
  )

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      className="touch-none select-none rounded-full border-b-4 active:border-b-0 active:translate-y-1 transition-transform"
      style={{
        width: 60,
        height: 60,
        background: color,
        borderColor: `color-mix(in oklch, ${color} 60%, black)`,
        boxShadow: `0 4px 0 color-mix(in oklch, ${color} 60%, black)`,
        color: '#fff',
        fontWeight: 700,
        fontSize: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

/** D-pad em SVG com 4 zonas clicáveis. */
function DPad({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const pressedRef = useRef<Set<DpadDir>>(new Set())

  function startDir(dir: DpadDir) {
    return (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      if (pressedRef.current.has(dir)) return
      pressedRef.current.add(dir)
      sendKey(iframeRef, 'keydown', dir, dir)
    }
  }

  function endDir(dir: DpadDir) {
    return (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      if (!pressedRef.current.has(dir)) return
      pressedRef.current.delete(dir)
      sendKey(iframeRef, 'keyup', dir, dir)
    }
  }

  const size = 132
  const arm = 44 // largura do braço da cruz
  const pad = 4 // padding entre braços

  // As 4 zonas da cruz: cada uma é um retângulo que cobre um braço
  const zones: {
    dir: DpadDir
    x: number
    y: number
    w: number
    h: number
    arrow: string
    ax: number
    ay: number
  }[] = [
    {
      dir: 'ArrowUp',
      x: (size - arm) / 2,
      y: 0,
      w: arm,
      h: size / 2 - pad,
      arrow: '▲',
      ax: size / 2,
      ay: size / 4,
    },
    {
      dir: 'ArrowDown',
      x: (size - arm) / 2,
      y: size / 2 + pad,
      w: arm,
      h: size / 2 - pad,
      arrow: '▼',
      ax: size / 2,
      ay: (size * 3) / 4,
    },
    {
      dir: 'ArrowLeft',
      x: 0,
      y: (size - arm) / 2,
      w: size / 2 - pad,
      h: arm,
      arrow: '◀',
      ax: size / 4,
      ay: size / 2,
    },
    {
      dir: 'ArrowRight',
      x: size / 2 + pad,
      y: (size - arm) / 2,
      w: size / 2 - pad,
      h: arm,
      arrow: '▶',
      ax: (size * 3) / 4,
      ay: size / 2,
    },
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Direcional"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Fundo da cruz */}
      <rect x={(size - arm) / 2} y={0} width={arm} height={size} rx={8} fill="hsl(220 15% 22%)" />
      <rect x={0} y={(size - arm) / 2} width={size} height={arm} rx={8} fill="hsl(220 15% 22%)" />
      {/* Centro */}
      <circle cx={size / 2} cy={size / 2} r={arm / 2 - 2} fill="hsl(220 15% 18%)" />

      {/* Zonas interativas */}
      {zones.map(({ dir, x, y, w, h, arrow, ax, ay }) => (
        <g key={dir}>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={6}
            fill="transparent"
            stroke="none"
            style={{ cursor: 'pointer' }}
            onPointerDown={startDir(dir)}
            onPointerUp={endDir(dir)}
            onPointerCancel={endDir(dir)}
          />
          <text
            x={ax}
            y={ay}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={18}
            fill="hsl(220 15% 65%)"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {arrow}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Botão da barra de controle. */
function CtrlBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white active:scale-95 transition-all"
    >
      {children}
    </button>
  )
}

/**
 * Gamepad virtual para a página pública /jogar. Renderiza D-pad + botões A/B +
 * barra de controles (reiniciar, tela cheia, screenshot, mudo). Comunica-se com
 * o iframe sandboxed via postMessage — o inputBridge.ts dentro do iframe ouve
 * `sz:gamepad` e simula o estado de teclado.
 */
export function MobileGamepad({ iframeRef, onRestart, className }: MobileGamepadProps) {
  const [muted, setMuted] = useState(false)
  const [screenshotting, setScreenshotting] = useState(false)

  // Mudo: envia postMessage e alterna o ícone
  function toggleMute() {
    const next = !muted
    setMuted(next)
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:audio', muted: next }, '*')
  }

  // Tela cheia do iframe
  function requestFullscreen() {
    const el = iframeRef.current
    if (!el) return
    el.requestFullscreen?.().catch(() => {})
  }

  // Screenshot: pede ao iframe, aguarda resposta e baixa
  function takeScreenshot() {
    if (screenshotting || !iframeRef.current?.contentWindow) return
    setScreenshotting(true)
    iframeRef.current.contentWindow.postMessage({ type: 'sz:screenshot' }, '*')
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'sz:screenshot:result') return
      setScreenshotting(false)
      const dataUrl: string | null = e.data.dataUrl
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'screenshot.png'
      a.click()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className={className} style={{ touchAction: 'none' }}>
      {/* Linha principal: D-pad | (espaço) | A/B */}
      <div className="flex items-center justify-between px-4 py-2">
        <DPad iframeRef={iframeRef} />

        <div className="flex flex-col items-center gap-2">
          <ActionButton
            label="Botão A (espaço)"
            keyVal=" "
            code="Space"
            color="oklch(0.52 0.18 160)"
            iframeRef={iframeRef}
          />
          <ActionButton
            label="Botão B (enter)"
            keyVal="Enter"
            code="Enter"
            color="oklch(0.52 0.18 30)"
            iframeRef={iframeRef}
          />
        </div>
      </div>

      {/* Barra de controle */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 border-t border-white/10">
        <CtrlBtn label="Reiniciar" onClick={onRestart}>
          <RefreshCw size={18} />
        </CtrlBtn>
        <CtrlBtn label="Tela cheia" onClick={requestFullscreen}>
          <Maximize size={18} />
        </CtrlBtn>
        <CtrlBtn label="Screenshot" onClick={takeScreenshot}>
          <Camera size={18} className={screenshotting ? 'opacity-50' : ''} />
        </CtrlBtn>
        <CtrlBtn label={muted ? 'Ativar som' : 'Silenciar'} onClick={toggleMute}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </CtrlBtn>
      </div>
    </div>
  )
}
