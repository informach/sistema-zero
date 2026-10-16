import type { Demonstration, DemonstrationSource } from '@sistemazero/marketing-contracts'
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion'
import { demonstrationFrame, fitDemonstrationImage } from './demonstration-motion'

function SourcePanel({
  source,
  url,
  width,
  height,
  context,
  active,
  accent,
}: {
  source: DemonstrationSource
  url: string
  width: number
  height: number
  context: number
  active: boolean
  accent: string
}) {
  const image = fitDemonstrationImage(source.width, source.height, width, height)
  const focus = source.focus
  const zoom = 1 + (Math.min(3, 1 / Math.max(focus.width, focus.height)) - 1) * (1 - context)
  const focusX = image.left + image.width * (focus.x + focus.width / 2)
  const focusY = image.top + image.height * (focus.y + focus.height / 2)
  const translateX = (width / 2 - focusX) * (1 - context)
  const translateY = (height / 2 - focusY) * (1 - context)
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: '#edf2fa',
        borderRadius: width * 0.018,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
          transformOrigin: `${focusX}px ${focusY}px`,
        }}
      >
        <Img src={url} style={{ position: 'absolute', ...image, maxWidth: 'none' }} />
        <div
          style={{
            position: 'absolute',
            left: image.left + image.width * focus.x,
            top: image.top + image.height * focus.y,
            width: image.width * focus.width,
            height: image.height * focus.height,
            boxSizing: 'border-box',
            border: `${Math.max(2, width * 0.005) / zoom}px solid ${accent}`,
            borderRadius: width * 0.008,
            opacity: active ? 1 : 0.25,
          }}
        />
      </div>
    </div>
  )
}

/** Trusted, maintained composition shared by Player and renderer. Source pixels remain unchanged. */
export function DemonstrationScene({
  scene,
  durationInFrames,
  assets,
  accent,
}: {
  scene: Demonstration
  durationInFrames: number
  assets: Record<string, string>
  accent: string
}) {
  const frame = useCurrentFrame(),
    { width, height } = useVideoConfig()
  const state = demonstrationFrame(scene.recipeId, frame, durationInFrames)
  const panelWidth = width * 0.84
  const labelHeight = width * 0.075
  const gap = height * 0.035
  const sectionHeight = height * 0.48
  const panelHeight =
    (sectionHeight - gap * (scene.sources.length - 1)) / scene.sources.length - labelHeight
  return (
    <AbsoluteFill style={{ background: '#fffcf4', color: '#172a46' }}>
      <div
        data-video-text-boundary
        style={{
          position: 'absolute',
          left: width * 0.08,
          top: height * 0.14,
          width: panelWidth,
          height: height * 0.145,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          data-video-text
          style={{
            fontSize: width * 0.054,
            fontWeight: 800,
            lineHeight: 1.15,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
          }}
        >
          {scene.headline}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: width * 0.08,
          top: height * 0.31,
          width: panelWidth,
          display: 'grid',
          gap,
        }}
      >
        {scene.sources.map((source, index) => {
          const url = assets[source.assetId]
          if (!url) throw new Error(`A imagem de “${source.label}” ainda não foi carregada`)
          return (
            <div key={source.id}>
              <div
                data-video-text-boundary
                style={{
                  height: labelHeight,
                  display: 'flex',
                  alignItems: 'center',
                  gap: width * 0.018,
                }}
              >
                <div
                  style={{
                    width: width * 0.013,
                    height: width * 0.013,
                    borderRadius: '50%',
                    background:
                      state.activeSource === index || scene.sources.length === 1
                        ? '#1466c3'
                        : '#c5cddb',
                    flexShrink: 0,
                  }}
                />
                <div
                  data-video-text
                  style={{
                    fontSize: width * 0.029,
                    lineHeight: 1.15,
                    fontWeight: 800,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}
                >
                  {source.label}
                </div>
              </div>
              <SourcePanel
                source={source}
                url={url}
                width={panelWidth}
                height={panelHeight}
                context={state.context}
                active={state.activeSource === index || scene.sources.length === 1}
                accent={accent}
              />
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          height: height * 0.006,
          width: '100%',
          background: accent,
        }}
      />
    </AbsoluteFill>
  )
}
