/**
 * The font rasterizer of the desktop raylib: a TypeScript port of stb_truetype v1.26
 * (public domain, Sean Barrett), the file raylib 6.0.1.0 compiles in (src/external).
 *
 * The browser's own text engine (`fillText`) cannot stand in: on Windows it antialiases
 * horizontally even a pixel-aligned outline, so a pixel font comes out blurry where the
 * desktop raylib draws it crisp. This port follows the C code step by step, including the
 * float32 arithmetic (`Math.fround`), the edge sort and the order of the active edges, so a
 * glyph bitmap matches `stbtt_GetCodepointBitmap` byte for byte.
 *
 * Only what `LoadFontData` uses is here: tables, cmap, TrueType and CFF outlines, the glyph
 * box, curve flattening (flatness 0.35) and the v2 area-coverage rasterizer.
 */

const f32 = Math.fround

// ---------------------------------------------------------------------------------------
// Byte access

interface Buf {
  data: Uint8Array
  start: number
  size: number
  cursor: number
}

const newBuf = (data: Uint8Array, start: number, size: number): Buf => ({
  data,
  start,
  size,
  cursor: 0,
})
const emptyBuf = (data: Uint8Array): Buf => newBuf(data, 0, 0)

function get8(b: Buf) {
  if (b.cursor >= b.size) return 0
  return b.data[b.start + b.cursor++] ?? 0
}
function peek8(b: Buf) {
  if (b.cursor >= b.size) return 0
  return b.data[b.start + b.cursor] ?? 0
}
function seek(b: Buf, o: number) {
  b.cursor = o > b.size || o < 0 ? b.size : o
}
function skip(b: Buf, o: number) {
  seek(b, b.cursor + o)
}
function getN(b: Buf, n: number) {
  let v = 0
  for (let i = 0; i < n; i++) v = ((v << 8) | get8(b)) >>> 0
  return v
}
function range(b: Buf, o: number, s: number): Buf {
  if (o < 0 || s < 0 || o > b.size || s > b.size - o) return emptyBuf(b.data)
  return newBuf(b.data, b.start + o, s)
}
function cffGetIndex(b: Buf): Buf {
  const start = b.cursor
  const count = getN(b, 2)
  if (count) {
    const offsize = get8(b)
    skip(b, offsize * count)
    skip(b, getN(b, offsize) - 1)
  }
  return range(b, start, b.cursor - start)
}
function cffInt(b: Buf): number {
  const b0 = get8(b)
  if (b0 >= 32 && b0 <= 246) return b0 - 139
  if (b0 >= 247 && b0 <= 250) return (b0 - 247) * 256 + get8(b) + 108
  if (b0 >= 251 && b0 <= 254) return -(b0 - 251) * 256 - get8(b) - 108
  if (b0 === 28) return getN(b, 2)
  if (b0 === 29) return getN(b, 4)
  return 0
}
function cffSkipOperand(b: Buf) {
  const b0 = peek8(b)
  if (b0 === 30) {
    skip(b, 1)
    while (b.cursor < b.size) {
      const v = get8(b)
      if ((v & 0xf) === 0xf || v >> 4 === 0xf) break
    }
  } else cffInt(b)
}
function dictGet(b: Buf, key: number): Buf {
  seek(b, 0)
  while (b.cursor < b.size) {
    const start = b.cursor
    while (peek8(b) >= 28) cffSkipOperand(b)
    const end = b.cursor
    let op = get8(b)
    if (op === 12) op = get8(b) | 0x100
    if (op === key) return range(b, start, end - start)
  }
  return range(b, 0, 0)
}
function dictGetInts(b: Buf, key: number, out: number[]) {
  const operands = dictGet(b, key)
  for (let i = 0; i < out.length && operands.cursor < operands.size; i++)
    out[i] = cffInt(operands) >>> 0
}
function cffIndexCount(b: Buf) {
  seek(b, 0)
  return getN(b, 2)
}
function cffIndexGet(source: Buf, i: number): Buf {
  const b = { ...source }
  seek(b, 0)
  const count = getN(b, 2)
  const offsize = get8(b)
  skip(b, i * offsize)
  const start = getN(b, offsize)
  const end = getN(b, offsize)
  return range(b, 2 + (count + 1) * offsize + start, end - start)
}

const u16 = (d: Uint8Array, p: number) => ((d[p] ?? 0) << 8) | (d[p + 1] ?? 0)
const s16 = (d: Uint8Array, p: number) => (u16(d, p) << 16) >> 16
const u32 = (d: Uint8Array, p: number) =>
  (((d[p] ?? 0) << 24) | ((d[p + 1] ?? 0) << 16) | ((d[p + 2] ?? 0) << 8) | (d[p + 3] ?? 0)) >>> 0
const s8 = (d: Uint8Array, p: number) => ((d[p] ?? 0) << 24) >> 24
/** C `(stbtt_int16)` of an int: wraps to 16 bits. */
const short = (v: number) => (v << 16) >> 16
/** C float → int conversion: truncates toward zero, then wraps to 16 bits like `(short)`. */
const shortOfFloat = (v: number) => short(Math.trunc(v))

function tag(d: Uint8Array, p: number, name: string) {
  for (let i = 0; i < 4; i++) if (d[p + i] !== name.charCodeAt(i)) return false
  return true
}

function findTable(data: Uint8Array, fontstart: number, name: string) {
  const numTables = u16(data, fontstart + 4)
  const tabledir = fontstart + 12
  for (let i = 0; i < numTables; i++) {
    const loc = tabledir + 16 * i
    if (tag(data, loc, name)) return u32(data, loc + 8)
  }
  return 0
}

// ---------------------------------------------------------------------------------------
// Font info

export interface StbFont {
  data: Uint8Array
  loca: number
  head: number
  glyf: number
  hhea: number
  hmtx: number
  numGlyphs: number
  indexMap: number
  indexToLocFormat: number
  cff: Buf
  charstrings: Buf
  gsubrs: Buf
  subrs: Buf
  fontdicts: Buf
  fdselect: Buf
}

