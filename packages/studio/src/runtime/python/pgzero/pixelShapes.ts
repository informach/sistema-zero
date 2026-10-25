/*
 * pygame.draw, pixel by pixel: a port of pygame-ce 2.5.8 src_c/draw.c (Copyright (C) 2000-2001
 * Pete Shinners and the pygame-ce contributors; GNU LGPL 2.1 or later, see LICENSE-pgzero.txt
 * and PROVENANCE.md). The browser smooths the edges of what it draws, so the colour read with
 * screen.surface.get_at on an edge would differ from the computer's; these shapes have pygame's
 * pixels exactly, and __tests__/drawReference.json (measured on pygame-ce) proves it.
 *
 * Each shape fills whole pixels of the target: no smoothing and nothing outside the screen.
 * Coordinates arrive as Python sent them and are truncated like pygame's int conversion.
 */

export interface PixelTarget {
  readonly width: number
  readonly height: number
  /** Fills whole pixels: x, y, w and h are integers inside the screen. */
  fill(x: number, y: number, w: number, h: number): void
}

const trunc = Math.trunc
/** C integer division, which truncates towards zero. */
const div = (a: number, b: number) => trunc(a / b)
/** C single precision. */
const f32 = Math.fround

function setAt(t: PixelTarget, x: number, y: number) {
  if (x < 0 || x >= t.width || y < 0 || y >= t.height) return
  t.fill(x, y, 1, 1)
}
/** drawhorzline: already inside the screen; nothing when x2 is before x1. */
function horz(t: PixelTarget, x1: number, y: number, x2: number) {
  if (x2 >= x1) t.fill(x1, y, x2 - x1 + 1, 1)
}
function vert(t: PixelTarget, y1: number, x: number, y2: number) {
  if (y2 >= y1) t.fill(x, y1, 1, y2 - y1 + 1)
}
/** drawhorzlineclip and drawhorzlineclipbounding (the same pixels). */
function horzClip(t: PixelTarget, x1: number, y: number, x2: number) {
  if (y < 0 || y >= t.height) return
  if (x2 < x1) [x1, x2] = [x2, x1]
  x1 = Math.max(x1, 0)
  x2 = Math.min(x2, t.width - 1)
  if (x2 < 0 || x1 >= t.width) return
  if (x1 === x2) setAt(t, x1, y)
  else horz(t, x1, y, x2)
}
function lineThin(t: PixelTarget, x1: number, y1: number, x2: number, y2: number) {
  if (x1 === x2 && y1 === y2) {
    setAt(t, x1, y1)
    return
  }
  if (y1 === y2) {
    const dx = x1 < x2 ? 1 : -1
    for (let sx = 0; sx <= Math.abs(x1 - x2); sx++) setAt(t, x1 + dx * sx, y1)
    return
  }
  if (x1 === x2) {
    const dy = y1 < y2 ? 1 : -1
    for (let sy = 0; sy <= Math.abs(y1 - y2); sy++) setAt(t, x1, y1 + dy * sy)
    return
  }
  const dx = Math.abs(x2 - x1)
  const sx = x1 < x2 ? 1 : -1
  const dy = Math.abs(y2 - y1)
  const sy = y1 < y2 ? 1 : -1
  let err = div(dx > dy ? dx : -dy, 2)
  while (x1 !== x2 || y1 !== y2) {
    setAt(t, x1, y1)
    const e2 = err
    if (e2 > -dx) {
      err -= dy
      x1 += sx
    }
    if (e2 < dy) {
      err += dx
      y1 += sy
    }
  }
  setAt(t, x2, y2)
}

