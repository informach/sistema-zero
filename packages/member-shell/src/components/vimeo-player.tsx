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
 * postMessage; a CSP `frame-src player.vimeo.com` já cobre). O SDK é o DONO do
 * iframe: criamos o Player num DIV host com `{ id }` (o ID numérico já
 * extraído — nunca interpolamos src cru, invariante do package) e o SDK
 * injeta/remove o iframe sozinho. ⚠️ NÃO voltar ao padrão "iframe no JSX +
 * new Player(iframe)": `destroy()` REMOVE o iframe do DOM real e o React não
 * fica sabendo — no double-invoke do StrictMode (e em re-runs do effect) o
 * ref apontava p/ um iframe ÓRFÃO e o vídeo sumia na navegação client-side
 * (só voltava com F5).
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
  const hostRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Callbacks em refs: o Player é criado uma vez por vídeo; sem stale closures.
  const callbacksRef = useRef({ onProgress, onFlush, onReachedThreshold })
  callbacksRef.current = { onProgress, onFlush, onReachedThreshold }
  const reachedRef = useRef(false)
  const lastSecondsRef = useRef(0)

  // Recria o Player quando o vídeo muda (vimeoId). `initialPositionSeconds`
  // fica intencionalmente FORA das deps: a posição salva só vale na montagem
  // do vídeo (cada save não deve resetar o player).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver acima
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    reachedRef.current = false
    // Mesmos params do embed canônico antigo (sem título/byline, com DNT).
    const player = new Player(host, {
      id: Number(vimeoId),
      byline: false,
      title: false,
      portrait: false,
      dnt: true,
      playsinline: true,
    })

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
      // `destroy()` remove o iframe que o PRÓPRIO SDK criou dentro do host —
      // o React nunca soube dele, então o próximo run cria um novo limpo.
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
      {/* Host do iframe do SDK (o title/allow do iframe vêm do oEmbed). */}
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
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