function getSubrs(cff: Buf, fontdict: Buf): Buf {
  const privateLoc = [0, 0]
  dictGetInts(fontdict, 18, privateLoc)
  if (!privateLoc[1] || !privateLoc[0]) return emptyBuf(cff.data)
  const pdict = range(cff, privateLoc[1], privateLoc[0])
  const subrsoff = [0]
  dictGetInts(pdict, 19, subrsoff)
  if (!subrsoff[0]) return emptyBuf(cff.data)
  const b = { ...cff }
  seek(b, privateLoc[1] + subrsoff[0])
  return cffGetIndex(b)
}

/** `stbtt_InitFont` for the first font of the file. `null` where stb returns 0. */
export function initFont(data: Uint8Array): StbFont | null {
  if (data.length < 12) return null
  const fontstart = 0
  const cmap = findTable(data, fontstart, 'cmap')
  const font: StbFont = {
    data,
    loca: findTable(data, fontstart, 'loca'),
    head: findTable(data, fontstart, 'head'),
    glyf: findTable(data, fontstart, 'glyf'),
    hhea: findTable(data, fontstart, 'hhea'),
    hmtx: findTable(data, fontstart, 'hmtx'),
    numGlyphs: 0,
    indexMap: 0,
    indexToLocFormat: 0,
    cff: emptyBuf(data),
    charstrings: emptyBuf(data),
    gsubrs: emptyBuf(data),
    subrs: emptyBuf(data),
    fontdicts: emptyBuf(data),
    fdselect: emptyBuf(data),
  }
  if (!cmap || !font.head || !font.hhea || !font.hmtx) return null
  if (font.glyf) {
    if (!font.loca) return null
  } else {
    const cffOffset = findTable(data, fontstart, 'CFF ')
    if (!cffOffset) return null
    font.cff = newBuf(data, cffOffset, data.length - cffOffset)
    const b = { ...font.cff }
    skip(b, 2)
    seek(b, get8(b))
    cffGetIndex(b) // name INDEX
    const topdictidx = cffGetIndex(b)
    const topdict = cffIndexGet(topdictidx, 0)
    cffGetIndex(b) // string INDEX
    font.gsubrs = cffGetIndex(b)
    const charstrings = [0]
    const cstype = [2]
    const fdarrayoff = [0]
    const fdselectoff = [0]
    dictGetInts(topdict, 17, charstrings)
    dictGetInts(topdict, 0x100 | 6, cstype)
    dictGetInts(topdict, 0x100 | 36, fdarrayoff)
    dictGetInts(topdict, 0x100 | 37, fdselectoff)
    font.subrs = getSubrs(b, topdict)
    if (cstype[0] !== 2 || !charstrings[0]) return null
    if (fdarrayoff[0]) {
      if (!fdselectoff[0]) return null
      seek(b, fdarrayoff[0])
      font.fontdicts = cffGetIndex(b)
      font.fdselect = range(b, fdselectoff[0], b.size - fdselectoff[0])
    }
    seek(b, charstrings[0])
    font.charstrings = cffGetIndex(b)
  }
  const maxp = findTable(data, fontstart, 'maxp')
  font.numGlyphs = maxp ? u16(data, maxp + 4) : 0xffff
  const numTables = u16(data, cmap + 2)
  for (let i = 0; i < numTables; i++) {
    const record = cmap + 4 + 8 * i
    const platform = u16(data, record)
    if (platform === 3) {
      const encoding = u16(data, record + 2)
      if (encoding === 1 || encoding === 10) font.indexMap = cmap + u32(data, record + 4)
    } else if (platform === 0) font.indexMap = cmap + u32(data, record + 4)
  }
  if (font.indexMap === 0) return null
  font.indexToLocFormat = u16(data, font.head + 50)
  return font
}

/** `stbtt_FindGlyphIndex`. */
export function findGlyphIndex(info: StbFont, codepoint: number): number {
  const data = info.data
  const map = info.indexMap
  const format = u16(data, map)
  if (format === 0) {
    const bytes = u16(data, map + 2)
    return codepoint < bytes - 6 ? (data[map + 6 + codepoint] ?? 0) : 0
  }
  if (format === 6) {
    const first = u16(data, map + 6)
    const count = u16(data, map + 8)
    if (codepoint >= first && codepoint < first + count)
      return u16(data, map + 10 + (codepoint - first) * 2)
    return 0
  }
  if (format === 4) {
    const segcount = u16(data, map + 6) >> 1
    let searchRange = u16(data, map + 8) >> 1
    let entrySelector = u16(data, map + 10)
    const rangeShift = u16(data, map + 12) >> 1
    const endCount = map + 14
    let search = endCount
    if (codepoint > 0xffff) return 0
    if (codepoint >= u16(data, search + rangeShift * 2)) search += rangeShift * 2
    search -= 2
    while (entrySelector) {
      searchRange >>= 1
      const end = u16(data, search + searchRange * 2)
      if (codepoint > end) search += searchRange * 2
      entrySelector--
    }
    search += 2
    const item = ((search - endCount) >> 1) & 0xffff
    const start = u16(data, map + 14 + segcount * 2 + 2 + 2 * item)
    const last = u16(data, endCount + 2 * item)
    if (codepoint < start || codepoint > last) return 0
    const offset = u16(data, map + 14 + segcount * 6 + 2 + 2 * item)
    if (offset === 0)
      return (codepoint + s16(data, map + 14 + segcount * 4 + 2 + 2 * item)) & 0xffff
    return u16(data, offset + (codepoint - start) * 2 + map + 14 + segcount * 6 + 2 + 2 * item)
  }
  if (format === 12 || format === 13) {
    const ngroups = u32(data, map + 12)
    let low = 0
    let high = ngroups
    while (low < high) {
      const mid = low + ((high - low) >> 1)
      const startChar = u32(data, map + 16 + mid * 12)
      const endChar = u32(data, map + 16 + mid * 12 + 4)
      if (codepoint < startChar) high = mid
      else if (codepoint > endChar) low = mid + 1
      else {
        const startGlyph = u32(data, map + 16 + mid * 12 + 8)
        return format === 12 ? startGlyph + codepoint - startChar : startGlyph
      }
    }
  }
  return 0
}

