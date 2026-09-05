import { describe, expect, test } from 'bun:test'
import { FloatType } from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { MOLDA_LIMITS } from '../core/limits'
import { skyPreset } from '../sky/params'
import { renderSky } from '../sky/render'
import { makeSky } from '../testing/fixtures'
import { decodeRgbe } from '../testing/rgbeDecode'
import { encodeRgbe, encodeRleChannel, floatToRgbe, rgbeHeader } from './rgbe'
import { exportSkyHdr } from './skyHdr'

/** A MESMA assinatura que o Estúdio confere (`isRadianceHdr`). */
function isRadianceHdr(bytes: Uint8Array): boolean {
  const sig = [0x23, 0x3f, 0x52, 0x41, 0x44, 0x49, 0x41, 0x4e, 0x43, 0x45]
  return sig.every((value, i) => bytes[i] === value)
}

function expectClose(actual: Float32Array, expected: Float32Array): void {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < expected.length; i += 3) {
    const max = Math.max(
      expected[i] as number,
      expected[i + 1] as number,
      expected[i + 2] as number,
    )
    const tolerance = Math.max(max / 128, 1e-6)
    for (let k = 0; k < 3; k += 1) {
      expect(Math.abs((actual[i + k] as number) - (expected[i + k] as number))).toBeLessThanOrEqual(
        tolerance,
      )
    }
  }
}

function gradient(width: number, height: number): Float32Array {
  const rgb = new Float32Array(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3
      rgb[i] = (x / width) * 3
      rgb[i + 1] = (y / height) * 0.5
      rgb[i + 2] = x % 7 === 0 ? 40 : 0.02
    }
  }
  return rgb
}

describe('RGBE', () => {
  test('floatToRgbe: expoente compartilhado, zero e valores grandes', () => {
    const out = new Uint8Array(4)
    floatToRgbe(0, 0, 0, out, 0)
    expect(Array.from(out)).toEqual([0, 0, 0, 0])
    floatToRgbe(1, 0.5, 0.25, out, 0)
    expect(out[3]).toBe(129)
    expect(out[0]).toBe(128)
    expect(out[1]).toBe(64)
    expect(out[2]).toBe(32)
    floatToRgbe(40, 1, 0, out, 0)
    expect(out[3]).toBe(128 + 6)
    expect(out[0]).toBe(160)
  })

  test('RLE por canal: runs de 4, 127 e 200, e 128 literais, decodificam de volta', () => {
    const cases = [
      Uint8Array.from([5, 5, 5, 5, 1, 2, 3]),
      new Uint8Array(127).fill(9),
      new Uint8Array(200).fill(3),
      Uint8Array.from({ length: 128 }, (_, i) => i),
      Uint8Array.from({ length: 300 }, (_, i) => (i % 3 === 0 ? 7 : i)),
      Uint8Array.from([1, 1, 2, 2, 3, 3, 3, 3, 3, 4, 4]),
    ]
    for (const data of cases) {
      const out: number[] = []
      encodeRleChannel(data, out)
      const decoded: number[] = []
      let pos = 0
      while (decoded.length < data.length) {
        const count = out[pos] as number
        pos += 1
        if (count > 128) {
          for (let i = 0; i < count - 128; i += 1) decoded.push(out[pos] as number)
          pos += 1
        } else {
          for (let i = 0; i < count; i += 1) decoded.push(out[pos + i] as number)
          pos += count
        }
      }
      expect(pos).toBe(out.length)
      expect(Uint8Array.from(decoded)).toEqual(data)
    }
  })

  test('o cabeçalho começa com #?RADIANCE nos 10 primeiros bytes e diz -Y h +X w', () => {
    const bytes = encodeRgbe(gradient(16, 4), 16, 4)
    expect(isRadianceHdr(bytes)).toBe(true)
    expect(rgbeHeader(16, 4)).toContain('FORMAT=32-bit_rle_rgbe')
    expect(rgbeHeader(16, 4).endsWith('-Y 4 +X 16\n')).toBe(true)
  })

  test('round-trip pelo decodificador próprio e pelo HDRLoader do three (larguras 4, 8, 1024)', () => {
    for (const [width, height] of [
      [4, 3],
      [8, 4],
      [1024, 8],
    ] as const) {
      const rgb = gradient(width, height)
      const bytes = encodeRgbe(rgb, width, height)
      const ours = decodeRgbe(bytes)
      expect(ours.width).toBe(width)
      expect(ours.height).toBe(height)
      expectClose(ours.rgb, rgb)
      const loader = new HDRLoader()
      loader.setDataType(FloatType)
      const parsed = loader.parse(new Uint8Array(bytes).buffer as ArrayBuffer)
      expect(parsed.width).toBe(width)
      expect(parsed.height).toBe(height)
      const data = parsed.data as Float32Array
      // O HDRLoader entrega RGBA na ordem do ARQUIVO (linha 0 em cima) e marca
      // `flipY = true` na textura: quem vira é o upload, não os dados.
      const theirs = new Float32Array(width * height * 3)
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          for (let k = 0; k < 3; k += 1) {
            theirs[(y * width + x) * 3 + k] = data[(y * width + x) * 4 + k] as number
          }
        }
      }
      expectClose(theirs, rgb)
    }
  })

  test('um céu real: nublado com estrelas em 1024×512 cabe no teto do Estúdio', () => {
    const sky = makeSky({ params: { ...skyPreset('nublado'), stars: 1, sunElevation: -20 } })
    const result = exportSkyHdr(sky)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.chars).toBeLessThanOrEqual(MOLDA_LIMITS.studioMax3DChars)
    expect(result.dataUrl.startsWith('data:image/vnd.radiance;base64,')).toBe(true)
    expect(isRadianceHdr(result.bytes)).toBe(true)
    const decoded = decodeRgbe(result.bytes)
    expect(decoded.width).toBe(1024)
    expect(decoded.height).toBe(512)
    const expected = renderSky(sky.params, 1024, 512)
    expectClose(decoded.rgb, expected.rgb)
    console.info(`[molda] céu 1024×512: ${result.bytes.length} bytes, ${result.chars} chars`)
  })
})
