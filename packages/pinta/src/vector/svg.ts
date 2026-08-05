/**
 * Serialização do desenho vetorial → SVG (string). É o MESMO markup que o
 * editor renderiza (atributos idênticos) — o export é o editor serializado,
 * snapshot-testável e abre em qualquer navegador/editor de SVG.
 */
import { boundsCenter, shapeBounds } from './geometry'
import { gradientId, isVectorGradient, type VectorGradient, type VectorShape } from './model'

/**
 * Um "documento" vetorial ESTRUTURAL: qualquer coisa com dimensões + shapes
 * (o `VectorBackgroundAsset` inteiro, um quadro de `vector-sprite`, um tile).
 */
export interface VectorDoc {
  width: number
  height: number
  shapes: VectorShape[]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Vetor do degradê LINEAR em coords de objectBoundingBox (0–1): o ângulo (0 = →,
 * 90 = ↓) vira uma reta que atravessa o centro. Usado no export string e no
 * render React (mesmos números).
 */
export function linearGradientVector(angle: number): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad) / 2
  const dy = Math.sin(rad) / 2
  return {
    x1: round2(0.5 - dx),
    y1: round2(0.5 - dy),
    x2: round2(0.5 + dx),
    y2: round2(0.5 + dy),
  }
}

/** `<defs>` com um gradiente por shape de preenchimento degradê (`''` se nenhum). */
export function gradientDefsMarkup(shapes: VectorShape[], idPrefix = ''): string {
  const defs = shapes
    .filter((s) => isVectorGradient(s.fill))
    .map((s) => {
      const g = s.fill as VectorGradient
      const id = escapeXml(gradientId(s.id, idPrefix))
      const stops = `<stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/>`
      if (g.type === 'radial') return `  <radialGradient id="${id}">${stops}</radialGradient>`
      const v = linearGradientVector(g.angle)
      return `  <linearGradient id="${id}" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}">${stops}</linearGradient>`
    })
  return defs.length > 0 ? `<defs>\n${defs.join('\n')}\n</defs>` : ''
}

/** Atributos comuns (fill/stroke/opacity/transform de rotação). */
export function shapeCommonAttrs(shape: VectorShape, idPrefix = ''): Record<string, string> {
  const fill = isVectorGradient(shape.fill) ? `url(#${gradientId(shape.id, idPrefix)})` : shape.fill
  const attrs: Record<string, string> = { fill }
  if (shape.stroke) {
    attrs.stroke = shape.stroke.color
    attrs['stroke-width'] = String(shape.stroke.width)
    attrs['stroke-linecap'] = 'round'
    attrs['stroke-linejoin'] = 'round'
  }
  if (shape.opacity < 1) attrs.opacity = String(shape.opacity)
  if (shape.rotation !== 0) {
    const center = boundsCenter(shapeBounds(shape))
    attrs.transform = `rotate(${round2(shape.rotation)} ${round2(center.x)} ${round2(center.y)})`
  }
  return attrs
}

/** Tag + atributos GEOMÉTRICOS do shape (sem os comuns). */
export function shapeGeometryAttrs(shape: VectorShape): {
  tag: string
  attrs: Record<string, string>
  content?: string
} {
  switch (shape.type) {
    case 'rect':
      return {
        tag: 'rect',
        attrs: {
          x: String(round2(shape.x)),
          y: String(round2(shape.y)),
          width: String(round2(shape.w)),
          height: String(round2(shape.h)),
          ...(shape.rx > 0 ? { rx: String(round2(shape.rx)) } : {}),
        },
      }
    case 'ellipse':
      return {
        tag: 'ellipse',
        attrs: {
          cx: String(round2(shape.cx)),
          cy: String(round2(shape.cy)),
          rx: String(round2(shape.rx)),
          ry: String(round2(shape.ry)),
        },
      }
    case 'line':
      return {
        tag: 'line',
        attrs: {
          x1: String(round2(shape.x1)),
          y1: String(round2(shape.y1)),
          x2: String(round2(shape.x2)),
          y2: String(round2(shape.y2)),
        },
      }
    case 'polygon':
      return {
        tag: 'polygon',
        attrs: {
          points: shape.points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(' '),
        },
      }
    case 'path':
      return { tag: 'path', attrs: { d: shape.d } }
    case 'text':
      return {
        tag: 'text',
        attrs: {
          x: String(round2(shape.x)),
          y: String(round2(shape.y)),
          'font-size': String(round2(shape.fontSize)),
          'font-family': 'sans-serif',
        },
        content: shape.text,
      }
  }
}

export function shapeToMarkup(shape: VectorShape, idPrefix = ''): string {
  const { tag, attrs, content } = shapeGeometryAttrs(shape)
  const all = { ...attrs, ...shapeCommonAttrs(shape, idPrefix) }
  const attrText = Object.entries(all)
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(' ')
  if (content !== undefined) return `<${tag} ${attrText}>${escapeXml(content)}</${tag}>`
  return `<${tag} ${attrText}/>`
}

/** Markup dos shapes (sem o elemento `<svg>` em volta), na ordem do z-order. */
export function shapesToMarkup(shapes: VectorShape[], indent = '  ', idPrefix = ''): string {
  return shapes.map((shape) => `${indent}${shapeToMarkup(shape, idPrefix)}`).join('\n')
}

/** O documento SVG inteiro (ordem do array = z-order, fundo primeiro). */
export function vectorToSvg(doc: VectorDoc): string {
  const defs = gradientDefsMarkup(doc.shapes)
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">`,
  ]
  if (defs) lines.push(defs)
  lines.push(shapesToMarkup(doc.shapes), '</svg>')
  return lines.join('\n')
}