function lineWidth(t: PixelTarget, x1: number, y1: number, x2: number, y2: number, width: number) {
  const endX = t.width - 1
  const endY = t.height - 1
  const extra = 1 - (width % 2)
  if (width < 1) return
  if (width === 1) {
    lineThin(t, x1, y1, x2, y2)
    return
  }
  width = div(width, 2)
  // The thickness grows across the line: sideways for a steep line, up and down for a flat one.
  const xinc = Math.abs(x1 - x2) <= Math.abs(y1 - y2)
  const left = Math.min(x1, x2) - (xinc ? width : 0)
  const right = Math.max(x1, x2) + (xinc ? width : 0)
  const top = Math.min(y1, y2) - (xinc ? 0 : width)
  const bottom = Math.max(y1, y2) + (xinc ? 0 : width)
  if (0 > right || 0 > bottom || t.width <= left || t.height <= top) return
  if (x1 === x2 && y1 === y2) {
    const start = Math.max(x1 - width + extra, 0)
    const end = Math.min(endX, x1 + width)
    if (start <= end) horz(t, start, y1, end)
    return
  }
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  const sx = x2 > x1 ? 1 : -1
  const sy = y2 > y1 ? 1 : -1
  let err = div(dx > dy ? dx : -dy, 2)
  const step = () => {
    const e2 = err
    if (e2 > -dx) {
      err -= dy
      x1 += sx
    }
    if (e2 < dy) {
      err += dx
      y1 += sy
    }
  }
  if (xinc) {
    while (y1 !== y2 + sy) {
      if (0 <= y1 && y1 <= endY) {
        const start = Math.max(x1 - width + extra, 0)
        const end = Math.min(endX, x1 + width)
        if (start <= end) horz(t, start, y1, end)
      }
      step()
    }
  } else {
    while (x1 !== x2 + sx) {
      if (0 <= x1 && x1 <= endX) {
        const start = Math.max(y1 - width + extra, 0)
        const end = Math.min(endY, y1 + width)
        if (start <= end) vert(t, start, x1, end)
      }
      step()
    }
  }
}

function fillTriangle(t: PixelTarget, xs: readonly number[], ys: readonly number[]) {
  let [p0x, p1x, p2x] = xs as [number, number, number]
  let [p0y, p1y, p2y] = ys as [number, number, number]
  if (p1y < p0y) [p1x, p1y, p0x, p0y] = [p0x, p0y, p1x, p1y]
  if (p2y < p1y) {
    ;[p1x, p1y, p2x, p2y] = [p2x, p2y, p1x, p1y]
    if (p1y < p0y) [p1x, p1y, p0x, p0y] = [p0x, p0y, p1x, p1y]
  }
  if (p0y === p1y && p1y === p2y && p0x === p1x && p1x !== p2x)
    [p1x, p1y, p2x, p2y] = [p2x, p2y, p1x, p1y]
  const d1 = f32((p2x - p0x) / (p2y - p0y + 1e-17))
  const d2 = f32((p1x - p0x) / (p1y - p0y + 1e-17))
  const d3 = f32((p2x - p1x) / (p2y - p1y + 1e-17))
  for (let y = p0y; y <= p2y; y++) {
    const x1 = p0x + trunc(f32(f32(y - p0y) * d1))
    const x2 = y < p1y ? p0x + trunc(f32(f32(y - p0y) * d2)) : p1x + trunc(f32(f32(y - p1y) * d3))
    horzClip(t, x1, y, x2)
  }
}

function fillPolygon(t: PixelTarget, px: readonly number[], py: readonly number[]) {
  const count = px.length
  let miny = py[0]!
  let maxy = py[0]!
  for (let i = 1; i < count; i++) {
    miny = Math.min(miny, py[i]!)
    maxy = Math.max(maxy, py[i]!)
  }
  if (miny === maxy) {
    // A polygon one pixel high.
    let minx = px[0]!
    let maxx = px[0]!
    for (let i = 1; i < count; i++) {
      minx = Math.min(minx, px[i]!)
      maxx = Math.max(maxx, px[i]!)
    }
    horzClip(t, minx, miny, maxx)
    return
  }
  const crossings: number[] = []
  // Rows outside the screen draw nothing: each row is computed on its own.
  for (let y = Math.max(miny, 0); y <= Math.min(maxy, t.height - 1); y++) {
    crossings.length = 0
    for (let i = 0; i < count; i++) {
      const previous = i ? i - 1 : count - 1
      let y1 = py[previous]!
      let y2 = py[i]!
      let x1: number
      let x2: number
      if (y1 < y2) {
        x1 = px[previous]!
        x2 = px[i]!
      } else if (y1 > y2) {
        y2 = py[previous]!
        y1 = py[i]!
        x2 = px[previous]!
        x1 = px[i]!
      } else continue
      if ((y >= y1 && y < y2) || (y === maxy && y2 === maxy)) {
        // The edge crosses this row (its lower end excluded, except on the last row).
        let crossing = f32(f32((y - y1) * (x2 - x1)) / f32(y2 - y1))
        crossing = crossings.length % 2 === 0 ? Math.floor(crossing) : Math.ceil(crossing)
        crossings.push(trunc(crossing) + x1)
      }
    }
    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2)
      horzClip(t, crossings[i]!, y, crossings[i + 1]!)
  }
  // A horizontal edge between the top and the bottom may be the lower border of the shape.
  for (let i = 0; i < count; i++) {
    const previous = i ? i - 1 : count - 1
    const y = py[i]!
    if (miny < y && py[previous] === y && y < maxy) horzClip(t, px[i]!, y, px[previous]!)
  }
}

