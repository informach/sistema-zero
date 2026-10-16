import { Audio } from '@remotion/media'
import {
  captionsForClip,
  clipEnvelope,
  counterText,
  type VideoClip,
  type VideoProject,
} from '@sistemazero/marketing-contracts'
import '@fontsource/nunito/latin-ext-600.css'
import '@fontsource/nunito/latin-ext-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-800.css'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { ArtCompositionView } from '../art-composition'
import { useCompositionFonts } from '../composition-fonts'
import type { TimelineProps } from './props'

function Clip({
  clip,
  src,
  muted,
  accent,
  assets,
}: {
  clip: VideoClip
  src?: string
  muted: boolean
  accent: string
  assets: Record<string, string>
}) {
  const frame = useCurrentFrame(),
    { fps, width, height } = useVideoConfig()
  const enter = interpolate(frame, [0, Math.min(15, clip.durationInFrames)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const envelope = clipEnvelope(clip, frame)
  const volume = (at: number) => clip.volume * clipEnvelope(clip, at)
  if (!['text', 'art'].includes(clip.kind) && !src)
    throw new Error('A mídia desta cena ainda não foi carregada')
  const media = {
    src: src ?? '',
    trimBefore: Math.round((clip.sourceStartMs * fps) / 1000),
    playbackRate: clip.playbackRate,
    muted,
    volume,
  }
  if (clip.kind === 'audio') return <Audio {...media} />
  const transform =
    clip.effect === 'slide'
      ? `translateY(${(1 - enter) * height * 0.05}px)`
      : clip.effect === 'zoom'
        ? `scale(${1.08 - (0.08 * frame) / Math.max(1, clip.durationInFrames - 1)})`
        : undefined
  const opacity = envelope * (clip.effect === 'fade' ? enter : 1)
  const artScale = clip.art
    ? Math.min(width / clip.art.composition.width, height / clip.art.composition.height)
    : 1
  return (
    <AbsoluteFill style={{ opacity, transform, overflow: 'hidden' }}>
      {clip.kind === 'video' ? (
        <OffthreadVideo
          {...media}
          transparent
          style={{ width: '100%', height: '100%', objectFit: clip.fit }}
        />
      ) : null}
      {clip.kind === 'image' ? (
        <Img src={src ?? ''} style={{ width: '100%', height: '100%', objectFit: clip.fit }} />
      ) : null}
      {clip.kind === 'art' && clip.art ? (
        <div
          style={{
            position: 'absolute',
            width: clip.art.composition.width,
            height: clip.art.composition.height,
            left: (width - clip.art.composition.width * artScale) / 2,
            top: (height - clip.art.composition.height * artScale) / 2,
            transformOrigin: 'top left',
            transform: `scale(${artScale})`,
          }}
        >
          <ArtCompositionView {...clip.art} assets={assets} />
        </div>
      ) : null}
      {clip.kind === 'text' ? (
        <AbsoluteFill
          style={{
            padding: `${height * 0.14}px ${width * 0.08}px ${height * 0.2}px`,
            justifyContent:
              clip.position === 'top'
                ? 'flex-start'
                : clip.position === 'bottom'
                  ? 'flex-end'
                  : 'center',
            alignItems: 'center',
          }}
        >
          <div
            data-video-text
            style={{
              maxWidth: '100%',
              fontSize: width * 0.055,
              fontWeight: 800,
              lineHeight: 1.16,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              textAlign: 'center',
              padding: width * 0.035,
              borderRadius: width * 0.02,
              color: clip.effect === 'cta' || clip.effect === 'highlight' ? '#172a46' : '#ffffff',
              background:
                clip.effect === 'cta' || clip.effect === 'highlight' ? accent : 'rgba(0,0,0,.82)',
              transform:
                clip.effect === 'lower-third'
                  ? `translateX(${(1 - enter) * -width * 0.1}px)`
                  : undefined,
            }}
          >
            {clip.text}
            {clip.effect === 'counter' ? (
              <div style={{ fontSize: '1.65em', color: accent, marginTop: width * 0.03 }}>
                {counterText(clip, frame)}
              </div>
            ) : null}
            {clip.effect === 'list' ? (
              <div style={{ marginTop: width * 0.03, display: 'grid', gap: width * 0.025 }}>
                {clip.listItems?.map((item, index, items) => (
                  <div
                    key={item.id}
                    style={{
                      opacity: Math.max(
                        0,
                        Math.min(
                          1,
                          (frame -
                            index * Math.min(15, clip.durationInFrames / (items.length + 1))) /
                            Math.min(10, clip.durationInFrames / (items.length + 1)),
                        ),
                      ),
                    }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  )
}
function Captions({ timeline }: { timeline: VideoProject }) {
  const frame = useCurrentFrame(),
    { width, height } = useVideoConfig()
  const timed = useMemo(() => {
    const tracks = timeline.tracks.filter((track) => track.kind === 'captions')
    if (tracks.length && tracks.every((track) => track.muted)) return []
    const byAsset = new Map<string, VideoProject['captions']>()
    for (const caption of timeline.captions) {
      const values = byAsset.get(caption.assetId) ?? []
      values.push(caption)
      byAsset.set(caption.assetId, values)
    }
    return timeline.clips
      .filter(
        (clip) =>
          (clip.kind === 'video' || clip.kind === 'audio') &&
          (clip.showCaptions ?? clip.kind === 'video'),
      )
      .flatMap((clip) =>
        captionsForClip(
          { ...timeline, captions: clip.assetId ? (byAsset.get(clip.assetId) ?? []) : [] },
          clip,
        ).map((caption) => ({ ...caption, key: `${clip.id}:${caption.id}` })),
      )
  }, [timeline])
  const visible = timed.filter(
    (caption) => frame >= caption.from && frame < caption.from + caption.durationInFrames,
  )
  if (!visible.length) return null
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: `${height * 0.12}px ${width * 0.08}px ${height * 0.18}px`,
        gap: width * 0.01,
      }}
    >
      {visible.map((caption) => (
        <div
          key={caption.key}
          data-video-text
          style={{
            fontSize: width * 0.041,
            lineHeight: 1.2,
            fontWeight: 800,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            color: '#ffffff',
            background: 'rgba(0,0,0,.88)',
            padding: `${width * 0.012}px ${width * 0.025}px`,
            borderRadius: width * 0.012,
            maxWidth: '100%',
          }}
        >
          {caption.text}
        </div>
      ))}
    </AbsoluteFill>
  )
}
/** One timeline engine for the shared Player and the desktop renderer. */
export function TimelineComposition({ timeline, assets }: TimelineProps) {
  const root = useRef<HTMLDivElement>(null),
    frame = useCurrentFrame()
  const fontUrl = timeline.fontAssetId ? assets[timeline.fontAssetId] : undefined
  const family = timeline.fontAssetId ? `marketing-video-${timeline.fontAssetId}` : 'Nunito'
  const artFonts = new Set(
    timeline.clips.flatMap((clip) =>
      clip.art?.composition.fontAssetId ? [clip.art.composition.fontAssetId] : [],
    ),
  )
  const fontReady = useCompositionFonts([
    { family, url: fontUrl, required: Boolean(timeline.fontAssetId) },
    { family: 'Nunito', required: false },
    ...[...artFonts]
      .sort()
      .map((id) => ({ family: `marketing-${id}`, url: assets[id], required: true })),
  ])
  useLayoutEffect(() => {
    const handle = delayRender('Conferindo textos e legendas do quadro')
    let live = true
    let released = false
    const release = () => {
      if (!released) {
        released = true
        continueRender(handle)
      }
    }
    const position = `${((frame * timeline.fps.denominator) / timeline.fps.numerator).toFixed(2)} s`
    void (async () => {
      await fontReady.current
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      if (!live) return
      const bounds = root.current?.getBoundingClientRect(),
        boxes: DOMRect[] = []
      if (!bounds) throw new Error('Área de vídeo não carregada')
      for (const element of root.current?.querySelectorAll('[data-video-text], [data-art-text]') ??
        []) {
        if (!element.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(element)
        const ink = range.getBoundingClientRect()
        if (
          ink.left < bounds.left - 1 ||
          ink.right > bounds.right + 1 ||
          ink.top < bounds.top - 1 ||
          ink.bottom > bounds.bottom + 1
        )
          throw new Error(
            `Em ${position}, há texto fora do vídeo. Peça à IA para ajustar a montagem ou dividir a legenda.`,
          )
        if (
          boxes.some(
            (box) =>
              Math.min(box.right, ink.right) - Math.max(box.left, ink.left) > 2 &&
              Math.min(box.bottom, ink.bottom) - Math.max(box.top, ink.top) > 2,
          )
        )
          throw new Error(
            `Em ${position}, há textos ou legendas sobrepostos. Peça à IA para ajustar a distribuição.`,
          )
        boxes.push(ink)
      }
    })()
      .then(() => {
        if (live) release()
      })
      .catch((error) => {
        if (live) cancelRender(error)
      })
    return () => {
      live = false
      release()
    }
  }, [frame, timeline, fontReady])
  return (
    <AbsoluteFill
      ref={root}
      style={{ background: timeline.background, fontFamily: family, overflow: 'hidden' }}
    >
      {timeline.tracks
        .filter((track) => track.kind !== 'captions')
        .flatMap((track) =>
          timeline.clips
            .filter((clip) => clip.trackId === track.id)
            .map((clip) => (
              <Sequence
                key={clip.id}
                from={clip.startFrame}
                durationInFrames={clip.durationInFrames}
                layout={clip.kind === 'audio' ? 'none' : 'absolute-fill'}
              >
                <Clip
                  clip={clip}
                  src={clip.assetId ? assets[clip.assetId] : undefined}
                  muted={track.muted}
                  accent={timeline.accent}
                  assets={assets}
                />
              </Sequence>
            )),
        )}
      <Captions timeline={timeline} />
    </AbsoluteFill>
  )
}
