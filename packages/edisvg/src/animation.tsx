'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import type {
  WebAnimationHandle,
  WebAnimationOptions,
  WebAnimationValue,
} from '../vendor/edi-web-types.js'
import { acquireArtwork } from './artwork-cache'

export async function prefetchAnimationRuntime(): Promise<void> {
  if (typeof window !== 'undefined') await import('../vendor/edi-web-player.mjs')
}

export interface EdiAnimationProps {
  src: string
  poster: string
  title?: string
  className?: string
  posterClassName?: string
  style?: CSSProperties
  width?: number
  height?: number
  animated?: boolean
  playing?: boolean
  inputs?: Readonly<Record<string, WebAnimationValue>>
  onReady?: (player: WebAnimationHandle) => void
  onStateChange?: WebAnimationOptions['onStateChange']
  onEvent?: WebAnimationOptions['onEvent']
  onError?: WebAnimationOptions['onError']
  onPosterReady?: () => void
  onPosterError?: () => void
  onRuntimeReadyChange?: (ready: boolean) => void
}

/** One shared SDK download, one owned SVG per effect. React never reconciles its generated nodes. */
export function EdiAnimation({
  src,
  poster,
  title,
  className,
  posterClassName,
  style,
  width = 300,
  height = 300,
  animated = true,
  playing,
  inputs,
  onReady,
  onStateChange,
  onEvent,
  onError,
  onPosterReady,
  onPosterError,
  onRuntimeReadyChange,
}: EdiAnimationProps) {
  const root = useRef<HTMLSpanElement>(null)
  const drawing = useRef<HTMLSpanElement>(null)
  const player = useRef<WebAnimationHandle | null>(null)
  const latest = useRef({
    src,
    playing,
    inputs,
    onReady,
    onStateChange,
    onEvent,
    onError,
    onRuntimeReadyChange,
  })
  latest.current = {
    src,
    playing,
    inputs,
    onReady,
    onStateChange,
    onEvent,
    onError,
    onRuntimeReadyChange,
  }
  const [eligible, setEligible] = useState(false)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState<string | null>(null)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (
      navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }
    ).connection
    const update = () => setEligible(!motion.matches && !connection?.saveData)
    update()
    motion.addEventListener('change', update)
    connection?.addEventListener?.('change', update)
    return () => {
      motion.removeEventListener('change', update)
      connection?.removeEventListener?.('change', update)
    }
  }, [])

  useEffect(() => {
    const element = root.current
    if (!element || !animated || !eligible) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [animated, eligible])

  useEffect(() => {
    if (!animated || !eligible || !near || !drawing.current) return
    const controller = new AbortController()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.width = '100%'
    svg.style.height = '100%'
    svg.setAttribute('aria-hidden', 'true')
    drawing.current.replaceChildren(svg)
    const request = acquireArtwork(src)
    let session: WebAnimationHandle | undefined
    setReady(null)
    const fail = (error: unknown) => {
      if (controller.signal.aborted || latest.current.src !== src) return
      setReady(null)
      latest.current.onError?.(error instanceof Error ? error : new Error('Animação indisponível.'))
    }
    void (async () => {
      const [runtime, content] = await Promise.all([
        import('../vendor/edi-web-player.mjs'),
        request.content,
      ])
      controller.signal.throwIfAborted()
      session = await runtime.mountWebAnimation(svg, content, {
        signal: controller.signal,
        autoplay: false,
        respectReducedMotion: true,
        pauseOffscreen: true,
        onStateChange: (state) => {
          if (!controller.signal.aborted && latest.current.src === src)
            latest.current.onStateChange?.(state)
        },
        onEvent: (event) => {
          if (!controller.signal.aborted && latest.current.src === src)
            latest.current.onEvent?.(event)
        },
        onError: fail,
      })
      controller.signal.throwIfAborted()
      if (latest.current.src !== src) {
        await session.destroy()
        return
      }
      player.current = session
      if (latest.current.inputs) {
        session.setInputs(latest.current.inputs)
        session.advance(0)
      }
      if (latest.current.playing !== false) session.play()
      setReady(src)
      latest.current.onReady?.(session)
    })().catch(fail)
    return () => {
      if (player.current === session) player.current = null
      controller.abort()
      request.release()
      // Abort starts the canonical async disposer. Joining it handles resource cleanup errors.
      // An old session's cleanup must never fail a new artwork through its latest callback.
      if (session)
        void session
          .destroy()
          .catch((error) => console.error('[edisvg] Falha ao liberar a sessão.', error))
      svg.remove()
    }
  }, [src, animated, eligible, near])

  useEffect(() => {
    if (!player.current || !inputs) return
    try {
      player.current.setInputs(inputs)
      player.current.advance(0)
    } catch (error) {
      player.current.pause()
      setReady(null)
      latest.current.onError?.(error instanceof Error ? error : new Error('Controle indisponível.'))
    }
  }, [inputs])
  useEffect(() => {
    if (!player.current) return
    if (playing === false) player.current.pause()
    else player.current.play()
  }, [playing])

  const visible = animated && eligible && near && ready === src
  useEffect(() => {
    latest.current.onRuntimeReadyChange?.(visible)
  }, [visible])
  return (
    <span
      ref={root}
      className={className}
      style={{ position: 'relative', display: 'inline-grid', ...style }}
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <img
        className={visible ? undefined : posterClassName}
        src={poster}
        alt=""
        width={width}
        height={height}
        draggable={false}
        onLoad={onPosterReady}
        onError={onPosterError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          visibility: visible ? 'hidden' : 'visible',
        }}
      />
      <span
        ref={drawing}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, visibility: visible ? 'visible' : 'hidden' }}
      />
    </span>
  )
}
