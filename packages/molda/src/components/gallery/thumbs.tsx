/**
 * Prévia isométrica de templates e céu em CSS. Cards da galeria usam ProgressiveThumb
 * para buscar e descartar documentos individualmente, sem reter pixels/geometria na lista.
 */
import { clsx } from 'clsx'
import type { CSSProperties, JSX } from 'react'
import { useMemo } from 'react'
import { COPY } from '../../core/copy'
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
