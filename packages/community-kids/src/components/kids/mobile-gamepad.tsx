'use client'

import { Camera, Maximize, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { requestGamepadFullscreen } from './gamepad-fullscreen'

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

// Segurar um botão do gamepad não pode abrir menu de contexto/seleção (kids
// seguram as setas o tempo todo) — aplicado em todo botão de jogo.
const holdSafe: CSSProperties = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
}

// ─── D-pad ───────────────────────────────────────────────────────────────────

type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

const DPAD_SIZE = 128
const DPAD_ARM = 42

function DPad({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const S = DPAD_SIZE
  const A = DPAD_ARM

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
          cursor: 'pointer',
          borderRadius: 14,
          transition: 'filter 60ms',
          ...holdSafe,
        }}
        onContextMenu={(e) => e.preventDefault()}
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

  // Barras da cruz com pontas ARREDONDADAS (clip-path deixava os cantos duros).
  // O gradiente é ancorado no contêiner via backgroundSize/Position — as duas
  // barras compõem UMA superfície contínua, sem emenda no cruzamento; o
  // drop-shadow do wrapper segue a silhueta da UNIÃO (sombra 3D única).
  const barBase: CSSProperties = {
    position: 'absolute',
    borderRadius: 14,
    background: C.dpadGrad,
    backgroundSize: `${S}px ${S}px`,
  }

  return (
    <div style={{ position: 'relative', width: S, height: S, flexShrink: 0 }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          filter: `drop-shadow(0 4px 0 ${C.dpadEdge})`,
        }}
      >
        {/* Barra vertical */}
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
        {/* Barra horizontal */}
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
      {/* Knob central */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: (S - A) / 2 + 4,
          top: (S - A) / 2 + 4,
          width: A - 8,
          height: A - 8,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 38%, #3f5568, ${C.dpadCenter})`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.45)`,
        }}
      />
      {/* Botões invisíveis sobre cada braço */}
      {btn('ArrowUp', 'ArrowUp', (S - A) / 2, 0, A, (S - A) / 2, arrowUp)}
      {btn('ArrowDown', 'ArrowDown', (S - A) / 2, (S + A) / 2, A, (S - A) / 2, arrowDown)}
      {btn('ArrowLeft', 'ArrowLeft', 0, (S - A) / 2, (S - A) / 2, A, arrowLeft)}
      {btn('ArrowRight', 'ArrowRight', (S + A) / 2, (S - A) / 2, (S - A) / 2, A, arrowRight)}
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
          cursor: 'pointer',
          fontFamily: 'var(--font-display, sans-serif)',
          letterSpacing: '0.02em',
          transition: 'transform 60ms, box-shadow 60ms, border-bottom-width 60ms',
          ...holdSafe,
        }}
        onContextMenu={(e) => e.preventDefault()}
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

  // Layout Nintendo: A no canto superior-direito, B no inferior-esquerdo (mais
  // juntos que a 1ª versão — container menor aproxima A de B).
  const CONTAINER = 106
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
  fullscreenTargetRef,
  onRestart,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  fullscreenTargetRef: RefObject<HTMLDivElement | null>
  onRestart: () => void
}) {
  const [muted, setMuted] = useState(false)
  const [shooting, setShooting] = useState(false)
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

  async function fullscreen() {
    await requestGamepadFullscreen(fullscreenTargetRef.current)
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
        gap: 12,
        // marginTop:auto empurra a barra pro PÉ do console — longe do D-pad/A-B,
        // pra criança não esbarrar nela no meio do jogo.
        marginTop: 'auto',
        padding: '10px 14px 12px',
        borderTop: `1px solid ${C.ctrlBorder}`,
      }}
    >
      {[
        { label: 'Reiniciar', icon: <RefreshCw size={18} />, onClick: onRestart },
        { label: 'Tela cheia', icon: <Maximize size={18} />, onClick: fullscreen },
        {
          label: 'Screenshot',
          icon: <Camera size={18} style={{ opacity: shooting ? 0.4 : 1 }} />,
          onClick: screenshot,
        },
        {
          label: muted ? 'Ativar som' : 'Silenciar',
          icon: muted ? <VolumeX size={18} /> : <Volume2 size={18} />,
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
  children: ReactNode
}

/**
 * Layout completo de console móvel: corpo teal fechado (arredondado nos 4
 * cantos, com margem da borda da página) + tela embutida + D-pad + A/B + barra
 * de controle no pé. Orientação decide o arranjo: retrato = tela em cima e
 * controles embaixo; paisagem (celular deitado E desktop) = D-pad | tela | A/B,
 * com a tela limitada pela ALTURA da janela para caber sempre inteira.
 *
 * Comunica-se com o iframe sandboxed via postMessage (sz:gamepad / sz:audio /
 * sz:screenshot) — o inputBridge.ts dentro do iframe despacha KeyboardEvent
 * sintético (alcança os runtimes 2D/3D e os blocos de evento do aluno).
 */
export function MobileGamepad({ iframeRef, onRestart, children }: MobileGamepadProps) {
  const [landscape, setLandscape] = useState(false)
  const gamepadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    const update = () => setLandscape(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Corpo do console: fechado (raio nos 4 cantos), com margem da página e
  // centrado — no desktop não vira uma prancha de parede a parede.
  const body: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    alignSelf: 'center',
    width: landscape
      ? 'min(100% - 20px, calc((100dvh - 152px) * 5 / 3 + 380px))'
      : 'min(100% - 20px, 640px)',
    marginBottom: 10,
    background: C.bodyGrad,
    borderRadius: 22,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 ${C.bodyEdge}, 0 6px 18px rgba(0,0,0,0.18)`,
  }

  // Moldura da tela
  const screenWrap: CSSProperties = {
    borderRadius: 12,
    overflow: 'hidden',
    background: C.bezel,
    padding: 4,
    boxShadow: `0 0 0 2px ${C.bodyEdge}, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
  }

  if (landscape) {
    // ── Paisagem (mobile deitado + desktop): D-pad | tela | A/B ── //
    return (
      <div ref={gamepadRef} style={body}>
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px 8px',
            gap: 16,
          }}
        >
          {/* D-pad coluna esquerda */}
          <DPad iframeRef={iframeRef} />

          {/* Tela — limitada pela altura da janela p/ caber sempre inteira */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                ...screenWrap,
                width: 'min(100%, calc((100dvh - 152px) * 5 / 3))',
                aspectRatio: '5/3',
              }}
            >
              {children}
            </div>
          </div>

          {/* A/B coluna direita */}
          <ActionButtons iframeRef={iframeRef} />
        </div>

        <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={gamepadRef} onRestart={onRestart} />
      </div>
    )
  }

  // ── Retrato: tela | controles | barra ── //
  return (
    <div ref={gamepadRef} style={body}>
      {/* Tela */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...screenWrap, width: '100%', aspectRatio: '5/3' }}>{children}</div>
      </div>

      {/* Controles: D-pad e A/B puxados pro centro (sem cluster decorativo) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(40px, 14vw, 96px)',
          padding: '10px 16px 22px',
        }}
      >
        <DPad iframeRef={iframeRef} />
        <ActionButtons iframeRef={iframeRef} />
      </div>

      <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={gamepadRef} onRestart={onRestart} />
    </div>
  )
}