function circleFilled(t: PixelTarget, x0: number, y0: number, radius: number) {
  let f = 1 - radius
  let ddFx = 0
  let ddFy = -2 * radius
  let x = 0
  let y = radius
  while (x < y) {
    if (f >= 0) {
      y--
      ddFy += 2
      f += ddFy
    }
    x++
    ddFx += 2
    f += ddFx + 1
    // Only a row whose y is about to step down is drawn here (no overdraw).
    if (f >= 0) {
      horzClip(t, x0 - x, y0 + y - 1, x0 + x - 1)
      horzClip(t, x0 - x, y0 - y, x0 + x - 1)
    }
    horzClip(t, x0 - y, y0 + x - 1, x0 + y - 1)
    horzClip(t, x0 - y, y0 - x, x0 + y - 1)
  }
}

function circleThin(t: PixelTarget, x0: number, y0: number, radius: number) {
  let f = 1 - radius
  let ddFx = 0
  let ddFy = -2 * radius
  let x = 0
  let y = radius
  while (x < y) {
    if (f >= 0) {
      y--
      ddFy += 2
      f += ddFy
    }
    x++
    ddFx += 2
    f += ddFx + 1
    setAt(t, x0 + x - 1, y0 + y - 1)
    setAt(t, x0 - x, y0 + y - 1)
    setAt(t, x0 + x - 1, y0 - y)
    setAt(t, x0 - x, y0 - y)
    setAt(t, x0 + y - 1, y0 + x - 1)
    setAt(t, x0 + y - 1, y0 - x)
    setAt(t, x0 - y, y0 + x - 1)
    setAt(t, x0 - y, y0 - x)
  }
}

function circleRing(t: PixelTarget, x0: number, y0: number, radius: number, thickness: number) {
  let x = 0
  let y = radius
  const r2 = radius * radius
  const doubleR2 = 2 * r2
  let d1 = r2 * (1.25 - radius)
  let dx = 0
  let dy = doubleR2 * y
  let line = true
  const inner = radius - thickness + 1
  let xIn = 0
  let yIn = inner
  const in2 = inner * inner
  const doubleIn2 = 2 * in2
  let d1In = in2 * (1.25 - inner)
  let d2In = 0
  let dxIn = 0
  let dyIn = doubleIn2 * yIn
  const rows = () => {
    if (line) {
      horzClip(t, x0 - x, y0 - y, x0 + x - 1)
      horzClip(t, x0 - x, y0 + y - 1, x0 + x - 1)
    } else {
      horzClip(t, x0 - x, y0 - y, x0 - xIn)
      horzClip(t, x0 - x, y0 + y - 1, x0 - xIn)
      horzClip(t, x0 + xIn - 1, y0 - y, x0 + x - 1)
      horzClip(t, x0 + xIn - 1, y0 + y - 1, x0 + x - 1)
    }
  }
  const innerStep = () => {
    while (d1In < 0) {
      xIn += 1
      dxIn += doubleIn2
      d1In += dxIn + in2
    }
    xIn++
    yIn--
    dxIn += doubleIn2
    dyIn -= doubleIn2
    d1In += dxIn - dyIn + in2
  }
  while (dx < dy) {
    while (d1 < 0) {
      x++
      dx += doubleR2
      d1 += dx + r2
    }
    rows()
    x++
    y--
    dx += doubleR2
    dy -= doubleR2
    d1 += dx - dy + r2
    if (line && y < inner) line = false
    if (!line) innerStep()
  }
  d1 = r2 * ((x + 0.5) * (x + 0.5) + (y - 1) * (y - 1) - r2)
  while (y >= 0) {
    rows()
    if (d1 > 0) {
      y--
      dy -= doubleR2
      d1 += r2 - dy
    } else {
      y--
      x++
      dx += doubleR2
      dy -= doubleR2
      d1 += dx - dy + r2
    }
    if (line && y < inner) line = false
    if (!line) {
      if (dxIn < dyIn) innerStep()
      else {
        if (!d2In) d2In = in2 * ((xIn + 0.5) * (xIn + 0.5) + (yIn - 1) * (yIn - 1) - in2)
        if (d2In > 0) {
          yIn--
          dyIn -= doubleIn2
          d2In += in2 - dyIn
        } else {
          yIn--
          xIn++
          dxIn += doubleIn2
          dyIn -= doubleIn2
          d2In += dxIn - dyIn + in2
        }
      }
    }
  }
}

export interface Quadrants {
  topRight: number
  topLeft: number
  bottomLeft: number
  bottomRight: number
}

