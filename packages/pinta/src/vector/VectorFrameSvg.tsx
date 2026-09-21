/**
 * Render React de shapes vetoriais — o MESMO markup do export (`svg.ts`), com
 * os atributos kebab convertidos para camelCase. Compartilhado entre o palco
 * do editor, thumbnails (cards/strips) e o preview de animação: SVG inline é
 * síncrono, sem canvas e sem CSP — renderiza igual em qualquer lugar.
 */
import type { JSX, MouseEvent, PointerEvent } from 'react'
import { memo, useEffect } from 'react'
import { ensureVectorFontsForShapes } from './fonts'
import { gradientGeometry } from './gradient'
import { clipPathId, resolveMaskScene } from './mask'
import {
  gradientId,
  isVectorGradient,
  type VectorGradient,
  type VectorShape,
  visibleShapes,
} from './model'
import { shapeCommonAttrs, shapeGeometryAttrs } from './svg'

function reactSvgProps(attrs: Record<string, unknown>): Record<string, unknown> {
  const props = { ...attrs }
  const camelCase = {
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'font-size': 'fontSize',
    'font-family': 'fontFamily',
    'text-anchor': 'textAnchor',
    'image-rendering': 'imageRendering',
    'clip-path': 'clipPath',
  } as const
  for (const [from, to] of Object.entries(camelCase)) {
    if (!(from in props)) continue
    props[to] = props[from]
    delete props[from]
  }
  return props
}

function GradientElements({
  shapes,
  idPrefix = '',
}: {
  shapes: readonly VectorShape[]
  idPrefix?: string
}): JSX.Element {
  const grads = shapes.filter((s) => isVectorGradient(s.fill))
  return (
    <>
      {grads.map((s) => {
        const g = s.fill as VectorGradient
        const id = gradientId(s.id, idPrefix)
        const stops = (
          <>
            <stop offset="0" stopColor={g.from} />
            <stop offset="1" stopColor={g.to} />
          </>
        )
        const geometry = gradientGeometry(g)
        if (geometry.type === 'radial') {
          return (
            <radialGradient
              key={id}
              id={id}
              cx={g.center || g.radius !== undefined ? geometry.center.x : undefined}
              cy={g.center || g.radius !== undefined ? geometry.center.y : undefined}
              r={g.center || g.radius !== undefined ? geometry.radius : undefined}
            >
              {stops}
            </radialGradient>
          )
        }
        return (
          <linearGradient
            key={id}
            id={id}
            x1={geometry.start.x}
            y1={geometry.start.y}
            x2={geometry.end.x}
            y2={geometry.end.y}
          >
            {stops}
          </linearGradient>
        )
      })}
    </>
  )
}

/**
 * `<defs>` React com um gradiente por shape de preenchimento degradê — os
 * MESMOS números do export string (`gradientDefsMarkup`). Renderizar dentro do
 * `<svg>` que usa os shapes (o `url(#id)` resolve no mesmo documento).
 */
export function GradientDefs({ shapes }: { shapes: VectorShape[] }): JSX.Element | null {
  const grads = shapes.filter((s) => isVectorGradient(s.fill))
  if (grads.length === 0) return null
  return (
    <defs>
      <GradientElements shapes={grads} />
    </defs>
  )
}

function ClipSourceElement({ source }: { source: VectorShape }): JSX.Element {
  const geometry = shapeGeometryAttrs(source)
  const transform = shapeCommonAttrs(source).transform
  const props = reactSvgProps({
    ...geometry.attrs,
    fill: '#000000',
    ...(transform ? { transform } : {}),
  })
  const Tag = geometry.tag as 'rect'
  return <Tag {...(props as JSX.IntrinsicElements['rect'])} />
}

/** `<defs>` React da cena composta, em paridade com `sceneDefsMarkup`. */
export function SceneDefs({
  shapes,
  idPrefix = '',
}: {
  shapes: VectorShape[]
  idPrefix?: string
}): JSX.Element | null {
  const scene = resolveMaskScene(shapes)
  const hasGradients = scene.painted.some((shape) => isVectorGradient(shape.fill))
  if (!hasGradients && scene.sources.size === 0) return null
  return (
    <defs>
      <GradientElements shapes={scene.painted} idPrefix={idPrefix} />
      {[...scene.sources.values()].map((source) => (
        <clipPath key={source.id} id={clipPathId(source.id, idPrefix)}>
          <ClipSourceElement source={source} />
        </clipPath>
      ))}
    </defs>
  )
}

/** Um shape do modelo → elemento SVG de React (mesmos atributos do export). */
export function ShapeElement({
  shape,
  idPrefix = '',
  clipPath,
  onPointerDown,
  onDoubleClick,
}: {
  shape: VectorShape
  idPrefix?: string
  clipPath?: string
  onPointerDown?: (event: PointerEvent<SVGElement>) => void
  /** Duplo clique (ex.: reeditar um texto no palco). Só render — o export string não muda. */
  onDoubleClick?: (event: MouseEvent<SVGElement>) => void
}): JSX.Element {
  const { tag, attrs, content, lines } = shapeGeometryAttrs(shape)
  const common = shapeCommonAttrs(shape, idPrefix)
  const props = reactSvgProps({ ...attrs, ...common, clipPath, onPointerDown, onDoubleClick })
  const Tag = tag as 'rect'
  return (
    <Tag {...(props as JSX.IntrinsicElements['rect'])}>
      {lines
        ? lines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a ordem É a identidade da linha
            <tspan key={`linha-${index}`} x={line.x} dy={line.dy}>
              {line.text}
            </tspan>
          ))
        : content}
    </Tag>
  )
}

/**
 * Um quadro/tile vetorial inteiro como `<svg>` (thumbnails e preview).
 * Decorativo por padrão (`aria-hidden`) — quem precisa de acessibilidade
 * rotula o contêiner. Memoizado: os quadros NÃO editados mantêm a mesma
 * referência de `shapes` (structural sharing), então strips/preview não
 * re-renderizam a cada pointermove do editor.
 */
export const VectorFrameSvg = memo(function VectorFrameSvg({
  width,
  height,
  shapes,
  className,
}: {
  width: number
  height: number
  shapes: VectorShape[]
  className?: string
}): JSX.Element {
  useEffect(() => {
    void ensureVectorFontsForShapes(shapes)
  }, [shapes])
  // O olhinho do painel Camadas vale em TODA prévia/miniatura (WYSIWYG).
  const scene = resolveMaskScene(shapes)
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <SceneDefs shapes={shapes} />
      {scene.painted.map((shape) => (
        <ShapeElement
          key={shape.id}
          shape={shape}
          clipPath={shape.maskId ? `url(#${clipPathId(shape.maskId)})` : undefined}
        />
      ))}
    </svg>
  )
})