/** `stbtt_GetFontVMetrics`. */
export function fontVMetrics(info: StbFont) {
  return {
    ascent: s16(info.data, info.hhea + 4),
    descent: s16(info.data, info.hhea + 6),
    lineGap: s16(info.data, info.hhea + 8),
  }
}

/** `stbtt_ScaleForPixelHeight`, in float32 like the C code. */
export function scaleForPixelHeight(info: StbFont, height: number) {
  const { ascent, descent } = fontVMetrics(info)
  return f32(f32(height) / (ascent - descent))
}

/** `stbtt_GetGlyphHMetrics`: the advance width of a glyph, in font units. */
export function glyphAdvance(info: StbFont, glyph: number) {
  const numOfLongHorMetrics = u16(info.data, info.hhea + 34)
  if (glyph < numOfLongHorMetrics) return s16(info.data, info.hmtx + 4 * glyph)
  return s16(info.data, info.hmtx + 4 * (numOfLongHorMetrics - 1))
}

// ---------------------------------------------------------------------------------------
// Outlines

const VMOVE = 1
const VLINE = 2
const VCURVE = 3
const VCUBIC = 4

interface Vertex {
  type: number
  x: number
  y: number
  cx: number
  cy: number
  cx1: number
  cy1: number
}

const vertex = (type: number, x: number, y: number, cx: number, cy: number): Vertex => ({
  type,
  x: short(x),
  y: short(y),
  cx: short(cx),
  cy: short(cy),
  cx1: 0,
  cy1: 0,
})

function glyfOffset(info: StbFont, glyph: number) {
  if (glyph >= info.numGlyphs) return -1
  if (info.indexToLocFormat >= 2) return -1
  let g1: number
  let g2: number
  if (info.indexToLocFormat === 0) {
    g1 = info.glyf + u16(info.data, info.loca + glyph * 2) * 2
    g2 = info.glyf + u16(info.data, info.loca + glyph * 2 + 2) * 2
  } else {
    g1 = info.glyf + u32(info.data, info.loca + glyph * 4)
    g2 = info.glyf + u32(info.data, info.loca + glyph * 4 + 4)
  }
  return g1 === g2 ? -1 : g1
}

function closeShape(
  out: Vertex[],
  wasOff: boolean,
  startOff: boolean,
  sx: number,
  sy: number,
  scx: number,
  scy: number,
  cx: number,
  cy: number,
) {
  if (startOff) {
    if (wasOff) out.push(vertex(VCURVE, (cx + scx) >> 1, (cy + scy) >> 1, cx, cy))
    out.push(vertex(VCURVE, sx, sy, scx, scy))
  } else if (wasOff) out.push(vertex(VCURVE, sx, sy, cx, cy))
  else out.push(vertex(VLINE, sx, sy, 0, 0))
}

function glyphShapeTT(info: StbFont, glyph: number, depth: number): Vertex[] {
  const data = info.data
  const g = glyfOffset(info, glyph)
  if (g < 0) return []
  const numberOfContours = s16(data, g)
  const out: Vertex[] = []
  if (numberOfContours > 0) {
    const endPts = g + 10
    const ins = u16(data, g + 10 + numberOfContours * 2)
    let points = g + 10 + numberOfContours * 2 + 2 + ins
    const n = 1 + u16(data, endPts + numberOfContours * 2 - 2)
    const flagsOf = new Uint8Array(n + 1)
    const xs = new Int16Array(n + 1)
    const ys = new Int16Array(n + 1)
    let flags = 0
    let flagcount = 0
    for (let i = 0; i < n; i++) {
      if (flagcount === 0) {
        flags = data[points++] ?? 0
        if (flags & 8) flagcount = data[points++] ?? 0
      } else flagcount--
      flagsOf[i] = flags
    }
    let x = 0
    for (let i = 0; i < n; i++) {
      const fl = flagsOf[i]!
      if (fl & 2) {
        const dx = data[points++] ?? 0
        x += fl & 16 ? dx : -dx
      } else if (!(fl & 16)) {
        x += s16(data, points)
        points += 2
      }
      xs[i] = x
    }
    let y = 0
    for (let i = 0; i < n; i++) {
      const fl = flagsOf[i]!
      if (fl & 4) {
        const dy = data[points++] ?? 0
        y += fl & 32 ? dy : -dy
      } else if (!(fl & 32)) {
        y += s16(data, points)
        points += 2
      }
      ys[i] = y
    }
    let nextMove = 0
    let wasOff = false
    let startOff = false
    let sx = 0
    let sy = 0
    let cx = 0
    let cy = 0
    let scx = 0
    let scy = 0
    let j = 0
    for (let i = 0; i < n; i++) {
      const fl = flagsOf[i]!
      const px = xs[i]!
      const py = ys[i]!
      if (nextMove === i) {
        if (i !== 0) closeShape(out, wasOff, startOff, sx, sy, scx, scy, cx, cy)
        startOff = !(fl & 1)
        if (startOff) {
          scx = px
          scy = py
          if (!(flagsOf[i + 1]! & 1)) {
            sx = (px + xs[i + 1]!) >> 1
            sy = (py + ys[i + 1]!) >> 1
          } else {
            sx = xs[i + 1]!
            sy = ys[i + 1]!
            i++
          }
        } else {
          sx = px
          sy = py
        }
        out.push(vertex(VMOVE, sx, sy, 0, 0))
        wasOff = false
        nextMove = 1 + u16(data, endPts + j * 2)
        j++
      } else if (!(fl & 1)) {
        if (wasOff) out.push(vertex(VCURVE, (cx + px) >> 1, (cy + py) >> 1, cx, cy))
        cx = px
        cy = py
        wasOff = true
      } else {
        out.push(wasOff ? vertex(VCURVE, px, py, cx, cy) : vertex(VLINE, px, py, 0, 0))
        wasOff = false
      }
    }
    closeShape(out, wasOff, startOff, sx, sy, scx, scy, cx, cy)
  } else if (numberOfContours < 0) {
    let comp = g + 10
    let more = true
    while (more) {
      const flags = s16(data, comp)
      comp += 2
      const gidx = s16(data, comp) & 0xffff
      comp += 2
      const mtx = [1, 0, 0, 1, 0, 0]
      if (flags & 2) {
        if (flags & 1) {
          mtx[4] = s16(data, comp)
          mtx[5] = s16(data, comp + 2)
          comp += 4
        } else {
          mtx[4] = s8(data, comp)
          mtx[5] = s8(data, comp + 1)
          comp += 2
        }
      }
      if (flags & (1 << 3)) {
        mtx[0] = mtx[3] = f32(s16(data, comp) / 16384)
        mtx[1] = mtx[2] = 0
        comp += 2
      } else if (flags & (1 << 6)) {
        mtx[0] = f32(s16(data, comp) / 16384)
        mtx[1] = mtx[2] = 0
        mtx[3] = f32(s16(data, comp + 2) / 16384)
        comp += 4
      } else if (flags & (1 << 7)) {
        mtx[0] = f32(s16(data, comp) / 16384)
        mtx[1] = f32(s16(data, comp + 2) / 16384)
        mtx[2] = f32(s16(data, comp + 4) / 16384)
        mtx[3] = f32(s16(data, comp + 6) / 16384)
        comp += 8
      }
      const m = f32(Math.sqrt(f32(f32(mtx[0]! * mtx[0]!) + f32(mtx[1]! * mtx[1]!))))
      const nn = f32(Math.sqrt(f32(f32(mtx[2]! * mtx[2]!) + f32(mtx[3]! * mtx[3]!))))
      const parts = depth < 16 ? glyphShape(info, gidx, depth + 1) : []
      const transform = (a: number, b: number): [number, number] => [
        shortOfFloat(f32(f32(f32(mtx[0]! * a) + f32(mtx[2]! * b)) + f32(mtx[4]! * m))),
        shortOfFloat(f32(f32(f32(mtx[1]! * a) + f32(mtx[3]! * b)) + f32(mtx[5]! * nn))),
      ]
      for (const v of parts) {
        ;[v.x, v.y] = transform(v.x, v.y)
        ;[v.cx, v.cy] = transform(v.cx, v.cy)
        out.push(v)
      }
      more = (flags & (1 << 5)) !== 0
    }
  }
  return out
}

