import { DOMParser } from '@xmldom/xmldom'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

// Um SVG público precisa continuar animado, mas não pode executar scripts nem
// carregar recursos de terceiros. A lista cobre formas, gradientes, filtros e
// animações CSS/SMIL usadas em ilustrações de módulos.
const ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'style',
  'title',
  'desc',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'filter',
  'feGaussianBlur',
  'feOffset',
  'feMerge',
  'feMergeNode',
  'feColorMatrix',
  'feComposite',
  'feFlood',
  'feBlend',
  'animate',
  'animateTransform',
])

const ATTRIBUTES = new Set([
  'id',
  'class',
  'role',
  'aria-label',
  'viewBox',
  'preserveAspectRatio',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'transform',
  'transform-origin',
  'opacity',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'vector-effect',
  'display',
  'visibility',
  'overflow',
  'paint-order',
  'color',
  'style',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'letter-spacing',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'filter',
  'filterUnits',
  'primitiveUnits',
  'in',
  'in2',
  'result',
  'stdDeviation',
  'dx',
  'dy',
  'values',
  'type',
  'operator',
  'mode',
  'flood-color',
  'flood-opacity',
  'color-interpolation-filters',
  'attributeName',
  'attributeType',
  'from',
  'to',
  'by',
  'dur',
  'begin',
  'end',
  'repeatCount',
  'repeatDur',
  'keyTimes',
  'keySplines',
  'calcMode',
  'additive',
  'accumulate',
  'min',
  'max',
  'restart',
])

const ANIMATED_ATTRIBUTES = new Set([
  'opacity',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'transform',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'd',
  'offset',
  'stop-color',
  'stop-opacity',
])

export class InvalidModuleIllustrationSvgError extends Error {}

function reject(): never {
  throw new InvalidModuleIllustrationSvgError(
    'SVG inválido ou inseguro. Use formas, estilos e animações sem scripts nem recursos externos.',
  )
}

function safeValue(value: string): boolean {
  // Referências a gradientes/filtros internos são úteis. Qualquer outro url()
  // ou URL explícita é barrado, inclusive em CSS e valores de animação.
  const withoutLocalRefs = value.replace(/url\(\s*(['"]?)#[A-Za-z_][\w:.-]*\1\s*\)/gi, '')
  return !/url\s*\(|@import\b|@font-face\b|image-set\s*\(|(?:https?:|data:|javascript:)|\\/i.test(
    withoutLocalRefs,
  )
}

/** Valida o XML e mantém os bytes textuais de CSS/SMIL, preservando a animação. */
export function validateModuleIllustrationSvg(source: string): string {
  // Exportadores de SVG costumam incluir a declaração XML. Ela é inerte, mas
  // outras instruções de processamento e DTDs ficam proibidos.
  const withoutDeclaration = source.replace(
    /^\uFEFF?\s*<\?xml\s+version=(['"])1\.0\1(?:\s+encoding=(['"])UTF-8\2)?\s*\?>/i,
    '',
  )
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(withoutDeclaration)) reject()

  let parseFailed = false
  const document = new DOMParser({
    errorHandler: {
      warning: () => {
        parseFailed = true
      },
      error: () => {
        parseFailed = true
      },
      fatalError: () => {
        parseFailed = true
      },
    },
  }).parseFromString(source, 'image/svg+xml')

  const root = document.documentElement
  if (parseFailed || !root || root.tagName !== 'svg' || root.namespaceURI !== SVG_NAMESPACE) {
    reject()
  }

  function inspect(element: Element): void {
    if (element.namespaceURI !== SVG_NAMESPACE || !ELEMENTS.has(element.tagName)) reject()

    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)
      if (!attribute) continue
      if (attribute.name === 'xmlns' && element === root && attribute.value === SVG_NAMESPACE) {
        continue
      }
      if (
        attribute.name === 'xmlns:xlink' &&
        element === root &&
        attribute.value === 'http://www.w3.org/1999/xlink'
      ) {
        continue
      }
      if (attribute.name.includes(':') || !ATTRIBUTES.has(attribute.name)) reject()
      if (!safeValue(attribute.value)) reject()
      if (attribute.name === 'attributeName' && !ANIMATED_ATTRIBUTES.has(attribute.value)) reject()
      if (
        attribute.name === 'begin' &&
        !/^(?:\d+(?:\.\d+)?(?:ms|s)|indefinite)(?:;\s*\d+(?:\.\d+)?(?:ms|s))*$/.test(
          attribute.value,
        )
      )
        reject()
    }

    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) inspect(child as Element)
      else if (child.nodeType === 3 || child.nodeType === 4) {
        if (element.tagName === 'style' && !safeValue(child.nodeValue ?? '')) reject()
      } else if (child.nodeType !== 8) reject()
    }
  }

  inspect(root)
  return source
}