function circleQuadrant(
  t: PixelTarget,
  x0: number,
  y0: number,
  radius: number,
  thickness: number,
  { topRight, topLeft, bottomLeft, bottomRight }: Quadrants,
) {
  let f = 1 - radius
  let ddFx = 0
  let ddFy = -2 * radius
  let x = 0
  let y = radius
  let iy = radius - thickness
  let iF = 1 - iy
  let iDdFx = 0
  let iDdFy = -2 * iy
  if (radius === 1) {
    if (topRight > 0) setAt(t, x0, y0 - 1)
    if (topLeft > 0) setAt(t, x0 - 1, y0 - 1)
    if (bottomLeft > 0) setAt(t, x0 - 1, y0)
    if (bottomRight > 0) setAt(t, x0, y0)
    return
  }
  if (thickness !== 0) {
    while (x < y) {
      if (f >= 0) {
        y--
        ddFy += 2
        f += ddFy
      }
      if (iF >= 0) {
        iy--
        iDdFy += 2
        iF += iDdFy
      }
      x++
      ddFx += 2
      f += ddFx + 1
      iDdFx += 2
      iF += iDdFx + 1
      if (thickness > 1) thickness = y - iy
      // The numbers are the eighths of the circle, as in pygame-ce.
      if (topRight > 0)
        for (let i = 0; i < thickness; i++) {
          const y1 = y - i
          if (y0 - y1 < y0 - x) setAt(t, x0 + x - 1, y0 - y1) /* 2 */
          if (x0 + y1 - 1 >= x0 + x - 1) setAt(t, x0 + y1 - 1, y0 - x) /* 1 */
        }
      if (topLeft > 0)
        for (let i = 0; i < thickness; i++) {
          const y1 = y - i
          if (y0 - y1 <= y0 - x) setAt(t, x0 - x, y0 - y1) /* 3 */
          if (x0 - y1 < x0 - x) setAt(t, x0 - y1, y0 - x) /* 4 */
        }
      if (bottomLeft > 0)
        for (let i = 0; i < thickness; i++) {
          const y1 = y - i
          if (x0 - y1 <= x0 - x) setAt(t, x0 - y1, y0 + x - 1) /* 5 */
          if (y0 + y1 - 1 > y0 + x - 1) setAt(t, x0 - x, y0 + y1 - 1) /* 6 */
        }
      if (bottomRight > 0)
        for (let i = 0; i < thickness; i++) {
          const y1 = y - i
          if (y0 + y1 - 1 >= y0 + x - 1) setAt(t, x0 + x - 1, y0 + y1 - 1) /* 7 */
          if (x0 + y1 - 1 > x0 + x - 1) setAt(t, x0 + y1 - 1, y0 + x - 1) /* 8 */
        }
    }
    return
  }
  while (x < y) {
    if (f >= 0) {
      y--
      ddFy += 2
      f += ddFy
    }
    x++
    ddFx += 2
    f += ddFx + 1
    if (topRight > 0) {
      for (let y1 = y0 - x; y1 <= y0; y1++) setAt(t, x0 + y - 1, y1)
      for (let y1 = y0 - y; y1 <= y0; y1++) setAt(t, x0 + x - 1, y1)
    }
    if (topLeft > 0) {
      for (let y1 = y0 - x; y1 <= y0; y1++) setAt(t, x0 - y, y1)
      for (let y1 = y0 - y; y1 <= y0; y1++) setAt(t, x0 - x, y1)
    }
    if (bottomLeft > 0) {
      for (let y1 = y0; y1 < y0 + x; y1++) setAt(t, x0 - y, y1)
      for (let y1 = y0; y1 < y0 + y; y1++) setAt(t, x0 - x, y1)
    }
    if (bottomRight > 0) {
      for (let y1 = y0; y1 < y0 + x; y1++) setAt(t, x0 + y - 1, y1)
      for (let y1 = y0; y1 < y0 + y; y1++) setAt(t, x0 + x - 1, y1)
    }
  }
}