interface CsCtx {
  bounds: boolean
  started: boolean
  firstX: number
  firstY: number
  x: number
  y: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  vertices: Vertex[]
  count: number
}

const newCtx = (bounds: boolean): CsCtx => ({
  bounds,
  started: false,
  firstX: 0,
  firstY: 0,
  x: 0,
  y: 0,
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  vertices: [],
  count: 0,
})

function trackVertex(c: CsCtx, x: number, y: number) {
  if (x > c.maxX || !c.started) c.maxX = x
  if (y > c.maxY || !c.started) c.maxY = y
  if (x < c.minX || !c.started) c.minX = x
  if (y < c.minY || !c.started) c.minY = y
  c.started = true
}

function csV(
  c: CsCtx,
  type: number,
  x: number,
  y: number,
  cx: number,
  cy: number,
  cx1: number,
  cy1: number,
) {
  if (c.bounds) {
    trackVertex(c, x, y)
    if (type === VCUBIC) {
      trackVertex(c, cx, cy)
      trackVertex(c, cx1, cy1)
    }
  } else {
    const v = vertex(type, x, y, cx, cy)
    v.cx1 = short(cx1)
    v.cy1 = short(cy1)
    c.vertices.push(v)
  }
  c.count++
}

const toInt = (v: number) => Math.trunc(v) | 0

function csClose(c: CsCtx) {
  if (c.firstX !== c.x || c.firstY !== c.y)
    csV(c, VLINE, toInt(c.firstX), toInt(c.firstY), 0, 0, 0, 0)
}
function csMove(c: CsCtx, dx: number, dy: number) {
  csClose(c)
  c.firstX = c.x = f32(c.x + dx)
  c.firstY = c.y = f32(c.y + dy)
  csV(c, VMOVE, toInt(c.x), toInt(c.y), 0, 0, 0, 0)
}
function csLine(c: CsCtx, dx: number, dy: number) {
  c.x = f32(c.x + dx)
  c.y = f32(c.y + dy)
  csV(c, VLINE, toInt(c.x), toInt(c.y), 0, 0, 0, 0)
}
function csCurve(
  c: CsCtx,
  dx1: number,
  dy1: number,
  dx2: number,
  dy2: number,
  dx3: number,
  dy3: number,
) {
  const cx1 = f32(c.x + dx1)
  const cy1 = f32(c.y + dy1)
  const cx2 = f32(cx1 + dx2)
  const cy2 = f32(cy1 + dy2)
  c.x = f32(cx2 + dx3)
  c.y = f32(cy2 + dy3)
  csV(c, VCUBIC, toInt(c.x), toInt(c.y), toInt(cx1), toInt(cy1), toInt(cx2), toInt(cy2))
}

function getSubr(idx: Buf, n: number): Buf {
  const count = cffIndexCount(idx)
  let bias = 107
  if (count >= 33900) bias = 32768
  else if (count >= 1240) bias = 1131
  const index = n + bias
  if (index < 0 || index >= count) return emptyBuf(idx.data)
  return cffIndexGet(idx, index)
}

function cidGlyphSubrs(info: StbFont, glyph: number): Buf {
  const fdselect = { ...info.fdselect }
  seek(fdselect, 0)
  const fmt = get8(fdselect)
  let fdselector = -1
  if (fmt === 0) {
    skip(fdselect, glyph)
    fdselector = get8(fdselect)
  } else if (fmt === 3) {
    const nranges = getN(fdselect, 2)
    let start = getN(fdselect, 2)
    for (let i = 0; i < nranges; i++) {
      const v = get8(fdselect)
      const end = getN(fdselect, 2)
      if (glyph >= start && glyph < end) {
        fdselector = v
        break
      }
      start = end
    }
  }
  if (fdselector === -1) return emptyBuf(info.data)
  return getSubrs(info.cff, cffIndexGet(info.fontdicts, fdselector))
}

