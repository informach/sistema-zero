/**
 * The Molda's 360° sky (.hdr) as a panorama PNG, for a Raylib 3D project: the desktop raylib
 * does not open .hdr (measured on raylib 6.0.1.0), and a game that only runs in the browser
 * would break on the child's computer. The pixels are the ones the Jogo 3D shows for the same
 * sky: linear light, cut at 1, encoded to sRGB. The game draws the PNG inside a big sphere.
 *
 * Pure (no canvas): the Radiance reader takes the flat scanlines and the adaptive RLE ones the
 * Molda writes, and the PNG is RGB 8-bit, filter None, zlib by fflate.
 */
import { zlibSync } from 'fflate'

const MAX_SIDE = 4096

export interface RadianceImage {
  width: number
  height: number
  /** Linear RGB, row 0 on top, three floats per pixel. */
  data: Float32Array
}

export function decodeRadiance(bytes: Uint8Array): RadianceImage {
  const signature = String.fromCharCode(...bytes.subarray(0, 10))
  if (!signature.startsWith('#?RADIANCE') && !signature.startsWith('#?RGBE'))
    throw new Error('O céu não é um arquivo .hdr do Molda.')
  let at = 0
  const line = () => {
    let text = ''
    while (at < bytes.length && bytes[at] !== 10) text += String.fromCharCode(bytes[at++]!)
    at++
    return text
  }
  let formatOk = false
  for (let header = line(); header !== ''; header = line()) {
    if (at >= bytes.length) throw new Error('O céu .hdr acabou no meio do cabeçalho.')
    if (header === 'FORMAT=32-bit_rle_rgbe') formatOk = true
  }
  if (!formatOk) throw new Error('O céu .hdr precisa estar no formato RGBE.')
  const size = /^-Y (\d+) \+X (\d+)$/.exec(line())
  if (!size) throw new Error('O céu .hdr tem uma orientação que o Estúdio não lê.')
  const height = Number(size[1])
  const width = Number(size[2])
  if (!width || !height || width > MAX_SIDE || height > MAX_SIDE)
    throw new Error(`O céu passa de ${MAX_SIDE} pixels de lado.`)
  const data = new Float32Array(width * height * 3)
  const scan = new Uint8Array(width * 4)
  for (let y = 0; y < height; y++) {
    const rle =
      width >= 8 &&
      width <= 32767 &&
      bytes[at] === 2 &&
      bytes[at + 1] === 2 &&
      ((bytes[at + 2]! << 8) | bytes[at + 3]!) === width
    if (rle) {
      at += 4
      for (let channel = 0; channel < 4; channel++) {
        let x = 0
        while (x < width) {
          if (at >= bytes.length) throw new Error('O céu .hdr acabou antes da hora.')
          let count = bytes[at++]!
          if (count > 128) {
            count -= 128
            const value = bytes[at++]!
            if (x + count > width) throw new Error('O céu .hdr está corrompido.')
            for (let i = 0; i < count; i++) scan[x++ * 4 + channel] = value
          } else {
            if (count === 0 || x + count > width || at + count > bytes.length)
              throw new Error('O céu .hdr está corrompido.')
            for (let i = 0; i < count; i++) scan[x++ * 4 + channel] = bytes[at++]!
          }
        }
      }
    } else {
      if (at + width * 4 > bytes.length) throw new Error('O céu .hdr acabou antes da hora.')
      scan.set(bytes.subarray(at, at + width * 4))
      at += width * 4
    }
    for (let x = 0; x < width; x++) {
      const e = scan[x * 4 + 3]!
      // The three.js HDRLoader's scale (what the Jogo 3D shows): 2^(e - 128) / 255.
      const f = e ? 2 ** (e - 128) / 255 : 0
      const out = (y * width + x) * 3
      data[out] = scan[x * 4]! * f
      data[out + 1] = scan[x * 4 + 1]! * f
      data[out + 2] = scan[x * 4 + 2]! * f
    }
  }
  return { width, height, data }
}

/** Linear light → 8-bit sRGB, cut at 1 (the Jogo 3D shows the sky with no tone mapping). */
function srgb(value: number) {
  const v = Math.min(Math.max(value, 0), 1)
  const encoded = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(encoded * 255)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(parts: readonly Uint8Array[]) {
  let c = 0xffffffff
  for (const part of parts) for (const byte of part) c = CRC_TABLE[(c ^ byte) & 255]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, body: Uint8Array) {
  const head = new Uint8Array(8)
  const view = new DataView(head.buffer)
  view.setUint32(0, body.length)
  const name = new TextEncoder().encode(type)
  head.set(name, 4)
  const tail = new Uint8Array(4)
  new DataView(tail.buffer).setUint32(0, crc32([name, body]))
  return [head, body, tail]
}

export function encodeRgbPng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array(height * (width * 3 + 1))
  for (let y = 0; y < height; y++)
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header.set([8, 2, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunk('IHDR', header),
    ...chunk('IDAT', zlibSync(raw, { level: 9 })),
    ...chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** The sky's .hdr data URL as a panorama PNG data URL. */
export function skyPanoramaPng(hdrDataUrl: string): {
  dataUrl: string
  width: number
  height: number
} {
  const comma = hdrDataUrl.indexOf(',')
  if (comma < 0) throw new Error('O céu não é um arquivo .hdr do Molda.')
  const binary = atob(hdrDataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const sky = decodeRadiance(bytes)
  const rgb = new Uint8Array(sky.width * sky.height * 3)
  for (let i = 0; i < rgb.length; i++) rgb[i] = srgb(sky.data[i]!)
  const png = encodeRgbPng(sky.width, sky.height, rgb)
  let text = ''
  for (let i = 0; i < png.length; i += 0x8000)
    text += String.fromCharCode(...png.subarray(i, i + 0x8000))
  return { dataUrl: `data:image/png;base64,${btoa(text)}`, width: sky.width, height: sky.height }
}
