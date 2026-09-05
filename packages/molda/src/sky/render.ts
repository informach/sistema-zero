/**
 * O render do CÉU na CPU, puro e determinístico: uma imagem equiretangular em
 * float linear (RGB), do zênite (linha 0) ao nadir. É a MESMA função para a
 * prévia (256×128) e para o export (1024×512): o que a criança vê é o que o
 * Estúdio recebe.
 *
 * Convenção de direção = a `equirectUv` do three (o `HDRLoader` + `flipY`
 * esperam a linha 0 em cima): `u` dá o azimute, `v` a elevação.
 *
 * Por pixel: gradiente topo/horizonte/chão em LINEAR (curva sRGB exata) ×
 * fator de dia (smoothstep na altura do sol) → disco solar com borda suave +
 * halo + névoa no horizonte (`sunIntensity` até 100: é o que faz o PMREM dar
 * reflexo de verdade) → nuvens por fbm projetado no domo → estrelas em células
 * FIXAS (as mesmas na prévia e no export) → × exposição.
 */
import { hexToRgb, srgbToLinear } from '../core/color'
import type { Vec3 } from '../core/model'
import { fbm, hash2 } from './noise'
import type { SkyParams } from './params'

export interface SkyImage {
  width: number
  height: number
  /** RGB linear, 3 floats por pixel, linha 0 = zênite. */
  rgb: Float32Array
}

export const SKY_PREVIEW_SIZE = { width: 256, height: 128 } as const
export const SKY_EXPORT_SIZE = { width: 1024, height: 512 } as const

/** Grade fixa das estrelas: independe da resolução da imagem. */
export const STAR_CELLS = { x: 256, y: 128 } as const

const DEG = Math.PI / 180
const STAR_SEED = 0x5a17

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