/** `stbtt__run_charstring`: Type 2 charstrings, hinting ignored like stb. */
function runCharstring(info: StbFont, glyph: number, c: CsCtx): boolean {
  let inHeader = true
  let maskbits = 0
  let sp = 0
  let hasSubrs = false
  const s = new Float32Array(48)
  const subrStack: Buf[] = []
  let subrs = info.subrs
  let b = cffIndexGet(info.charstrings, glyph)
  while (b.cursor < b.size) {
    let i = 0
    let clearStack = true
    const b0 = get8(b)
    switch (b0) {
      case 0x13:
      case 0x14:
        if (inHeader) maskbits += sp >> 1
        inHeader = false
        skip(b, (maskbits + 7) >> 3)
        break
      case 0x01:
      case 0x03:
      case 0x12:
      case 0x17:
        maskbits += sp >> 1
        break
      case 0x15:
        inHeader = false
        if (sp < 2) return false
        csMove(c, s[sp - 2]!, s[sp - 1]!)
        break
      case 0x04:
        inHeader = false
        if (sp < 1) return false
        csMove(c, 0, s[sp - 1]!)
        break
      case 0x16:
        inHeader = false
        if (sp < 1) return false
        csMove(c, s[sp - 1]!, 0)
        break
      case 0x05:
        if (sp < 2) return false
        for (; i + 1 < sp; i += 2) csLine(c, s[i]!, s[i + 1]!)
        break
      case 0x06:
      case 0x07: {
        if (sp < 1) return false
        let vertical = b0 === 0x07
        while (i < sp) {
          if (vertical) csLine(c, 0, s[i]!)
          else csLine(c, s[i]!, 0)
          i++
          vertical = !vertical
        }
        break
      }
      case 0x1e:
      case 0x1f: {
        if (sp < 4) return false
        let horizontalFirst = b0 === 0x1f
        while (i + 3 < sp) {
          const last = sp - i === 5 ? s[i + 4]! : 0
          if (horizontalFirst) csCurve(c, s[i]!, 0, s[i + 1]!, s[i + 2]!, last, s[i + 3]!)
          else csCurve(c, 0, s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!, last)
          i += 4
          horizontalFirst = !horizontalFirst
        }
        break
      }
      case 0x08:
        if (sp < 6) return false
        for (; i + 5 < sp; i += 6)
          csCurve(c, s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!, s[i + 4]!, s[i + 5]!)
        break
      case 0x18:
        if (sp < 8) return false
        for (; i + 5 < sp - 2; i += 6)
          csCurve(c, s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!, s[i + 4]!, s[i + 5]!)
        if (i + 1 >= sp) return false
        csLine(c, s[i]!, s[i + 1]!)
        break
      case 0x19:
        if (sp < 8) return false
        for (; i + 1 < sp - 6; i += 2) csLine(c, s[i]!, s[i + 1]!)
        if (i + 5 >= sp) return false
        csCurve(c, s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!, s[i + 4]!, s[i + 5]!)
        break
      case 0x1a:
      case 0x1b: {
        if (sp < 4) return false
        let f = 0
        if (sp & 1) {
          f = s[i]!
          i++
        }
        for (; i + 3 < sp; i += 4) {
          if (b0 === 0x1b) csCurve(c, s[i]!, f, s[i + 1]!, s[i + 2]!, s[i + 3]!, 0)
          else csCurve(c, f, s[i]!, s[i + 1]!, s[i + 2]!, 0, s[i + 3]!)
          f = 0
        }
        break
      }
      case 0x0a:
      case 0x1d: {
        if (b0 === 0x0a && !hasSubrs) {
          if (info.fdselect.size) subrs = cidGlyphSubrs(info, glyph)
          hasSubrs = true
        }
        if (sp < 1) return false
        const v = toInt(s[--sp]!)
        if (subrStack.length >= 10) return false
        subrStack.push(b)
        b = getSubr(b0 === 0x0a ? subrs : info.gsubrs, v)
        if (b.size === 0) return false
        b.cursor = 0
        clearStack = false
        break
      }
      case 0x0b: {
        const back = subrStack.pop()
        if (!back) return false
        b = back
        clearStack = false
        break
      }
      case 0x0e:
        csClose(c)
        return true
      case 0x0c: {
        const b1 = get8(b)
        if (b1 === 0x22) {
          if (sp < 7) return false
          csCurve(c, s[0]!, 0, s[1]!, s[2]!, s[3]!, 0)
          csCurve(c, s[4]!, 0, s[5]!, f32(-s[2]!), s[6]!, 0)
        } else if (b1 === 0x23) {
          if (sp < 13) return false
          csCurve(c, s[0]!, s[1]!, s[2]!, s[3]!, s[4]!, s[5]!)
          csCurve(c, s[6]!, s[7]!, s[8]!, s[9]!, s[10]!, s[11]!)
        } else if (b1 === 0x24) {
          if (sp < 9) return false
          csCurve(c, s[0]!, s[1]!, s[2]!, s[3]!, s[4]!, 0)
          csCurve(c, s[5]!, 0, s[6]!, s[7]!, s[8]!, f32(-f32(f32(s[1]! + s[3]!) + s[7]!)))
        } else if (b1 === 0x25) {
          if (sp < 11) return false
          const dx = f32(f32(f32(f32(s[0]! + s[2]!) + s[4]!) + s[6]!) + s[8]!)
          const dy = f32(f32(f32(f32(s[1]! + s[3]!) + s[5]!) + s[7]!) + s[9]!)
          let dx6 = s[10]!
          let dy6 = s[10]!
          if (Math.abs(dx) > Math.abs(dy)) dy6 = f32(-dy)
          else dx6 = f32(-dx)
          csCurve(c, s[0]!, s[1]!, s[2]!, s[3]!, s[4]!, s[5]!)
          csCurve(c, s[6]!, s[7]!, s[8]!, s[9]!, dx6, dy6)
        } else return false
        break
      }
      default: {
        if (b0 !== 255 && b0 !== 28 && b0 < 32) return false
        let f: number
        if (b0 === 255) f = f32((getN(b, 4) | 0) / 0x10000)
        else {
          skip(b, -1)
          f = short(cffInt(b))
        }
        if (sp >= 48) return false
        s[sp++] = f
        clearStack = false
      }
    }
    if (clearStack) sp = 0
  }
  return false
}