function ellipseFilled(t: PixelTarget, x0: number, y0: number, width: number, height: number) {
  if (width === 1) {
    lineThin(t, x0, y0, x0, y0 + height - 1)
    return
  }
  if (height === 1) {
    horzClip(t, x0, y0, x0 + width - 1)
    return
  }
  x0 += div(width, 2)
  y0 += div(height, 2)
  const xOffset = (width + 1) % 2
  const yOffset = (height + 1) % 2
  width = div(width, 2)
  height = div(height, 2)
  let x = 0
  let y = height
  let d1 = height * height - width * width * height + 0.25 * width * width
  let dx = 2 * height * height * x
  let dy = 2 * width * width * y
  const rows = () => {
    horzClip(t, x0 - x, y0 - y, x0 + x - xOffset)
    horzClip(t, x0 - x, y0 + y - yOffset, x0 + x - xOffset)
  }
  while (dx < dy) {
    rows()
    if (d1 < 0) {
      x++
      dx += 2 * height * height
      d1 = d1 + dx + height * height
    } else {
      x++
      y--
      dx += 2 * height * height
      dy -= 2 * width * width
      d1 = d1 + dx - dy + height * height
    }
  }
  let d2 = height * height * ((x + 0.5) * (x + 0.5)) + width * width * ((y - 1) * (y - 1))
  d2 -= width * width * height * height
  while (y >= 0) {
    rows()
    if (d2 > 0) {
      y--
      dy -= 2 * width * width
      d2 = d2 + width * width - dy
    } else {
      y--
      x++
      dx += 2 * height * height
      dy -= 2 * width * width
      d2 = d2 + dx - dy + width * width
    }
  }
}

function ellipseRing(
  t: PixelTarget,
  x0: number,
  y0: number,
  width: number,
  height: number,
  thickness: number,
) {
  x0 += div(width, 2)
  y0 += div(height, 2)
  const xOffset = (width + 1) % 2
  const yOffset = (height + 1) % 2
  width = div(width, 2)
  height = div(height, 2)
  const ih = height - thickness
  const iw = width - thickness
  let line = true
  let x = 0
  let y = height
  let xIn = 0
  let yIn = ih
  let d1 = height * height - width * width * height + 0.25 * width * width
  let d1In = ih * ih - iw * iw * ih + 0.25 * iw * iw
  let d2In = 0
  let dx = 2 * height * height * x
  let dy = 2 * width * width * y
  let dxIn = 2 * ih * ih * xIn
  let dyIn = 2 * iw * iw * yIn
  const rows = () => {
    if (line) {
      horzClip(t, x0 - x, y0 - y, x0 + x - xOffset)
      horzClip(t, x0 - x, y0 + y - yOffset, x0 + x - xOffset)
    } else {
      horzClip(t, x0 - x, y0 - y, x0 - xIn)
      horzClip(t, x0 - x, y0 + y - yOffset, x0 - xIn)
      horzClip(t, x0 + x - xOffset, y0 - y, x0 + xIn - xOffset)
      horzClip(t, x0 + x - xOffset, y0 + y - yOffset, x0 + xIn - xOffset)
    }
  }
  const innerStep = () => {
    while (d1In < 0) {
      xIn++
      dxIn += 2 * ih * ih
      d1In = d1In + dxIn + ih * ih
    }
    xIn++
    yIn--
    dxIn += 2 * ih * ih
    dyIn -= 2 * iw * iw
    d1In = d1In + dxIn - dyIn + ih * ih
  }
  while (dx < dy) {
    rows()
    if (d1 < 0) {
      x++
      dx += 2 * height * height
      d1 = d1 + dx + height * height
    } else {
      x++
      y--
      dx += 2 * height * height
      dy -= 2 * width * width
      d1 = d1 + dx - dy + height * height
      if (line && y < ih) line = false
      if (!line && dxIn < dyIn) innerStep()
    }
  }
  let d2 = height * height * ((x + 0.5) * (x + 0.5)) + width * width * ((y - 1) * (y - 1))
  d2 -= width * width * height * height
  while (y >= 0) {
    rows()
    if (d2 > 0) {
      y--
      dy -= 2 * width * width
      d2 = d2 + width * width - dy
    } else {
      y--
      x++
      dx += 2 * height * height
      dy -= 2 * width * width
      d2 = d2 + dx - dy + width * width
    }
    if (line && y < ih) line = false
    if (!line) {
      if (dxIn < dyIn) innerStep()
      else if (yIn >= 0) {
        if (d2In === 0) {
          d2In = ih * ih * ((xIn + 0.5) * (xIn + 0.5)) + iw * iw * ((yIn - 1) * (yIn - 1))
          d2In -= iw * iw * ih * ih
        }
        if (d2In > 0) {
          yIn--
          dyIn -= 2 * iw * iw
          d2In = d2In + iw * iw - dyIn
        } else {
          yIn--
          xIn++
          dxIn += 2 * ih * ih
          dyIn -= 2 * iw * iw
          d2In = d2In + dxIn - dyIn + iw * iw
        }
      }
    }
  }
}

