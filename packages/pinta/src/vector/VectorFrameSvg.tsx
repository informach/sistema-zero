/**
 * Render React de shapes vetoriais — o MESMO markup do export (`svg.ts`), com
 * os atributos kebab convertidos para camelCase. Compartilhado entre o palco
 * do editor, thumbnails (cards/strips) e o preview de animação: SVG inline é
 * síncrono, sem canvas e sem CSP — renderiza igual em qualquer lugar.
 */
import type { JSX, MouseEvent, PointerEvent } from 'react'
import { memo, useEffect } from 'react'
import { ensureVectorFontsForShapes } from './fonts'
import {
  gradientId,
  isVectorGradient,
  type VectorGradient,
  type VectorShape,
  visibleShapes,
} from './model'
import { linearGradientVector, shapeCommonAttrs, shapeGeometryAttrs } from './svg'

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
      {grads.map((s) => {
        const g = s.fill as VectorGradient
        const id = gradientId(s.id)
        const stops = (
          <>
            <stop offset="0" stopColor={g.from} />
            <stop offset="1" stopColor={g.to} />
          </>
        )
        if (g.type === 'radial') {
          return (
            <radialGradient key={id} id={id}>
              {stops}
            </radialGradient>
          )
        }
        const v = linearGradientVector(g.angle)
        return (
          <linearGradient key={id} id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
            {stops}
          </linearGradient>
        )
      })}
    </defs>
  )
}

/** Um shape do modelo → elemento SVG de React (mesmos atributos do export). */
export function ShapeElement({
  shape,
  onPointerDown,
  onDoubleClick,
}: {
  shape: VectorShape
  onPointerDown?: (event: PointerEvent<SVGElement>) => void
  /** Duplo clique (ex.: reeditar um texto no palco). Só render — o export string não muda. */
  onDoubleClick?: (event: MouseEvent<SVGElement>) => void
}): JSX.Element {
  const { tag, attrs, content, lines } = shapeGeometryAttrs(shape)
  const common = shapeCommonAttrs(shape)
  const props: Record<string, unknown> = { ...attrs, ...common, onPointerDown, onDoubleClick }
  // React usa camelCase p/ estes atributos.
  if ('stroke-width' in props) {
    props.strokeWidth = props['stroke-width']
    delete props['stroke-width']
  }
  if ('stroke-linecap' in props) {
    props.strokeLinecap = props['stroke-linecap']
    delete props['stroke-linecap']
  }
  if ('stroke-linejoin' in props) {
    props.strokeLinejoin = props['stroke-linejoin']
    delete props['stroke-linejoin']
  }
  if ('font-size' in props) {
    props.fontSize = props['font-size']
    delete props['font-size']
  }
  if ('font-family' in props) {
    props.fontFamily = props['font-family']
    delete props['font-family']
  }
  if ('text-anchor' in props) {
    props.textAnchor = props['text-anchor']
    delete props['text-anchor']
  }
  if ('image-rendering' in props) {
    props.imageRendering = props['image-rendering']
    delete props['image-rendering']
  }
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
  const visible = visibleShapes(shapes)
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <GradientDefs shapes={visible} />
      {visible.map((shape) => (
        <ShapeElement key={shape.id} shape={shape} />
      ))}
    </svg>
  )
})