function linearRgb(hex: string): Vec3 {
  const [r, g, b] = hexToRgb(hex)
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Direção unitária do pixel (u em [0,1], v da IMAGEM em [0,1], 0 = topo). */
export function skyDirection(u: number, vImage: number): Vec3 {
  const elevation = (0.5 - vImage) * Math.PI
  const phi = (u - 0.5) * Math.PI * 2
  const cosEl = Math.cos(elevation)
  return [cosEl * Math.cos(phi), Math.sin(elevation), cosEl * Math.sin(phi)]
}

/** Direção do sol pela altura e pela direção (graus). */
export function sunDirection(params: Pick<SkyParams, 'sunElevation' | 'sunAzimuth'>): Vec3 {
  const el = params.sunElevation * DEG
  const az = params.sunAzimuth * DEG
  // A mesma convenção do domo: `phi` cresce de +x para +z.
  const phi = Math.PI / 2 - az
  return [Math.cos(el) * Math.cos(phi), Math.sin(el), Math.cos(el) * Math.sin(phi)]
}

/** Fator de dia: 0 à noite (sol abaixo de -12°), 1 de dia (acima de 12°). */
export function dayFactorOf(sunElevation: number): number {
  return smoothstep(-12, 12, sunElevation)
}

export function renderSky(params: SkyParams, width: number, height: number): SkyImage {
  const rgb = new Float32Array(width * height * 3)
  const top = linearRgb(params.topColor)
  const horizon = linearRgb(params.horizonColor)
  const ground = linearRgb(params.groundColor)
  const sun = sunDirection(params)
  const day = dayFactorOf(params.sunElevation)
  const night = 1 - day
  const dim = 0.55 + 0.45 * day
  const sunTint: Vec3 = [1, 0.96, 0.86]
  const sunSize = Math.max(params.sunSize, 0.25)
  const haloNarrow = sunSize * 2.5
  const haloWide = sunSize * 12
  const cloudAmount = params.clouds.amount
  const cloudSoft = params.clouds.softness
  const seed = params.clouds.seed >>> 0
  const starDensity = params.stars * 0.06
  const exposure = params.exposure

  for (let y = 0; y < height; y += 1) {
    const vImage = (y + 0.5) / height
    const elevation = (0.5 - vImage) * Math.PI
    const sinEl = Math.sin(elevation)
    const cosEl = Math.cos(elevation)
    let row: Vec3
    if (elevation >= 0) {
      const t = elevation / (Math.PI / 2)
      row = mix(horizon, top, t ** 0.55)
    } else {
      const t = -elevation / (Math.PI / 2)
      row = mix(horizon, ground, Math.min(t / 0.06, 1))
    }
    row = [row[0] * dim, row[1] * dim, row[2] * dim]
    const hazeWeight = Math.max(0, 1 - Math.abs(sinEl)) ** 10 * 0.12 * day
    const horizonFade = smoothstep(0, 0.12, sinEl)
    const yCell0 = Math.floor(vImage * STAR_CELLS.y - (0.5 / height) * STAR_CELLS.y)
    const yCell1 = Math.floor(vImage * STAR_CELLS.y + (0.5 / height) * STAR_CELLS.y - 1e-9)

    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width
      const phi = (u - 0.5) * Math.PI * 2
      const dx = cosEl * Math.cos(phi)
      const dz = cosEl * Math.sin(phi)
      let r = row[0]
      let g = row[1]
      let b = row[2]

      // Sol: disco + halo (HDR de verdade) + névoa.
      const cosA = Math.min(Math.max(dx * sun[0] + sinEl * sun[1] + dz * sun[2], -1), 1)
      const angle = Math.acos(cosA) / DEG
      const disc = 1 - smoothstep(sunSize * 0.75, sunSize * 1.1, angle)
      const halo = Math.exp(-angle / haloNarrow) * 0.35 + Math.exp(-angle / haloWide) * 0.08
      const sunAmount = params.sunIntensity * (disc + halo * 0.6)
      r += sunTint[0] * sunAmount
      g += sunTint[1] * sunAmount
      b += sunTint[2] * sunAmount
      if (hazeWeight > 0) {
        r += (horizon[0] * 0.5 + 0.5) * hazeWeight
        g += (horizon[1] * 0.5 + 0.5) * hazeWeight
        b += (horizon[2] * 0.5 + 0.5) * hazeWeight
      }

      // Nuvens: só acima do horizonte, projetadas no domo.
      if (cloudAmount > 0 && sinEl > 0.01) {
        const px = dx / (sinEl + 0.12)
        const pz = dz / (sinEl + 0.12)
        const n = fbm(px * 1.6 + 100, pz * 1.6 + 100, seed)
        const threshold = 1 - cloudAmount * 0.9
        const cover =
          smoothstep(threshold - 0.05, threshold + 0.05 + cloudSoft * 0.35, n) * horizonFade
        if (cover > 0) {
          const bright = (0.25 + 0.75 * day) * (0.85 + 0.25 * Math.max(0, cosA))
          const shade = smoothstep(0, 1, n)
          const cr = (0.55 + 0.45 * shade) * bright
          const cg = (0.58 + 0.42 * shade) * bright
          const cb = (0.65 + 0.35 * shade) * bright
          r += (cr - r) * cover
          g += (cg - g) * cover
          b += (cb - b) * cover
        }
      }

      // Estrelas: células fixas, só à noite e acima do horizonte.
      if (starDensity > 0 && night > 0 && sinEl > 0) {
        const xCell0 = Math.floor(u * STAR_CELLS.x - (0.5 / width) * STAR_CELLS.x)
        const xCell1 = Math.floor(u * STAR_CELLS.x + (0.5 / width) * STAR_CELLS.x - 1e-9)
        const x0 = x / width
        const x1 = (x + 1) / width
        const y0 = y / height
        const y1 = (y + 1) / height
        for (let cy = Math.max(0, yCell0); cy <= yCell1; cy += 1) {
          for (let cx = Math.max(0, xCell0); cx <= xCell1; cx += 1) {
            if (hash2(cx, cy, STAR_SEED) >= starDensity) continue
            const sx = (cx + hash2(cx, cy, 3)) / STAR_CELLS.x
            const sy = (cy + hash2(cx, cy, 5)) / STAR_CELLS.y
            if (sx < x0 || sx >= x1 || sy < y0 || sy >= y1) continue
            const brightness = (0.3 + 0.7 * hash2(cx, cy, 9)) * night * 1.5 * horizonFade
            r += 0.9 * brightness
            g += 0.95 * brightness
            b += brightness
          }
        }
      }

      const o = (y * width + x) * 3
      rgb[o] = Math.max(0, r * exposure)
      rgb[o + 1] = Math.max(0, g * exposure)
      rgb[o + 2] = Math.max(0, b * exposure)
    }
  }
  return { width, height, rgb }
}