function inArc(
  x: number,
  y: number,
  minDot: number,
  inv1: number,
  inv2: number,
  invIn1: number,
  invIn2: number,
  xMiddle: number,
  yMiddle: number,
) {
  if (x * x * inv1 + y * y * inv2 > 1) return false
  if (x * x * invIn1 + y * y * invIn2 < 1) return false
  return x * xMiddle + y * yMiddle >= minDot * Math.sqrt(x * x + y * y)
}

function arcPixels(
  t: PixelTarget,
  xCenter: number,
  yCenter: number,
  radius1: number,
  radius2: number,
  width: number,
  start: number,
  stop: number,
) {
  if (width <= 0) return
  if (stop < start) stop += 2 * Math.PI
  if (stop <= start) return
  const middle = 0.5 * (start + stop)
  const distance = middle - start
  const xMiddle = Math.cos(middle)
  const yMiddle = -Math.sin(middle)
  const inner1 = radius1 - width
  const inner2 = radius2 - width
  const inv1 = 1 / (radius1 * radius1)
  const inv2 = 1 / (radius2 * radius2)
  const invIn1 = 1 / (inner1 * inner1)
  const invIn2 = 1 / (inner2 * inner2)
  const minDot = distance < Math.PI ? Math.cos(middle - start) : -1.0
  const inside = (x: number, y: number) =>
    inArc(x, y, minDot, inv1, inv2, invIn1, invIn2, xMiddle, yMiddle)
  // The bounding box of the arc (calc_arc_bounds), from its four corners and the quadrants.
  const xStart = Math.cos(start)
  const yStart = -Math.sin(start)
  const xStop = Math.cos(stop)
  const yStop = -Math.sin(stop)
  const corner = (value: number) => trunc(value + 0.5)
  const xs = [xStart * inner1, xStop * inner1, xStart * radius1, xStop * radius1].map(corner)
  const ys = [yStart * inner2, yStop * inner2, yStart * radius2, yStop * radius2].map(corner)
  let minx = -xMiddle < minDot ? Math.min(...xs) : -radius1
  minx = Math.max(minx, -xCenter)
  let miny = -yMiddle < minDot ? Math.min(...ys) : -radius2
  miny = Math.max(miny, -yCenter)
  let maxx = xMiddle < minDot ? Math.max(...xs) : radius1
  maxx = Math.min(maxx, t.width - xCenter - 1)
  let maxy = yMiddle < minDot ? Math.max(...ys) : radius2
  maxy = Math.min(maxy, t.height - yCenter - 1)
  if (minx >= maxx || miny >= maxy) return
  const rowHas = (y: number) => {
    for (let x = minx; x <= maxx; ++x) if (inside(x, y)) return true
    return false
  }
  const columnHas = (x: number) => {
    for (let y = miny; y <= maxy; ++y) if (inside(x, y)) return true
    return false
  }
  for (;;) {
    if (miny >= maxy) return
    if (rowHas(miny)) break
    miny++
  }
  for (;;) {
    if (maxy <= miny) return
    if (rowHas(maxy)) break
    maxy--
  }
  for (;;) {
    if (minx >= maxx) return
    if (columnHas(minx)) break
    minx++
  }
  for (;;) {
    if (minx >= maxx) return
    if (columnHas(maxx)) break
    maxx--
  }
  if (minx >= maxx || miny >= maxy) return
  const maxRequired = Math.max(maxy, -miny)
  for (let y = 0; y <= maxRequired; ++y) {
    const posY = y >= miny && y <= maxy
    const negY = -y >= miny && -y <= maxy
    const y2 = y * y
    const xOuter = trunc(radius1 * Math.sqrt(1.0 - y2 * inv2))
    const xInner = y < inner2 ? trunc(inner1 * Math.sqrt(1.0 - y2 * invIn2)) : 0
    const yDot = y * yMiddle
    for (let x = xInner; x <= xOuter; x++) {
      const posX = x >= minx && x <= maxx
      const negX = -x >= minx && -x <= maxx
      if (!(posX || negX)) continue
      const cmp = minDot * Math.sqrt(x * x + y2)
      const xDot = x * xMiddle
      if (posY && posX && xDot + yDot >= cmp) t.fill(xCenter + x, yCenter + y, 1, 1)
      if (posY && negX && -xDot + yDot >= cmp) t.fill(xCenter - x, yCenter + y, 1, 1)
      if (negY && posX && xDot - yDot >= cmp) t.fill(xCenter + x, yCenter - y, 1, 1)
      if (negY && negX && -xDot - yDot >= cmp) t.fill(xCenter - x, yCenter - y, 1, 1)
    }
  }
}

