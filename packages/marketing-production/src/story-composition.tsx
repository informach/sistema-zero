import { Video } from '@remotion/media'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import type { StoryProps } from './story'

export function StoryComposition({ title, subtitle, accent, clip }: StoryProps) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const scale = width / 720
  const progress = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill
      data-marketing-story
      data-frame={frame}
      data-width={width}
      style={{ backgroundColor: '#17233B', color: '#FFFFFF', fontFamily: 'Arial, sans-serif' }}
    >
      {clip ? (
        <Video
          src={clip.src}
          trimBefore={clip.trimBefore}
          durationInFrames={durationInFrames}
          muted={clip.muted}
          objectFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
      <AbsoluteFill
        style={{ background: 'linear-gradient(180deg, transparent 15%, rgba(14,24,43,.92) 95%)' }}
      />
      <AbsoluteFill
        style={{
          padding: `${height * 0.13}px ${width * 0.09}px ${height * 0.2}px`,
          justifyContent: 'flex-end',
          gap: 26 * scale,
          opacity: progress,
          transform: `translateY(${(1 - progress) * 32 * scale}px)`,
        }}
      >
        <div
          style={{
            width: 80 * scale,
            height: 8 * scale,
            backgroundColor: accent,
            borderRadius: 4 * scale,
          }}
        />
        <div
          style={{
            fontSize: 62 * scale,
            lineHeight: 1.06,
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 30 * scale, lineHeight: 1.35, color: '#E4EAF2' }}>{subtitle}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
