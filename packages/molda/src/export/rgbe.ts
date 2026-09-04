/**
 * Escritor RGBE (Radiance `.hdr`) próprio e puro. Cabeçalho `#?RADIANCE`
 * (os 10 primeiros bytes são o que o Estúdio confere), `FORMAT=32-bit_rle_rgbe`,
 * resolução `-Y h +X w` (de cima para baixo). Float → rgbe com expoente
 * compartilhado; scanlines no formato NOVO com RLE adaptativa por canal
 * (exatamente o que o `RGBE_ReadPixels_RLE` do `HDRLoader` espera); larguras
 * fora de [8, 32767] saem planas.
 */

/** Um pixel float → 4 bytes rgbe (mantissa compartilhada, expoente + 128). */
export function floatToRgbe(
  r: number,
  g: number,
  b: number,
  out: Uint8Array,
  offset: number,
): void {
  const v = Math.max(r, g, b)
  if (!(v > 1e-32) || !Number.isFinite(v)) {
    out[offset] = 0
    out[offset + 1] = 0
    out[offset + 2] = 0
    out[offset + 3] = 0
    return
  }
  let e = Math.floor(Math.log2(v)) + 1
  let m = v / 2 ** e
  if (m >= 1) {
    e += 1
    m /= 2
  } else if (m < 0.5) {
    e -= 1
    m *= 2
  }
  const scale = 256 / 2 ** e
  out[offset] = Math.min(255, Math.floor(Math.max(r, 0) * scale))
  out[offset + 1] = Math.min(255, Math.floor(Math.max(g, 0) * scale))
  out[offset + 2] = Math.min(255, Math.floor(Math.max(b, 0) * scale))
  out[offset + 3] = e + 128
}

const MIN_RUN = 4

/** RLE adaptativa de UM canal (algoritmo do Radiance), em `out`. */
export function encodeRleChannel(data: Uint8Array, out: number[]): void {
  const width = data.length
  let cur = 0
  while (cur < width) {
    let begRun = cur
    let runCount = 0
    let oldRunCount = 0
    while (runCount < MIN_RUN && begRun < width) {
      begRun += runCount
      oldRunCount = runCount
      runCount = 1
      while (
        begRun + runCount < width &&
        runCount < 127 &&
        data[begRun] === data[begRun + runCount]
      ) {
        runCount += 1
      }
    }
    // Um trecho repetido curto logo antes de um trecho longo sai como run também.
    if (oldRunCount > 1 && oldRunCount === begRun - cur) {
      out.push(128 + oldRunCount, data[cur] as number)
      cur = begRun
    }
    while (cur < begRun) {
      const literal = Math.min(128, begRun - cur)
      out.push(literal)
      for (let i = 0; i < literal; i += 1) out.push(data[cur + i] as number)
      cur += literal
    }
    if (runCount >= MIN_RUN) {
      out.push(128 + runCount, data[begRun] as number)
      cur += runCount
    }
  }
}

export function rgbeHeader(width: number, height: number): string {
  return `#?RADIANCE\n# Molda\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`
}

/** RGB float linear (3 por pixel, linha 0 em cima) → arquivo `.hdr` completo. */
export function encodeRgbe(rgb: Float32Array, width: number, height: number): Uint8Array {
  if (rgb.length !== width * height * 3) throw new Error('encodeRgbe: tamanho do RGB não bate')
  const header = new TextEncoder().encode(rgbeHeader(width, height))
  const body: number[] = []
  const line = new Uint8Array(width * 4)
  const channel = new Uint8Array(width)
  const useRle = width >= 8 && width <= 32767
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3
      floatToRgbe(rgb[i] as number, rgb[i + 1] as number, rgb[i + 2] as number, line, x * 4)
    }
    if (!useRle) {
      for (let i = 0; i < line.length; i += 1) body.push(line[i] as number)
      continue
    }
    body.push(2, 2, (width >> 8) & 0xff, width & 0xff)
    for (let c = 0; c < 4; c += 1) {
      for (let x = 0; x < width; x += 1) channel[x] = line[x * 4 + c] as number
      encodeRleChannel(channel, body)
    }
  }
  const out = new Uint8Array(header.length + body.length)
  out.set(header)
  out.set(body, header.length)
  return out
}