function rectOutline(
  t: PixelTarget,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
) {
  for (let i = 0; i < width; i++) {
    horzClip(t, x1, y1 + i, x2)
    horzClip(t, x1, y2 - i, x2)
  }
  for (let i = 0; i < y2 - y1 - 2 * width + 1; i++) {
    horzClip(t, x1, y1 + width + i, x1 + width - 1)
    horzClip(t, x2 - width + 1, y1 + width + i, x2)
  }
}

function roundRect(
  t: PixelTarget,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  width: number,
  corners: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number },
) {
  let { topLeft, topRight, bottomLeft, bottomRight } = corners
  if (topLeft < 0) topLeft = radius
  if (topRight < 0) topRight = radius
  if (bottomLeft < 0) bottomLeft = radius
  if (bottomRight < 0) bottomRight = radius
  if (
    topLeft + topRight > x2 - x1 + 1 ||
    bottomLeft + bottomRight > x2 - x1 + 1 ||
    topLeft + bottomLeft > y2 - y1 + 1 ||
    topRight + bottomRight > y2 - y1 + 1
  ) {
    // Corners too big for the rectangle shrink together.
    const qTop = f32(f32(x2 - x1 + 1) / f32(topLeft + topRight))
    const qLeft = f32(f32(y2 - y1 + 1) / f32(topLeft + bottomLeft))
    const qBottom = f32(f32(x2 - x1 + 1) / f32(bottomLeft + bottomRight))
    const qRight = f32(f32(y2 - y1 + 1) / f32(topRight + bottomRight))
    const q = Math.min(qTop, qLeft, qBottom, qRight)
    topLeft = trunc(f32(topLeft * q))
    topRight = trunc(f32(topRight * q))
    bottomLeft = trunc(f32(bottomLeft * q))
    bottomRight = trunc(f32(bottomRight * q))
  }
  const only = (quadrant: keyof Quadrants): Quadrants => ({
    topRight: 0,
    topLeft: 0,
    bottomLeft: 0,
    bottomRight: 0,
    [quadrant]: 1,
  })
  if (width === 0) {
    fillPolygon(
      t,
      [x1, x1 + topLeft, x2 - topRight, x2, x2, x2 - bottomRight, x1 + bottomLeft, x1],
      [y1 + topLeft, y1, y1, y1 + topRight, y2 - bottomRight, y2, y2, y2 - bottomLeft],
    )
  } else {
    const near = div(width, 2) - 1 + (width % 2)
    const far = div(width, 2)
    if (x2 - topRight === x1 + topLeft)
      for (let i = 0; i < width; i++) setAt(t, x1 + topLeft, y1 + i)
    else lineWidth(t, x1 + topLeft, y1 + near, x2 - topRight, y1 + near, width)
    if (y2 - bottomLeft === y1 + topLeft)
      for (let i = 0; i < width; i++) setAt(t, x1 + i, y1 + topLeft)
    else lineWidth(t, x1 + near, y1 + topLeft, x1 + near, y2 - bottomLeft, width)
    if (x2 - bottomRight === x1 + bottomLeft)
      for (let i = 0; i < width; i++) setAt(t, x1 + bottomLeft, y2 - i)
    else lineWidth(t, x1 + bottomLeft, y2 - far, x2 - bottomRight, y2 - far, width)
    if (y2 - bottomRight === y1 + topRight)
      for (let i = 0; i < width; i++) setAt(t, x2 - i, y1 + topRight)
    else lineWidth(t, x2 - far, y1 + topRight, x2 - far, y2 - bottomRight, width)
  }
  circleQuadrant(t, x2 - topRight + 1, y1 + topRight, topRight, width, only('topRight'))
  circleQuadrant(t, x1 + topLeft, y1 + topLeft, topLeft, width, only('topLeft'))
  circleQuadrant(t, x1 + bottomLeft, y2 - bottomLeft + 1, bottomLeft, width, only('bottomLeft'))
  circleQuadrant(
    t,
    x2 - bottomRight + 1,
    y2 - bottomRight + 1,
    bottomRight,
    width,
    only('bottomRight'),
  )
}

// The pygame.draw functions, with the argument rules of pygame-ce's own. ----------------------

/** pygame.draw.line. */
export function drawLine(
  t: PixelTarget,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
) {
  width = trunc(width)
  if (width < 1) return
  lineWidth(t, trunc(x1), trunc(y1), trunc(x2), trunc(y2), width)
}

