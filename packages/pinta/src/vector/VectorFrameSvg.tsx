/**
 * Render React de shapes vetoriais — o MESMO markup do export (`svg.ts`), com
 * os atributos kebab convertidos para camelCase. Compartilhado entre o palco
 * do editor, thumbnails (cards/strips) e o preview de animação: SVG inline é
 * síncrono, sem canvas e sem CSP — renderiza igual em qualquer lugar.
 */
import type { JSX, PointerEvent } from 'react'
import { memo } from 'react'
import type { VectorShape } from './model'
import { shapeCommonAttrs, shapeGeometryAttrs } from './svg'

/** Um shape do modelo → elemento SVG de React (mesmos atributos do export). */
export function ShapeElement({
  shape,
  onPointerDown,
}: {
  shape: VectorShape
  onPointerDown?: (event: PointerEvent<SVGElement>) => void
}): JSX.Element {
  const { tag, attrs, content } = shapeGeometryAttrs(shape)
  const common = shapeCommonAttrs(shape)
  const props: Record<string, unknown> = { ...attrs, ...common, onPointerDown }
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
  const Tag = tag as 'rect'
  return <Tag {...(props as JSX.IntrinsicElements['rect'])}>{content}</Tag>
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
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {shapes.map((shape) => (
        <ShapeElement key={shape.id} shape={shape} />
      ))}
    </svg>
  )
})
