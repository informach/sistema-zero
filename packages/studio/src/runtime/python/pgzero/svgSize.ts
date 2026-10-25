/**
 * Size of an SVG image as Pygame Zero sees it, the same rule as the module's `_svg_size`
 * (py/pgzero/_sz.py) and pygame-ce's SVG loader (nanosvg): root `width`/`height` in CSS
 * pixels (96 per inch), a missing side taking the viewBox side, rounded up.
 */
const UNITS: Readonly<Record<string, number>> = {
  '': 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
}

function attribute(tag: string, name: string) {
  const match = new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`).exec(tag)
  return match ? match[2]!.trim() : null
}

function length(value: string | null) {
  const match = /^([0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*([a-z]*)$/.exec(value ?? '')
  if (!match || !(match[2]! in UNITS)) return null
  return Number(match[1]) * UNITS[match[2]!]!
}

/** Null when the text has no root element with a usable size. */
export function pgzeroSvgSize(text: string): { width: number; height: number } | null {
  const tag = /<svg\b[^>]*>/i.exec(text.slice(0, 65536))?.[0]
  if (!tag) return null
  let width = length(attribute(tag, 'width'))
  let height = length(attribute(tag, 'height'))
  const box = attribute(tag, 'viewBox')
  if (box && (width === null || height === null)) {
    const parts = box
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    if (parts.length === 4 && parts[2]! > 0 && parts[3]! > 0) {
      width ??= parts[2]!
      height ??= parts[3]!
    }
  }
  if (!width || !height) return null
  return { width: Math.ceil(width), height: Math.ceil(height) }
}