function glyphShape(info: StbFont, glyph: number, depth = 0): Vertex[] {
  if (!info.cff.size) return glyphShapeTT(info, glyph, depth)
  const count = newCtx(true)
  if (!runCharstring(info, glyph, count)) return []
  const output = newCtx(false)
  return runCharstring(info, glyph, output) ? output.vertices : []
}

function glyphBox(info: StbFont, glyph: number): [number, number, number, number] | null {
  if (info.cff.size) {
    const c = newCtx(true)
    const ok = runCharstring(info, glyph, c)
    return ok ? [c.minX, c.minY, c.maxX, c.maxY] : [0, 0, 0, 0]
  }
  const g = glyfOffset(info, glyph)
  if (g < 0) return null
  return [
    s16(info.data, g + 2),
    s16(info.data, g + 4),
    s16(info.data, g + 6),
    s16(info.data, g + 8),
  ]
}

/** `stbtt_GetGlyphBitmapBoxSubpixel` with no shift. */
export function glyphBitmapBox(info: StbFont, glyph: number, scale: number) {
  const box = glyphBox(info, glyph)
  if (!box) return { x0: 0, y0: 0, x1: 0, y1: 0 }
  const [x0, y0, x1, y1] = box
  return {
    x0: Math.floor(f32(x0 * scale)),
    y0: Math.floor(f32(-y1 * scale)),
    x1: Math.ceil(f32(x1 * scale)),
    y1: Math.ceil(f32(-y0 * scale)),
  }
}

// ---------------------------------------------------------------------------------------
// Flattening and the v2 rasterizer

function tesselateCurve(
  points: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  flatSq: number,
  n: number,
) {
  const mx = f32(f32(f32(x0 + f32(2 * x1)) + x2) / 4)
  const my = f32(f32(f32(y0 + f32(2 * y1)) + y2) / 4)
  const dx = f32(f32(f32(x0 + x2) / 2) - mx)
  const dy = f32(f32(f32(y0 + y2) / 2) - my)
  if (n > 16) return
  if (f32(f32(dx * dx) + f32(dy * dy)) > flatSq) {
    tesselateCurve(
      points,
      x0,
      y0,
      f32(f32(x0 + x1) / 2),
      f32(f32(y0 + y1) / 2),
      mx,
      my,
      flatSq,
      n + 1,
    )
    tesselateCurve(
      points,
      mx,
      my,
      f32(f32(x1 + x2) / 2),
      f32(f32(y1 + y2) / 2),
      x2,
      y2,
      flatSq,
      n + 1,
    )
  } else points.push(x2, y2)
}

function tesselateCubic(
  points: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  flatSq: number,
  n: number,
) {
  const dx0 = f32(x1 - x0)
  const dy0 = f32(y1 - y0)
  const dx1 = f32(x2 - x1)
  const dy1 = f32(y2 - y1)
  const dx2 = f32(x3 - x2)
  const dy2 = f32(y3 - y2)
  const dx = f32(x3 - x0)
  const dy = f32(y3 - y0)
  const longlen = f32(
    Math.sqrt(f32(f32(dx0 * dx0) + f32(dy0 * dy0))) +
      Math.sqrt(f32(f32(dx1 * dx1) + f32(dy1 * dy1))) +
      Math.sqrt(f32(f32(dx2 * dx2) + f32(dy2 * dy2))),
  )
  const shortlen = f32(Math.sqrt(f32(f32(dx * dx) + f32(dy * dy))))
  const flatness = f32(f32(longlen * longlen) - f32(shortlen * shortlen))
  if (n > 16) return
  if (flatness > flatSq) {
    const x01 = f32(f32(x0 + x1) / 2)
    const y01 = f32(f32(y0 + y1) / 2)
    const x12 = f32(f32(x1 + x2) / 2)
    const y12 = f32(f32(y1 + y2) / 2)
    const x23 = f32(f32(x2 + x3) / 2)
    const y23 = f32(f32(y2 + y3) / 2)
    const xa = f32(f32(x01 + x12) / 2)
    const ya = f32(f32(y01 + y12) / 2)
    const xb = f32(f32(x12 + x23) / 2)
    const yb = f32(f32(y12 + y23) / 2)
    const mx = f32(f32(xa + xb) / 2)
    const my = f32(f32(ya + yb) / 2)
    tesselateCubic(points, x0, y0, x01, y01, xa, ya, mx, my, flatSq, n + 1)
    tesselateCubic(points, mx, my, xb, yb, x23, y23, x3, y3, flatSq, n + 1)
  } else points.push(x3, y3)
}

function flattenCurves(vertices: readonly Vertex[], flatness: number) {
  const flatSq = f32(flatness * flatness)
  const contours: number[][] = []
  let points: number[] = []
  let x = 0
  let y = 0
  for (const v of vertices) {
    if (v.type === VMOVE) {
      points = []
      contours.push(points)
      x = v.x
      y = v.y
      points.push(x, y)
    } else if (!points) continue
    else if (v.type === VLINE) {
      x = v.x
      y = v.y
      points.push(x, y)
    } else if (v.type === VCURVE) {
      tesselateCurve(points, x, y, v.cx, v.cy, v.x, v.y, flatSq, 0)
      x = v.x
      y = v.y
    } else if (v.type === VCUBIC) {
      tesselateCubic(points, x, y, v.cx, v.cy, v.cx1, v.cy1, v.x, v.y, flatSq, 0)
      x = v.x
      y = v.y
    }
  }
  return contours
}

interface Edge {
  x0: number
  y0: number
  x1: number
  y1: number
  invert: boolean
}

const before = (a: Edge, b: Edge) => a.y0 < b.y0

