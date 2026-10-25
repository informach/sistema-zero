/**
 * Assets embutidos nos exemplos do Jogo 3D Avançado, MONTADOS POR CÓDIGO (nenhum binário
 * colado aqui): o céu de foto e os dois sons da "Noite das Fogueiras". Os exemplos não podem
 * trazer arquivos pesados (a cota de assets é do projeto da criança), então cada um é
 * minúsculo e determinístico: o mesmo código dá os mesmos bytes, e o golden do catálogo
 * (`examplesLoading.test.ts`) fica estável.
 *
 * - `CEU_ESTRELADO_HDR`: um .hdr 64 × 32 (equirretangular, RLE do Radiance) com degradê
 *   de noite, uma lua forte (o "sol" que o motor tira da foto para a sombra) e estrelas.
 * - `MUSICA_DA_NOITE_WAV`: 2 s de música em laço (8-bit, 8 kHz): uma melodia pentatônica
 *   com um baixo, para tocar "sem parar".
 * - `SOM_DA_FOGUEIRA_WAV`: 0,5 s de fogo pegando (um sopro de ruído com estalos).
 */

// ---- Sorteio determinístico (os bytes não podem mudar de uma importação para outra) ----

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// ---- Céu de foto (.hdr Radiance) ----

const SKY_W = 64
const SKY_H = 32

/** Cor linear (0..∞) → RGBE de 4 bytes, como o `float2rgbe` do formato Radiance. */
function rgbe(r: number, g: number, b: number): [number, number, number, number] {
  const v = Math.max(r, g, b)
  if (v < 1e-32) return [0, 0, 0, 0]
  const e = Math.ceil(Math.log2(v) + 1e-9)
  const scale = 256 / 2 ** e
  const byte = (c: number) => Math.min(255, Math.max(0, Math.floor(c * scale)))
  return [byte(r), byte(g), byte(b), e + 128]
}

/** Um canal de uma linha no RLE do Radiance: corridas (>128) e trechos literais (≤128). */
function rleChannel(values: number[], out: number[]): void {
  let i = 0
  while (i < values.length) {
    let run = 1
    while (i + run < values.length && run < 127 && values[i + run] === values[i]) run++
    if (run >= 4) {
      out.push(128 + run, values[i] ?? 0)
      i += run
      continue
    }
    const start = i
    let count = 0
    while (i < values.length && count < 128) {
      let ahead = 1
      while (i + ahead < values.length && ahead < 4 && values[i + ahead] === values[i]) ahead++
      if (ahead >= 4) break
      i++
      count++
    }
    out.push(count, ...values.slice(start, start + count))
  }
}

function skyColor(row: number, col: number, stars: Set<number>): [number, number, number] {
  // row 0 = zênite, SKY_H/2 = horizonte, embaixo = chão escuro.
  const t = row / (SKY_H / 2)
  if (t > 1) return [0.02, 0.02, 0.035]
  const mix = (a: number, b: number) => a + (b - a) * t * t
  let r = mix(0.006, 0.09)
  let g = mix(0.01, 0.06)
  let b = mix(0.045, 0.2)
  // A lua: um disco forte (vira a luz direcional da foto) com um halo.
  const dx = Math.min(Math.abs(col - 40), SKY_W - Math.abs(col - 40))
  const dy = row - 8
  const d = Math.hypot(dx, dy)
  if (d <= 1.5) return [6, 6, 5.2]
  if (d < 5) {
    const glow = (5 - d) / 5
    r += 0.35 * glow
    g += 0.35 * glow
    b += 0.3 * glow
  }
  if (stars.has(row * SKY_W + col)) return [1.4, 1.4, 1.7]
  return [r, g, b]
}

function makeNightSkyHdr(): string {
  const random = seeded(2026)
  const stars = new Set<number>()
  while (stars.size < 48) {
    const row = Math.floor(random() * (SKY_H / 2 - 2))
    const col = Math.floor(random() * SKY_W)
    stars.add(row * SKY_W + col)
  }
  const out: number[] = [
    ...new TextEncoder().encode(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${SKY_H} +X ${SKY_W}\n`),
  ]
  for (let row = 0; row < SKY_H; row++) {
    const channels: number[][] = [[], [], [], []]
    for (let col = 0; col < SKY_W; col++) {
      const [r, g, b] = skyColor(row, col, stars)
      const pixel = rgbe(r, g, b)
      for (let c = 0; c < 4; c++) channels[c]?.push(pixel[c] ?? 0)
    }
    out.push(2, 2, SKY_W >> 8, SKY_W & 255)
    for (const channel of channels) rleChannel(channel, out)
  }
  return `data:image/vnd.radiance;base64,${toBase64(Uint8Array.from(out))}`
}

// ---- Sons (.wav PCM 8-bit, mono, 8 kHz) ----

const RATE = 8000

function wavDataUrl(samples: number[]): string {
  const bytes = new Uint8Array(44 + samples.length)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i)
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE, true) // bytes por segundo (1 byte por amostra)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  ascii(36, 'data')
  view.setUint32(40, samples.length, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    bytes[44 + i] = Math.round(128 + s * 127)
  }
  return `data:audio/wav;base64,${toBase64(bytes)}`
}

const triangle = (phase: number) => 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1

function makeNightMusicWav(): string {
  // Lá menor pentatônico, oito notas de 1/4 s: fecha o laço na mesma nota em que começa.
  const melody = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 329.63]
  const bass = [110, 110, 87.31, 87.31, 98, 98, 82.41, 82.41]
  const noteLen = RATE / 4
  const samples: number[] = []
  for (let n = 0; n < melody.length; n++) {
    for (let i = 0; i < noteLen; i++) {
      const t = (n * noteLen + i) / RATE
      const local = i / noteLen
      const envelope = Math.min(1, local * 12) * (1 - local) ** 1.5
      const lead = triangle(t * (melody[n] ?? 440)) * 0.32 * envelope
      const low = Math.sin(2 * Math.PI * t * (bass[n] ?? 110)) * 0.18
      samples.push(lead + low)
    }
  }
  return wavDataUrl(samples)
}

function makeCampfireWav(): string {
  const random = seeded(77)
  const length = RATE / 2
  const samples: number[] = []
  let smooth = 0
  for (let i = 0; i < length; i++) {
    const local = i / length
    // Sopro: ruído filtrado que sobe rápido e some devagar.
    smooth += (random() * 2 - 1 - smooth) * 0.25
    const whoosh = smooth * Math.min(1, local * 10) * (1 - local) * 0.7
    // Estalos: picos curtos de vez em quando.
    const crack = random() < 0.012 ? (random() * 2 - 1) * 0.9 : 0
    samples.push(whoosh + crack)
  }
  return wavDataUrl(samples)
}

export const CEU_ESTRELADO_HDR = makeNightSkyHdr()
export const MUSICA_DA_NOITE_WAV = makeNightMusicWav()
export const SOM_DA_FOGUEIRA_WAV = makeCampfireWav()
