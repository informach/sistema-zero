/**
 * Miniaturas por tipo. Só o MODELO precisa de WebGL, então ele guarda a foto
 * pronta no asset (`thumb`) e aqui só se mostra; sem a foto (modelo que desceu
 * da nuvem e nunca abriu aqui, modelo pronto do catálogo) entra a projeção
 * isométrica PURA (`model/isoThumb.ts`), e só um modelo pesado demais cai no
 * emoji. A textura desenha os pixels num canvas 2D (sem canvas, emoji); o céu
 * é um gradiente CSS puro derivado dos parâmetros (sol posicionado pela altura
 * e pela direção).
 */
import { clsx } from 'clsx'
import type { CSSProperties, JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { hexToRgb } from '../../core/color'
import { COPY } from '../../core/copy'
import type { MoldaModelAsset, MoldaTextureAsset } from '../../core/model'
import { resolvePaletteColors } from '../../core/sanitize'
import { projectModelThumb, type ThumbModel } from '../../model/isoThumb'
import type { SkyParams } from '../../sky/params'

/** A projeção isométrica de um modelo, num `<svg>`; `null` = sem o que desenhar. */
export function IsoModelThumb({
  model,
  className,
  label,
}: {
  model: ThumbModel
  className?: string
  label?: string
}): JSX.Element | null {
  const projection = useMemo(() => projectModelThumb(model), [model])
  if (!projection) return null
  return (
    <svg
      viewBox={projection.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label ?? COPY.a11y.modelThumb}
      className={clsx('size-full', className)}
    >
      {projection.polygons.map((polygon, index) => (
        <polygon
          // biome-ignore lint/suspicious/noArrayIndexKey: os polígonos não têm id; a ordem É a profundidade
          key={index}
          points={polygon.points}
          fill={polygon.fill}
        />
      ))}
    </svg>
  )
}

export function ModelThumb({
  asset,
  className,
}: {
  asset: MoldaModelAsset
  className?: string
}): JSX.Element {
  const projection = useMemo(() => (asset.thumb ? null : projectModelThumb(asset)), [asset])
  if (asset.thumb) {
    return (
      <img
        src={asset.thumb}
        alt={COPY.a11y.modelThumb}
        className={clsx('size-full object-cover', className)}
        draggable={false}
      />
    )
  }
  if (projection) {
    return (
      <div className={clsx('flex size-full items-center justify-center bg-mld-bg p-2', className)}>
        <svg
          viewBox={projection.viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={COPY.a11y.modelThumb}
          className="size-full"
        >
          {projection.polygons.map((polygon, index) => (
            <polygon
              // biome-ignore lint/suspicious/noArrayIndexKey: os polígonos não têm id; a ordem É a profundidade
              key={index}
              points={polygon.points}
              fill={polygon.fill}
            />
          ))}
        </svg>
      </div>
    )
  }
  return (
    <div
      role="img"
      aria-label={COPY.a11y.modelThumb}
      className={clsx(
        'flex size-full flex-col items-center justify-center gap-1 bg-mld-kind-model/10 text-mld-kind-model',
        className,
      )}
    >
      <span aria-hidden="true" className="text-4xl">
        {COPY.kinds.model.emoji}
      </span>
      <span className="text-xs font-bold">{COPY.editor.modelSummary(asset.parts.length)}</span>
    </div>
  )
}

export function TextureThumb({
  asset,
  className,
}: {
  asset: MoldaTextureAsset
  className?: string
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let context: CanvasRenderingContext2D | null = null
    try {
      context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null
    } catch {
      context = null
    }
    if (!context || typeof context.createImageData !== 'function') {
      setFallback(true)
      return
    }
    const { width, height, data } = asset.bitmap
    canvas.width = width
    canvas.height = height
    const colors = resolvePaletteColors(asset)
    const image = context.createImageData(width, height)
    for (let i = 0; i < data.length; i += 1) {
      const index = data[i] ?? 0
      const offset = i * 4
      if (index === 0) continue
      const [r, g, b] = hexToRgb(colors[index] ?? '#000000')
      image.data[offset] = r
      image.data[offset + 1] = g
      image.data[offset + 2] = b
      image.data[offset + 3] = 255
    }
    context.putImageData(image, 0, 0)
  }, [asset])

  if (fallback) {
    return (
      <div
        role="img"
        aria-label={COPY.a11y.textureThumb}
        className={clsx(
          'flex size-full items-center justify-center bg-mld-kind-texture/10 text-4xl',
          className,
        )}
      >
        <span aria-hidden="true">{COPY.kinds.texture.emoji}</span>
      </div>
    )
  }
  return (
    <div className={clsx('mld-checkerboard flex size-full items-center justify-center', className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={COPY.a11y.textureThumb}
        className="mld-pixelated size-full object-contain"
      />
    </div>
  )
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function skyThumbStyle(params: SkyParams): CSSProperties {
  const horizon = 62
  return {
    backgroundImage: `linear-gradient(to bottom, ${params.topColor} 0%, ${params.horizonColor} ${horizon - 4}%, ${params.horizonColor} ${horizon}%, ${params.groundColor} ${horizon + 1}%, ${params.groundColor} 100%)`,
  }
}

export function SkyThumb({
  params,
  className,
}: {
  params: SkyParams
  className?: string
}): JSX.Element {
  const label = COPY.skyPresets[params.preset]
  const elevation = clamp01((params.sunElevation + 10) / 100)
  const sunTop = `${Math.round((1 - elevation) * 58)}%`
  const sunLeft = `${Math.round(((params.sunAzimuth % 360) / 360) * 80 + 10)}%`
  const sunSize = `${Math.round(8 + params.sunSize * 1.5)}%`
  const showSun = params.sunElevation > -8 && params.sunIntensity > 0
  const showStars = params.stars > 0.3
  return (
    <div
      role="img"
      aria-label={COPY.a11y.skyThumb(label)}
      className={clsx('relative size-full overflow-hidden', className)}
      style={skyThumbStyle(params)}
    >
      {showStars ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.9) 0.6px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.7) 0.5px, transparent 1px)',
            backgroundSize: '19px 17px, 29px 23px',
            backgroundPosition: '3px 5px, 11px 2px',
            opacity: clamp01(params.stars),
            height: '62%',
          }}
        />
      ) : null}
      {showSun ? (
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            top: sunTop,
            left: sunLeft,
            width: sunSize,
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, #fff8d6 0%, #ffe38a 55%, rgba(255,227,138,0) 100%)',
            boxShadow: '0 0 12px 4px rgba(255,230,150,0.55)',
          }}
        />
      ) : null}
      {params.clouds.amount > 0.2 ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[18%] h-[30%]"
          style={{
            opacity: clamp01(params.clouds.amount) * 0.85,
            backgroundImage:
              'radial-gradient(ellipse 30% 55% at 25% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%), radial-gradient(ellipse 34% 60% at 70% 40%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
            filter: `blur(${Math.round(params.clouds.softness * 3)}px)`,
          }}
        />
      ) : null}
    </div>
  )
}
