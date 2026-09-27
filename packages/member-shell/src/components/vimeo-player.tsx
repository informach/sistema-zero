'use client'

import type { VideoWatchCoverage } from '@sistemazero/core/learning'
import Player from '@vimeo/player'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'

interface VimeoPlayerProps {
  /** ID numérico já extraído da URL (nunca o `src` cru). */
  vimeoId: string
  /** Hash de privacidade (`h`) dos vídeos NÃO LISTADOS — o SDK exige a URL completa com ele. */
  vimeoHash?: string | null
  /** Watermark discreto (e-mail do aluno) sobre o vídeo, no canto superior esquerdo. */
  watermark?: string | null
  /** Retomar de onde parou (segundos). */
  initialPositionSeconds?: number | null
  /** ~250ms durante a reprodução (quem persiste faz o throttle). */
  onProgress?: (seconds: number, percent: number) => void
  /** Pause/fim → flush imediato da posição. */
  onFlush?: (seconds: number) => void
  onCoverage?: (coverage: VideoWatchCoverage) => void
  /** Disparado UMA vez ao cruzar o limiar de % assistido. */
  onReachedThreshold?: () => void
  /** Vídeo TERMINOU (evento `ended` do SDK) — p/ o host celebrar no fim de verdade. */
  onEnded?: () => void
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
  vimeoHash,
  watermark,
  initialPositionSeconds,
  onProgress,
  onFlush,
  onCoverage,
  onReachedThreshold,
  onEnded,
  thresholdPercent = 0.9,
}: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  // A instância viva do SDK: o efeito da tela cheia precisa falar com ela.
  const playerRef = useRef<Player | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [trackingFailed, setTrackingFailed] = useState(false)

  // Callbacks em refs: o Player é criado uma vez por vídeo; sem stale closures.
  const callbacksRef = useRef({ onProgress, onFlush, onCoverage, onReachedThreshold, onEnded })
  callbacksRef.current = { onProgress, onFlush, onCoverage, onReachedThreshold, onEnded }
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
    // Mesmos params do embed canônico antigo (sem título/byline, com DNT). Vídeo
    // NÃO LISTADO precisa da URL canônica COM o hash de privacidade (o SDK não
    // aceita `h` solto — só dentro da `url`); listado segue por `id` numérico.
    // A URL é MONTADA do id+hash já validados — nunca o `src` cru (invariante).
    const player = new Player(host, {
      ...(vimeoHash
        ? { url: `https://player.vimeo.com/video/${vimeoId}?h=${vimeoHash}` }
        : { id: Number(vimeoId) }),
      byline: false,
      title: false,
      portrait: false,
      dnt: true,
      playsinline: true,
      // ⚠️ NÃO ponha `min_quality` aqui. Piso de qualidade parece proteger a
      // criança de imagem ruim, mas faz o contrário do que o nome sugere: ele
      // PROÍBE o adaptativo de cair, e quem está no 4G congestionado da escola
      // troca "um pouco borrado" por "travando a cada dois segundos". O tamanho
      // pequeno do player era o problema real, e quem resolve isso é a largura
      // (a divisória arrastável) mais o pedido de qualidade na tela cheia.
    })
    playerRef.current = player
    const audioOwner = Symbol('vimeo')
    const unregisterAudio = registerLessonMedia(audioOwner, () => player.pause())
    player.on('play', () => {
      void requestLessonMediaFocus(audioOwner)
    })
    let disposed = false
    let sampledAt = 0
    let pendingSample = false
    async function sampleCoverage(flush?: number) {
      if (!callbacksRef.current.onCoverage || (pendingSample && flush === undefined)) return
      pendingSample = true
      sampledAt = Date.now()
      try {
        const [duration, played] = await Promise.all([player.getDuration(), player.getPlayed()])
        if (disposed || duration <= 0) return
        const ranges: VideoWatchCoverage['ranges'] = []
        // SDK versions describe these as objects; the iframe also sends tuple arrays.
        for (const range of played) {
          if (Array.isArray(range) && typeof range[0] === 'number' && typeof range[1] === 'number')
            ranges.push([range[0], range[1]])
          else if (typeof range.start === 'number' && typeof range.end === 'number')
            ranges.push([range.start, range.end])
          else throw new Error('Trechos do Vimeo inválidos.')
        }
        callbacksRef.current.onCoverage?.({ duration, ranges })
        setTrackingFailed(false)
      } catch {
        if (!disposed) setTrackingFailed(true)
      } finally {
        pendingSample = false
        if (!disposed && flush !== undefined) callbacksRef.current.onFlush?.(flush)
      }
    }

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
      if (Date.now() - sampledAt >= 1000) void sampleCoverage()
      if (!reachedRef.current && data.percent >= thresholdPercent) {
        reachedRef.current = true
        callbacksRef.current.onReachedThreshold?.()
      }
    })
    player.on('pause', (data: { seconds: number }) => {
      callbacksRef.current.onFlush?.(data.seconds)
      void sampleCoverage(data.seconds)
    })
    player.on('ended', (data: { duration: number }) => {
      callbacksRef.current.onFlush?.(data.duration)
      void sampleCoverage(data.duration)
      callbacksRef.current.onEnded?.()
    })

    return () => {
      disposed = true
      unregisterAudio()
      // `destroy()` remove o iframe que o PRÓPRIO SDK criou dentro do host —
      // o React nunca soube dele, então o próximo run cria um novo limpo.
      if (playerRef.current === player) playerRef.current = null
      player.destroy().catch(() => {})
    }
  }, [vimeoId, vimeoHash, thresholdPercent])

  // Sincroniza o estado do botão com a Fullscreen API (Esc, F11, etc.) e avisa o
  // player que o tamanho mudou.
  //
  // A tela cheia é do CONTAINER, não do iframe, de propósito: é o que mantém o
  // watermark visível (ver o cabeçalho). O efeito colateral é que, para o player
  // lá dentro, entrar em tela cheia é só um resize — o atalho interno do Vimeo
  // "tela cheia logo a melhor qualidade" nunca dispara, e o adaptativo sobe
  // devagar a partir do que já estava em buffer. Então a gente pede na mão.
  useEffect(() => {
    const sync = () => {
      const cheia = document.fullscreenElement === containerRef.current
      setIsFullscreen(cheia)
      const player = playerRef.current
      if (!player) return
      // Melhor esforço: `setQuality` é restrito a contas Plus/PRO/Business, e
      // numa conta sem ele a promessa só rejeita. Nunca pode derrubar a aula.
      if (!cheia) {
        player.setQuality('auto').catch(() => {})
        return
      }
      player
        .getQualities()
        .then((qualidades: Array<{ id: string }>) => {
          // A lista vem da melhor para a pior, com 'auto' junto; queremos a
          // melhor CONCRETA.
          const melhor = qualidades.find((q) => q.id !== 'auto')
          if (melhor) return player.setQuality(melhor.id)
        })
        .catch(() => {})
    }
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
      {trackingFailed && (
        <p
          role="alert"
          className="absolute bottom-12 inset-x-3 rounded-lg bg-black/80 p-3 text-sm text-white"
        >
          Não conseguimos acompanhar os trechos assistidos. Confira sua conexão; tentaremos
          novamente durante a reprodução.
        </p>
      )}
      {watermark ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-3 left-3 max-w-[60%] truncate rounded bg-black/30 px-2 py-0.5 text-[10px] text-white/60"
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