function sortEdgesInsertion(p: Edge[], start: number, n: number) {
  for (let i = 1; i < n; i++) {
    const t = p[start + i]!
    let j = i
    while (j > 0) {
      if (!before(t, p[start + j - 1]!)) break
      p[start + j] = p[start + j - 1]!
      j--
    }
    if (i !== j) p[start + j] = t
  }
}

function sortEdgesQuick(p: Edge[], start: number, count: number) {
  let base = start
  let n = count
  const swap = (a: number, b: number) => {
    const t = p[a]!
    p[a] = p[b]!
    p[b] = t
  }
  while (n > 12) {
    const m = n >> 1
    const c01 = before(p[base]!, p[base + m]!)
    const c12 = before(p[base + m]!, p[base + n - 1]!)
    if (c01 !== c12) {
      const c = before(p[base]!, p[base + n - 1]!)
      const z = c === c12 ? 0 : n - 1
      swap(base + z, base + m)
    }
    swap(base, base + m)
    let i = 1
    let j = n - 1
    for (;;) {
      while (before(p[base + i]!, p[base]!)) i++
      while (before(p[base]!, p[base + j]!)) j--
      if (i >= j) break
      swap(base + i, base + j)
      i++
      j--
    }
    if (j < n - i) {
      sortEdgesQuick(p, base, j)
      base += i
      n -= i
    } else {
      sortEdgesQuick(p, base + i, n - i)
      n = j
    }
  }
}

interface Active {
  fx: number
  fdx: number
  fdy: number
  direction: number
  sy: number
  ey: number
}

function newActive(e: Edge, offX: number, startPoint: number): Active {
  const dxdy = f32(f32(e.x1 - e.x0) / f32(e.y1 - e.y0))
  return {
    fdx: dxdy,
    fdy: dxdy !== 0 ? f32(1 / dxdy) : 0,
    fx: f32(f32(e.x0 + f32(dxdy * f32(startPoint - e.y0))) - offX),
    direction: e.invert ? 1 : -1,
    sy: e.y0,
    ey: e.y1,
  }
}

function handleClippedEdge(
  scanline: Float32Array,
  index: number,
  x: number,
  e: Active,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  if (y0 === y1) return
  if (y0 > e.ey) return
  if (y1 < e.sy) return
  if (y0 < e.sy) {
    x0 = f32(x0 + f32(f32(f32(x1 - x0) * f32(e.sy - y0)) / f32(y1 - y0)))
    y0 = e.sy
  }
  if (y1 > e.ey) {
    x1 = f32(x1 + f32(f32(f32(x1 - x0) * f32(e.ey - y1)) / f32(y1 - y0)))
    y1 = e.ey
  }
  if (x0 <= x && x1 <= x) scanline[index] = f32(scanline[index]! + f32(e.direction * f32(y1 - y0)))
  else if (x0 >= x + 1 && x1 >= x + 1) {
    // nothing
  } else {
    const coverage = f32(1 - f32(f32(f32(x0 - x) + f32(x1 - x)) / 2))
    scanline[index] = f32(scanline[index]! + f32(f32(e.direction * f32(y1 - y0)) * coverage))
  }
}

const trapezoid = (height: number, tx0: number, tx1: number, bx0: number, bx1: number) =>
  f32(f32(f32(f32(tx1 - tx0) + f32(bx1 - bx0)) / 2) * height)

/** `stbtt__fill_active_edges_new`; `fill` is stb's `scanline2` (its `scanline_fill - 1`). */
function fillActiveEdges(
  scanline: Float32Array,
  fill: Float32Array,
  len: number,
  active: Active[],
  yTop: number,
) {
  const yBottom = f32(yTop + 1)
  for (const e of active) {
    if (e.fdx === 0) {
      const x0 = e.fx
      if (x0 < len) {
        if (x0 >= 0) {
          handleClippedEdge(scanline, Math.trunc(x0), Math.trunc(x0), e, x0, yTop, x0, yBottom)
          handleClippedEdge(fill, Math.trunc(x0) + 1, Math.trunc(x0) + 1, e, x0, yTop, x0, yBottom)
        } else handleClippedEdge(fill, 0, 0, e, x0, yTop, x0, yBottom)
      }
      continue
    }
    let x0 = e.fx
    let dx = e.fdx
    let xb = f32(x0 + dx)
    let dy = e.fdy
    let xTop: number
    let xBottom: number
    let sy0: number
    let sy1: number
    if (e.sy > yTop) {
      xTop = f32(x0 + f32(dx * f32(e.sy - yTop)))
      sy0 = e.sy
    } else {
      xTop = x0
      sy0 = yTop
    }
    if (e.ey < yBottom) {
      xBottom = f32(x0 + f32(dx * f32(e.ey - yTop)))
      sy1 = e.ey
    } else {
      xBottom = xb
      sy1 = yBottom
    }
    if (xTop >= 0 && xBottom >= 0 && xTop < len && xBottom < len) {
      if (Math.trunc(xTop) === Math.trunc(xBottom)) {
        const x = Math.trunc(xTop)
        const height = f32(f32(sy1 - sy0) * e.direction)
        scanline[x] = f32(scanline[x]! + trapezoid(height, xTop, f32(x + 1), xBottom, f32(x + 1)))
        fill[x + 1] = f32(fill[x + 1]! + height)
      } else {
        if (xTop > xBottom) {
          sy0 = f32(yBottom - f32(sy0 - yTop))
          sy1 = f32(yBottom - f32(sy1 - yTop))
          let t = sy0
          sy0 = sy1
          sy1 = t
          t = xBottom
          xBottom = xTop
          xTop = t
          dx = f32(-dx)
          dy = f32(-dy)
          t = x0
          x0 = xb
          xb = t
        }
        const x1 = Math.trunc(xTop)
        const x2 = Math.trunc(xBottom)
        let yCrossing = f32(yTop + f32(dy * f32(x1 + 1 - x0)))
        let yFinal = f32(yTop + f32(dy * f32(x2 - x0)))
        if (yCrossing > yBottom) yCrossing = yBottom
        const sign = e.direction
        let area = f32(sign * f32(yCrossing - sy0))
        scanline[x1] = f32(scanline[x1]! + f32(f32(area * f32(x1 + 1 - xTop)) / 2))
        if (yFinal > yBottom) {
          yFinal = yBottom
          dy = f32(f32(yFinal - yCrossing) / (x2 - (x1 + 1)))
        }
        const step = f32(f32(sign * dy) * 1)
        for (let x = x1 + 1; x < x2; ++x) {
          scanline[x] = f32(scanline[x]! + f32(area + f32(step / 2)))
          area = f32(area + step)
        }
        scanline[x2] = f32(
          scanline[x2]! +
            f32(
              area +
                f32(sign * trapezoid(f32(sy1 - yFinal), x2, f32(x2 + 1), xBottom, f32(x2 + 1))),
            ),
        )
        fill[x2 + 1] = f32(fill[x2 + 1]! + f32(sign * f32(sy1 - sy0)))
      }
    } else {
      for (let x = 0; x < len; ++x) {
        const y0 = yTop
        const x1 = x
        const x2 = x + 1
        const x3 = xb
        const y3 = yBottom
        const y1 = f32(f32(f32(x - x0) / dx) + yTop)
        const y2 = f32(f32(f32(x + 1 - x0) / dx) + yTop)
        if (x0 < x1 && x3 > x2) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x1, y1)
          handleClippedEdge(scanline, x, x, e, x1, y1, x2, y2)
          handleClippedEdge(scanline, x, x, e, x2, y2, x3, y3)
        } else if (x3 < x1 && x0 > x2) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x2, y2)
          handleClippedEdge(scanline, x, x, e, x2, y2, x1, y1)
          handleClippedEdge(scanline, x, x, e, x1, y1, x3, y3)
        } else if (x0 < x1 && x3 > x1) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x1, y1)
          handleClippedEdge(scanline, x, x, e, x1, y1, x3, y3)
        } else if (x3 < x1 && x0 > x1) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x1, y1)
          handleClippedEdge(scanline, x, x, e, x1, y1, x3, y3)
        } else if (x0 < x2 && x3 > x2) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x2, y2)
          handleClippedEdge(scanline, x, x, e, x2, y2, x3, y3)
        } else if (x3 < x2 && x0 > x2) {
          handleClippedEdge(scanline, x, x, e, x0, y0, x2, y2)
          handleClippedEdge(scanline, x, x, e, x2, y2, x3, y3)
        } else handleClippedEdge(scanline, x, x, e, x0, y0, x3, y3)
      }
    }
  }
}

