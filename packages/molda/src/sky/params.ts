/**
 * Os PARÂMETROS do céu — o céu é só isto no disco; a imagem HDR nasce no
 * export (`sky/render.ts`). Presets com nomes de criança, ranges que o sanitize
 * e os sliders compartilham, e a regra "mexer em qualquer slider vira `custom`".
 */
import { normalizeHex } from '../core/color'
import { clampInt, clampNumber } from '../core/limits'

export const SKY_PRESET_IDS = ['dia', 'entardecer', 'noite', 'nublado', 'alienigena'] as const
export type SkyPresetId = (typeof SKY_PRESET_IDS)[number]
export type SkyPresetChoice = SkyPresetId | 'custom'

export interface SkyClouds {
  /** 0..1: quanto do céu as nuvens cobrem. */
  amount: number
  /** 0..1: bordas duras (0) ou esfumaçadas (1). */
  softness: number
  /** Semente inteira (uint32): "Sortear nuvens" troca só isto. */
  seed: number
}

export interface SkyParams {
  preset: SkyPresetChoice
  /** Altura do sol, em graus: -90 (embaixo do chão) .. 90 (a pino). */
  sunElevation: number
  /** Direção do sol, em graus, 0..360. */
  sunAzimuth: number
  /** Raio angular do disco, em graus. */
  sunSize: number
  /** Brilho do sol em unidades HDR (0..100): é o que dá reflexo de verdade. */
  sunIntensity: number
  topColor: string
  horizonColor: string
  groundColor: string
  clouds: SkyClouds
  /** 0..1: quantas estrelas aparecem (só à noite). */
  stars: number
  /** Multiplicador final, 0.25..4. */
  exposure: number
}

export const SKY_RANGES = {
  sunElevation: [-90, 90],
  sunAzimuth: [0, 360],
  sunSize: [0.5, 10],
  sunIntensity: [0, 100],
  amount: [0, 1],
  softness: [0, 1],
  stars: [0, 1],
  exposure: [0.25, 4],
} as const

const UINT32_MAX = 0xffffffff

const PRESETS: Record<SkyPresetId, Omit<SkyParams, 'preset'>> = {
  dia: {
    sunElevation: 55,
    sunAzimuth: 140,
    sunSize: 2,
    sunIntensity: 40,
    topColor: '#2f6fd6',
    horizonColor: '#a9d3ff',
    groundColor: '#6b8f5a',
    clouds: { amount: 0.35, softness: 0.5, seed: 7 },
    stars: 0,
    exposure: 1,
  },
  entardecer: {
    sunElevation: 6,
    sunAzimuth: 260,
    sunSize: 3.5,
    sunIntensity: 30,
    topColor: '#3b3d8f',
    horizonColor: '#ff9a5c',
    groundColor: '#4a3b3f',
    clouds: { amount: 0.45, softness: 0.6, seed: 21 },
    stars: 0.1,
    exposure: 1,
  },
  noite: {
    sunElevation: -25,
    sunAzimuth: 200,
    sunSize: 2,
    sunIntensity: 0,
    topColor: '#050a1e',
    horizonColor: '#1a2450',
    groundColor: '#0b0d18',
    clouds: { amount: 0.15, softness: 0.5, seed: 3 },
    stars: 0.9,
    exposure: 1,
  },
  nublado: {
    sunElevation: 40,
    sunAzimuth: 180,
    sunSize: 6,
    sunIntensity: 6,
    topColor: '#8a97a6',
    horizonColor: '#c9d1da',
    groundColor: '#56605a',
    clouds: { amount: 0.9, softness: 0.9, seed: 11 },
    stars: 0,
    exposure: 1,
  },
  alienigena: {
    sunElevation: 30,
    sunAzimuth: 90,
    sunSize: 4,
    sunIntensity: 35,
    topColor: '#1c0b3d',
    horizonColor: '#3ff0c8',
    groundColor: '#2e124a',
    clouds: { amount: 0.3, softness: 0.3, seed: 42 },
    stars: 0.6,
    exposure: 1.1,
  },
}

export function isSkyPresetId(value: unknown): value is SkyPresetId {
  return typeof value === 'string' && (SKY_PRESET_IDS as readonly string[]).includes(value)
}

/** Uma cópia nova dos parâmetros do preset (o chamador pode mutar à vontade). */
export function skyPreset(id: SkyPresetId): SkyParams {
  const base = PRESETS[id]
  return { preset: id, ...base, clouds: { ...base.clouds } }
}

export const DEFAULT_SKY_PRESET: SkyPresetId = 'dia'

function num(raw: unknown, fallback: number, range: readonly [number, number]): number {
  return clampNumber(typeof raw === 'number' ? raw : fallback, range[0], range[1])
}

function hex(raw: unknown, fallback: string): string {
  return (typeof raw === 'string' ? normalizeHex(raw) : null) ?? fallback
}

/**
 * Parâmetros vindos do disco/import: cada campo clampado ao range, cores
 * normalizadas, seed uint32, preset desconhecido vira `custom`. Nunca lança;
 * `null` só quando nem é um objeto (aí o chamador cai no preset padrão).
 */
export function sanitizeSkyParams(raw: unknown): SkyParams | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const preset: SkyPresetChoice = isSkyPresetId(r.preset) ? r.preset : 'custom'
  const base = skyPreset(isSkyPresetId(r.preset) ? r.preset : DEFAULT_SKY_PRESET)
  const clouds =
    r.clouds && typeof r.clouds === 'object' ? (r.clouds as Record<string, unknown>) : {}
  return {
    preset,
    sunElevation: num(r.sunElevation, base.sunElevation, SKY_RANGES.sunElevation),
    sunAzimuth: num(r.sunAzimuth, base.sunAzimuth, SKY_RANGES.sunAzimuth),
    sunSize: num(r.sunSize, base.sunSize, SKY_RANGES.sunSize),
    sunIntensity: num(r.sunIntensity, base.sunIntensity, SKY_RANGES.sunIntensity),
    topColor: hex(r.topColor, base.topColor),
    horizonColor: hex(r.horizonColor, base.horizonColor),
    groundColor: hex(r.groundColor, base.groundColor),
    clouds: {
      amount: num(clouds.amount, base.clouds.amount, SKY_RANGES.amount),
      softness: num(clouds.softness, base.clouds.softness, SKY_RANGES.softness),
      seed: clampInt(
        typeof clouds.seed === 'number' ? clouds.seed : base.clouds.seed,
        0,
        UINT32_MAX,
      ),
    },
    stars: num(r.stars, base.stars, SKY_RANGES.stars),
    exposure: num(r.exposure, base.exposure, SKY_RANGES.exposure),
  }
}
