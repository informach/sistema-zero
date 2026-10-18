import type { TextureFrame } from '../../../scene/textureViewport'

export function SceneTextureGrid({ image, scale }: { image: TextureFrame; scale: number }) {
  if (scale < 4) return null
  const lines: string[] = []
  for (let x = 1; x < image.width; x++) lines.push(`M${x} 0V${image.height}`)
  for (let y = 1; y < image.height; y++) lines.push(`M0 ${y}H${image.width}`)
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${image.width} ${image.height}`}
      className="mld-uv-sheet-outlines"
    >
      <path
        d={lines.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={0.5 / scale}
      />
    </svg>
  )
}