/** pygame.draw.rect, also with rounded corners (radius 0 and -1 corners: square). */
export function drawRect(
  t: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
  radius = 0,
  corners = { topLeft: -1, topRight: -1, bottomLeft: -1, bottomRight: -1 },
) {
  x = trunc(x)
  y = trunc(y)
  w = trunc(w)
  h = trunc(h)
  width = trunc(width)
  radius = trunc(radius)
  if (width < 0) return
  const { topLeft, topRight, bottomLeft, bottomRight } = corners
  if (
    (radius <= 0 && topLeft <= 0 && topRight <= 0 && bottomLeft <= 0 && bottomRight <= 0) ||
    Math.abs(w) < 2 ||
    Math.abs(h) < 2
  ) {
    // SDL_IntersectRect: an empty rectangle (w or h not positive) draws nothing.
    if (w <= 0 || h <= 0) return
    const left = Math.max(x, 0)
    const top = Math.max(y, 0)
    const right = Math.min(x + w, t.width)
    const bottom = Math.min(y + h, t.height)
    if (right <= left || bottom <= top) return
    if (width > 0 && width * 2 < right - left && width * 2 < bottom - top)
      rectOutline(t, x, y, x + w - 1, y + h - 1, width)
    else t.fill(left, top, right - left, bottom - top)
    return
  }
  if (w < 0) {
    x += w
    w = -w
  }
  if (h < 0) {
    y += h
    h = -h
  }
  if (width > div(w, 2) || width > div(h, 2)) width = Math.max(div(w, 2), div(h, 2))
  roundRect(t, x, y, x + w - 1, y + h - 1, radius, width, {
    topLeft: trunc(topLeft),
    topRight: trunc(topRight),
    bottomLeft: trunc(bottomLeft),
    bottomRight: trunc(bottomRight),
  })
}

/** pygame.draw.circle, also only some of its quarters. */
export function drawCircle(
  t: PixelTarget,
  x: number,
  y: number,
  radius: number,
  width: number,
  quarters: Quadrants = { topRight: 0, topLeft: 0, bottomLeft: 0, bottomRight: 0 },
) {
  x = trunc(x)
  y = trunc(y)
  radius = trunc(radius)
  width = trunc(width)
  if (radius < 1 || width < 0) return
  if (width > radius) width = radius
  if (x > t.width + radius || x < -radius || y > t.height + radius || y < -radius) return
  const { topRight, topLeft, bottomLeft, bottomRight } = quarters
  if (topRight === 0 && topLeft === 0 && bottomLeft === 0 && bottomRight === 0) {
    if (!width || width === radius) circleFilled(t, x, y, radius)
    else if (width === 1) circleThin(t, x, y, radius)
    else circleRing(t, x, y, radius, width)
  } else circleQuadrant(t, x, y, radius, width, quarters)
}

/** pygame.draw.ellipse. */
export function drawEllipse(
  t: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
) {
  x = trunc(x)
  y = trunc(y)
  w = trunc(w)
  h = trunc(h)
  width = trunc(width)
  if (width < 0) return
  if (!width || width >= Math.min(div(w, 2) + (w % 2), div(h, 2) + (h % 2)))
    ellipseFilled(t, x, y, w, h)
  else ellipseRing(t, x, y, w, h, width - 1)
}

/** pygame.draw.arc: angles in radians, counter-clockwise from the right. */
export function drawArc(
  t: PixelTarget,
  x: number,
  y: number,
  w: number,
  h: number,
  start: number,
  stop: number,
  width: number,
) {
  x = trunc(x)
  y = trunc(y)
  w = trunc(w)
  h = trunc(h)
  width = trunc(width)
  if (width < 0) return
  if (width > div(w, 2) || width > div(h, 2)) width = Math.max(div(w, 2), div(h, 2))
  if (stop < start) stop += 2 * Math.PI
  width = Math.min(width, div(Math.min(w, h), 2))
  arcPixels(t, x + div(w, 2), y + div(h, 2), div(w, 2), div(h, 2), width, start, stop)
}

/** pygame.draw.polygon: filled (width 0) or its closed border (pygame.draw.lines). */
export function drawPolygon(
  t: PixelTarget,
  xs: readonly number[],
  ys: readonly number[],
  width: number,
) {
  const px = xs.map(trunc)
  const py = ys.map(trunc)
  width = trunc(width)
  if (width) {
    if (width < 1) return
    for (let i = 1; i < px.length; i++) lineWidth(t, px[i - 1]!, py[i - 1]!, px[i]!, py[i]!, width)
    if (px.length > 2) lineWidth(t, px[px.length - 1]!, py[py.length - 1]!, px[0]!, py[0]!, width)
    return
  }
  if (px.length === 3) fillTriangle(t, px, py)
  else fillPolygon(t, px, py)
}
