'use client'

import { Camera, Maximize, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { useEffect, useState } from 'react'

// Paleta do console (inspirada no MakeCode Arcade)
const C = {
  body: '#3bbfc8',
  bodyEdge: '#28959d',
  bodyGrad: 'linear-gradient(170deg,#47cdd6 0%,#2fa8b0 100%)',
  bezel: '#111c26',
  dpad: '#3a4d5c',
  dpadGrad: 'linear-gradient(145deg,#4a5f70 0%,#2c3d4a 100%)',
  dpadEdge: '#1e2d38',
  dpadCenter: '#293849',
  arrow: '#7aa0b8',
  btnA: '#c84040',
  btnAEdge: '#8a2828',
  btnB: '#2d6fcc',
  btnBEdge: '#1a4a99',
  btnFace: '#e8f0f8',
  ctrl: 'rgba(0,0,0,0.22)',
  ctrlIcon: 'rgba(255,255,255,0.72)',
  ctrlBorder: 'rgba(255,255,255,0.10)',
}

function sendKey(
  iframe: HTMLIFrameElement | null | undefined,
  action: 'keydown' | 'keyup',
  key: string,
  code: string,
) {
  iframe?.contentWindow?.postMessage({ type: 'sz:gamepad', action, key, code }, '*')
}

// ─── D-pad ───────────────────────────────────────────────────────────────────

type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

const DPAD_SIZE = 128
const DPAD_ARM = 42

function DPad({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const S = DPAD_SIZE
  const A = DPAD_ARM

  // Clip-path da cruz: 12 pontos
  const cross = [
    `${A}px 0`,
    `${S - A}px 0`,
    `${S - A}px ${A}px`,
    `${S}px ${A}px`,
    `${S}px ${S - A}px`,
    `${S - A}px ${S - A}px`,
    `${S - A}px ${S}px`,
    `${A}px ${S}px`,
    `${A}px ${S - A}px`,
    `0 ${S - A}px`,
    `0 ${A}px`,
    `${A}px ${A}px`,
  ].join(',')

  function btn(
    dir: Dir,
    key: string,
    x: number,
    y: number,
    w: number,
    h: number,
    arrow: ReactNode,
  ) {
    return (
      <button
        key={dir}
        type="button"
        aria-label={dir.replace('Arrow', '')}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          background: 'transparent',
          border: 0,
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
          borderRadius: 4,
          transition: 'filter 60ms',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.style.filter = 'brightness(1.6)'
          sendKey(iframeRef.current, 'keydown', key, key)
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          e.currentTarget.style.filter = ''
          sendKey(iframeRef.current, 'keyup', key, key)
        }}
        onPointerCancel={(e) => {
          e.currentTarget.style.filter = ''
          sendKey(iframeRef.current, 'keyup', key, key)
        }}
      >
        {arrow}
      </button>
    )
  }

  const arrowUp = (
    <svg width={14} height={10} viewBox="0 0 14 10" aria-hidden>
      <path d="M7 0L14 10H0Z" fill={C.arrow} />
    </svg>
  )
  const arrowDown = (
    <svg width={14} height={10} viewBox="0 0 14 10" aria-hidden>
      <path d="M7 10L0 0H14Z" fill={C.arrow} />
    </svg>
  )
  const arrowLeft = (
    <svg width={10} height={14} viewBox="0 0 10 14" aria-hidden>
      <path d="M0 7L10 0V14Z" fill={C.arrow} />
    </svg>
  )
  const arrowRight = (
    <svg width={10} height={14} viewBox="0 0 10 14" aria-hidden>
      <path d="M10 7L0 14V0Z" fill={C.arrow} />
    </svg>
  )

  return (
    <div style={{ position: 'relative', width: S, height: S, flexShrink: 0 }}>
      {/* Corpo da cruz */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: C.dpadGrad,
          clipPath: `polygon(${cross})`,
          borderRadius: 6,
          boxShadow: `0 4px 0 ${C.dpadEdge}, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}
      />
      {/* Knob central */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: A + 4,
          top: A + 4,
          width: A - 8,
          height: A - 8,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 38%, #3f5568, ${C.dpadCenter})`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.45)`,
        }}
      />
      {/* Botões invisíveis sobre cada braço */}
      {btn('ArrowUp', 'ArrowUp', A, 0, A, A, arrowUp)}
      {btn('ArrowDown', 'ArrowDown', A, S - A, A, A, arrowDown)}
      {btn('ArrowLeft', 'ArrowLeft', 0, A, A, A, arrowLeft)}
      {btn('ArrowRight', 'ArrowRight', S - A, A, A, A, arrowRight)}
    </div>
  )
}

// ─── Botões A / B ─────────────────────────────────────────────────────────────
function ActionButtons({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const SIZE = 54

  function mkBtn(
    letter: string,
    keyVal: string,
    code: string,
    bg: string,
    edge: string,
    pos: { top?: number; left?: number; right?: number; bottom?: number },
  ) {
    return (
      <button
        key={letter}
        type="button"
        aria-label={`Botão ${letter}`}
        style={{
          position: 'absolute',
          ...pos,
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: bg,
          border: 0,
          borderBottom: `4px solid ${edge}`,
          boxShadow: `0 4px 0 ${edge}, inset 0 1px 0 rgba(255,255,255,0.15)`,
          color: C.btnFace,
          fontWeight: 800,
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-display, sans-serif)',
          letterSpacing: '0.02em',
          transition: 'transform 60ms, box-shadow 60ms, border-bottom-width 60ms',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.style.transform = 'translateY(3px)'
          e.currentTarget.style.boxShadow = `0 1px 0 ${edge}, inset 0 1px 0 rgba(255,255,255,0.15)`
          e.currentTarget.style.borderBottomWidth = '1px'
          sendKey(iframeRef.current, 'keydown', keyVal, code)
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = `0 4px 0 ${edge}, inset 0 1px 0 rgba(255,255,255,0.15)`
          e.currentTarget.style.borderBottomWidth = '4px'
          sendKey(iframeRef.current, 'keyup', keyVal, code)
        }}
        onPointerCancel={(e) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = `0 4px 0 ${edge}, inset 0 1px 0 rgba(255,255,255,0.15)`
          e.currentTarget.style.borderBottomWidth = '4px'
          sendKey(iframeRef.current, 'keyup', keyVal, code)
        }}
      >
        {letter}
      </button>
    )
  }

  // Layout Nintendo: A no canto superior-direito, B no inferior-esquerdo
  const CONTAINER = 120
  return (
    <div style={{ position: 'relative', width: CONTAINER, height: CONTAINER, flexShrink: 0 }}>
      {mkBtn('A', ' ', 'Space', C.btnA, C.btnAEdge, { top: 0, right: 0 })}
      {mkBtn('B', 'Enter', 'Enter', C.btnB, C.btnBEdge, { bottom: 0, left: 0 })}
    </div>
  )
}

// ─── Barra de controle ────────────────────────────────────────────────────────

function CtrlBar({
  iframeRef,
  onRestart,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  onRestart: () => void
}) {
  const [muted, setMuted] = useState(false)
  const [shooting, setShooting] = useState(false)

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type !== 'sz:screenshot:result') return
      setShooting(false)
      const url: string | null = e.data.dataUrl
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = 'jogo.png'
      a.click()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:audio', muted: next }, '*')
  }

  function fullscreen() {
    iframeRef.current?.requestFullscreen?.().catch(() => {})
  }

  function screenshot() {
    if (shooting) return
    setShooting(true)
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:screenshot' }, '*')
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 10,
    background: C.ctrl,
    border: `1px solid ${C.ctrlBorder}`,
    color: C.ctrlIcon,
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
        gap: 10,
        padding: '6px 12px 10px',
        borderTop: `1px solid ${C.ctrlBorder}`,
      }}
    >
      {[
        { label: 'Reiniciar', icon: <RefreshCw size={16} />, onClick: onRestart },
        { label: 'Tela cheia', icon: <Maximize size={16} />, onClick: fullscreen },
        {
          label: 'Screenshot',
          icon: <Camera size={16} style={{ opacity: shooting ? 0.4 : 1 }} />,
          onClick: screenshot,
        },
        {
          label: muted ? 'Ativar som' : 'Silenciar',
          icon: muted ? <VolumeX size={16} /> : <Volume2 size={16} />,
          onClick: toggleMute,
        },
      ].map(({ label, icon, onClick }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          onClick={onClick}
          style={btnStyle}
          onPointerDown={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.42)'
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

// ─── Componente principal ─────────────────────────────────────────────────────

interface MobileGamepadProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
  onRestart: () => void
  /** Tela do jogo — será posicionada dentro do layout do console. */
  children: React.ReactNode
}

/**
 * Layout completo de console móvel: corpo teal + tela embutida + D-pad + A/B +
 * barra de controle. Em portrait a tela fica acima dos controles; em landscape
 * (orientação horizontal com altura < 520px) a tela fica entre D-pad e A/B.
 *
 * Comunica-se com o iframe sandboxed via postMessage (sz:gamepad / sz:audio /
 * sz:screenshot) — o inputBridge.ts dentro do iframe ouve e simula teclado.
 */
export function MobileGamepad({ iframeRef, onRestart, children }: MobileGamepadProps) {
  const [landscape, setLandscape] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 520px)')
    const update = () => setLandscape(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Estilos do corpo do console
  const body: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    background: C.bodyGrad,
    borderRadius: landscape ? 0 : '18px 18px 0 0',
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 ${C.bodyEdge}`,
  }

  // Moldura da tela
  const screenWrap: React.CSSProperties = {
    borderRadius: 12,
    overflow: 'hidden',
    background: C.bezel,
    padding: 4,
    boxShadow: `0 0 0 2px ${C.bodyEdge}, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
  }

  if (landscape) {
    // ── Landscape: D-pad | tela | A/B ── //
    return (
      <div style={body}>
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            alignItems: 'center',
            padding: '8px 10px 0',
            gap: 10,
          }}
        >
          {/* D-pad coluna esquerda */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DPad iframeRef={iframeRef} />
          </div>

          {/* Tela */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ ...screenWrap, width: '100%', aspectRatio: '5/3' }}>{children}</div>
          </div>

          {/* A/B coluna direita */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ActionButtons iframeRef={iframeRef} />
          </div>
        </div>

        <CtrlBar iframeRef={iframeRef} onRestart={onRestart} />
      </div>
    )
  }

  // ── Portrait: tela | controles ── //
  return (
    <div style={body}>
      {/* Tela */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...screenWrap, width: '100%', aspectRatio: '5/3' }}>{children}</div>
      </div>

      {/* Controles: D-pad + centro + A/B */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px 4px',
          gap: 8,
        }}
      >
        <DPad iframeRef={iframeRef} />

        {/* Centro: indicadores + botão start */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* LEDs decorativos */}
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff6b6b', '#ffd166', '#06d6a0'].map((col) => (
              <div
                key={col}
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: col,
                  boxShadow: `0 0 6px ${col}88`,
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
          {/* Botão SELECT/MENU */}
          <button
            type="button"
            aria-label="Reiniciar jogo"
            onClick={onRestart}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: `1px solid ${C.ctrlBorder}`,
              borderRadius: 20,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '4px 10px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            ↺ Reiniciar
          </button>
        </div>

        <ActionButtons iframeRef={iframeRef} />
      </div>

      <CtrlBar iframeRef={iframeRef} onRestart={onRestart} />
    </div>
  )
}