function rasterizeSortedEdges(
  pixels: Uint8Array,
  w: number,
  h: number,
  edges: Edge[],
  offX: number,
  offY: number,
) {
  const scanline = new Float32Array(w)
  const fill = new Float32Array(w + 1)
  // The C code keeps a singly-linked list with new edges inserted at the FRONT; the
  // order matters because the coverage sums are float32.
  let active: Active[] = []
  let y = offY
  let next = 0
  for (let j = 0; j < h; j++) {
    const scanYTop = f32(y)
    const scanYBottom = f32(y + 1)
    scanline.fill(0)
    fill.fill(0)
    active = active.filter((z) => z.ey > scanYTop)
    while (next < edges.length && edges[next]!.y0 <= scanYBottom) {
      const e = edges[next]!
      if (e.y0 !== e.y1) {
        const z = newActive(e, offX, scanYTop)
        if (j === 0 && offY !== 0 && z.ey < scanYTop) z.ey = scanYTop
        active.unshift(z)
      }
      next++
    }
    if (active.length) fillActiveEdges(scanline, fill, w, active, scanYTop)
    let sum = 0
    for (let i = 0; i < w; i++) {
      sum = f32(sum + fill[i]!)
      let k = f32(scanline[i]! + sum)
      k = f32(f32(Math.abs(k) * 255) + 0.5)
      const m = Math.trunc(k)
      pixels[j * w + i] = m > 255 ? 255 : m
    }
    for (const z of active) z.fx = f32(z.fx + z.fdx)
    y++
  }
}

function rasterize(
  pixels: Uint8Array,
  w: number,
  h: number,
  contours: readonly number[][],
  scaleX: number,
  scaleY: number,
  offX: number,
  offY: number,
) {
  const yScaleInv = f32(-scaleY)
  const edges: Edge[] = []
  for (const p of contours) {
    const count = p.length / 2
    let j = count - 1
    for (let k = 0; k < count; j = k++) {
      if (p[j * 2 + 1] === p[k * 2 + 1]) continue
      let a = k
      let b = j
      let invert = false
      if (p[j * 2 + 1]! > p[k * 2 + 1]!) {
        invert = true
        a = j
        b = k
      }
      edges.push({
        invert,
        x0: f32(p[a * 2]! * scaleX),
        y0: f32(p[a * 2 + 1]! * yScaleInv),
        x1: f32(p[b * 2]! * scaleX),
        y1: f32(p[b * 2 + 1]! * yScaleInv),
      })
    }
  }
  sortEdgesQuick(edges, 0, edges.length)
  sortEdgesInsertion(edges, 0, edges.length)
  rasterizeSortedEdges(pixels, w, h, edges, offX, offY)
}

export interface GlyphBitmap {
  /** Coverage 0..255, row-major, `width × height`. */
  pixels: Uint8Array
  width: number
  height: number
  /** `stbtt_GetCodepointBitmap` xoff/yoff: the bitmap's top-left relative to the pen. */
  xoff: number
  yoff: number
}

/** `stbtt_GetGlyphBitmap(info, scale, scale, glyph)`; `null` for an empty glyph (space). */
export function glyphBitmap(info: StbFont, glyph: number, scale: number): GlyphBitmap | null {
  const vertices = glyphShape(info, glyph)
  const box = glyphBitmapBox(info, glyph, scale)
  const width = box.x1 - box.x0
  const height = box.y1 - box.y0
  if (!width || !height) return null
  const pixels = new Uint8Array(width * height)
  const contours = flattenCurves(vertices, f32(0.35 / scale))
  if (contours.length) rasterize(pixels, width, height, contours, scale, scale, box.x0, box.y0)
  return { pixels, width, height, xoff: box.x0, yoff: box.y0 }
}
