'use client'

import Player from '@vimeo/player'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface VimeoPlayerProps {
  /** ID numérico já extraído da URL (nunca o `src` cru). */
  vimeoId: string
  /** Watermark discreto (e-mail do aluno) sobre o vídeo. */
  watermark?: string | null
  /** Retomar de onde parou (segundos). */
  initialPositionSeconds?: number | null
  /** ~250ms durante a reprodução (quem persiste faz o throttle). */
  onProgress?: (seconds: number, percent: number) => void
  /** Pause/fim → flush imediato da posição. */
  onFlush?: (seconds: number) => void
  /** Disparado UMA vez ao cruzar o limiar de % assistido. */
  onReachedThreshold?: () => void
  /** Fração assistida que conta como "viu a aula" (default 0.9). */
  thresholdPercent?: number
}

/**
 * Player Vimeo com SDK (@vimeo/player, bundle local — fala com o iframe por
 * postMessage; a CSP `frame-src player.vimeo.com` já cobre). Iframe montado com
 * URL CANÔNICA + params (nunca interpola src cru — invariante do package).
 * Fullscreen custom no CONTAINER (Fullscreen API) p/ manter o watermark visível
 * em tela cheia — padrão portado do legado comunidade-sistema-zero.
 */
export function VimeoPlayer({
  vimeoId,
  watermark,
  initialPositionSeconds,
  onProgress,
  onFlush,
  onReachedThreshold,
  thresholdPercent = 0.9,
}: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Callbacks em refs: o Player é criado uma vez por vídeo; sem stale closures.
  const callbacksRef = useRef({ onProgress, onFlush, onReachedThreshold })
  callbacksRef.current = { onProgress, onFlush, onReachedThreshold }
  const reachedRef = useRef(false)
  const lastSecondsRef = useRef(0)

  const src = buildEmbedUrl(vimeoId)

  // Recria o Player quando o vídeo muda (vimeoId). `initialPositionSeconds`
  // fica intencionalmente FORA das deps: a posição salva só vale na montagem
  // do vídeo (cada save não deve resetar o player).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver acima
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    reachedRef.current = false
    const player = new Player(iframe)

    const initial = initialPositionSeconds ?? 0
    if (initial > 2) {
      // Retomar de onde parou; RangeError (posição além do fim) é ignorado.
      player.ready().then(
        () => player.setCurrentTime(initial).catch(() => {}),
        () => {},
      )
    }

    player.on('timeupdate', (data: { seconds: number; percent: number }) => {
      lastSecondsRef.current = data.seconds
      callbacksRef.current.onProgress?.(data.seconds, data.percent)
      if (!reachedRef.current && data.percent >= thresholdPercent) {
        reachedRef.current = true
        callbacksRef.current.onReachedThreshold?.()
      }
    })
    player.on('pause', (data: { seconds: number }) => {
      callbacksRef.current.onFlush?.(data.seconds)
    })
    player.on('ended', (data: { duration: number }) => {
      callbacksRef.current.onFlush?.(data.duration)
    })

    return () => {
      // `destroy()` remove o iframe; o React só desmonta o container (ok).
      player.destroy().catch(() => {})
    }
  }, [vimeoId, thresholdPercent])

  // Sincroniza o estado do botão com a Fullscreen API (Esc, F11, etc.).
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await containerRef.current?.requestFullscreen()
    } catch {
      // navegador pode bloquear sem gesto válido — silencioso
    }
  }

  return (
    <div
      ref={containerRef}
      className="group/player relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black"
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Vídeo da aula"
        allow="autoplay; picture-in-picture; encrypted-media"
        className="h-full w-full"
      />
      {watermark ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-3 max-w-[60%] truncate rounded bg-black/30 px-2 py-0.5 text-[10px] text-white/60"
        >
          {watermark}
        </span>
      ) : null}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white/90 opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover/player:opacity-100"
      >
        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  )
}

/** URL canônica do embed (espelha o legado): sem título/byline, com DNT. */
function buildEmbedUrl(vimeoId: string): string {
  const url = new URL(`https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`)
  url.searchParams.set('title', '0')
  url.searchParams.set('byline', '0')
  url.searchParams.set('portrait', '0')
  url.searchParams.set('dnt', '1')
  url.searchParams.set('playsinline', '1')
  return url.toString()
}
