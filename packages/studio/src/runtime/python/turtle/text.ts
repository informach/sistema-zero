import type { TurtleFont } from './graphicsProtocol'

export function canvasTurtleFont(value: TurtleFont) {
  const size = value[1] > 0 ? (value[1] * 4) / 3 : -value[1]
  const styles = value[2].split(/\s+/)
  const family = value[0].replace(/["\\\r\n]/g, '')
  return `${styles.includes('italic') ? 'italic' : 'normal'} ${styles.includes('bold') ? 'bold' : 'normal'} ${size}px "${family}"`
}

/** Tk anchors the entire left-justified block; newline is not a Canvas glyph.
 * Font rasterization/metrics vary by platform, as they do between native Tk hosts.
 */
export function layoutTurtleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  value: TurtleFont,
  align: 'left' | 'center' | 'right',
  x: number,
  y: number,
) {
  ctx.font = canvasTurtleFont(value)
  const metrics = ctx.measureText('0')
  const size = value[1] > 0 ? (value[1] * 4) / 3 : -value[1]
  const ascent = metrics.fontBoundingBoxAscent || size
  const descent = metrics.fontBoundingBoxDescent || size / 4
  const lineHeight = ascent + descent
  const tabWidth = Math.max(1, metrics.width * 8)
  let width = 0
  const lines = text.split('\n').map((line) => {
    let advance = 0
    const chunks = line.split('\t').map((chunk, index) => {
      if (index) advance = (Math.floor(advance / tabWidth) + 1) * tabWidth
      const left = advance
      advance += ctx.measureText(chunk).width
      return { text: chunk, left }
    })
    width = Math.max(width, advance)
    return { chunks, width: advance }
  })
  const left = x - (align === 'right' ? width : align === 'center' ? width / 2 : 0)
  const top = y - lineHeight * lines.length
  return {
    lines,
    left,
    top,
    ascent,
    descent,
    lineHeight,
    size,
    // Tk canvas text bbox includes one pixel on either side. Turtle subtracts
    // the right margin again when implementing write(move=True).
    bounds: { left: left - 1, right: left + width + 1, top, bottom: y },
  }
}
