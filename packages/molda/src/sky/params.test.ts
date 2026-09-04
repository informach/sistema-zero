import { describe, expect, test } from 'bun:test'
import { SKY_PRESET_IDS, SKY_RANGES, sanitizeSkyParams, skyPreset } from './params'

describe('parâmetros do céu', () => {
  test('todo preset cai dentro dos ranges', () => {
    for (const id of SKY_PRESET_IDS) {
      const p = skyPreset(id)
      expect(p.preset).toBe(id)
      expect(p.sunElevation).toBeGreaterThanOrEqual(SKY_RANGES.sunElevation[0])
      expect(p.sunElevation).toBeLessThanOrEqual(SKY_RANGES.sunElevation[1])
      expect(p.sunAzimuth).toBeGreaterThanOrEqual(SKY_RANGES.sunAzimuth[0])
      expect(p.sunAzimuth).toBeLessThanOrEqual(SKY_RANGES.sunAzimuth[1])
      expect(p.sunSize).toBeGreaterThanOrEqual(SKY_RANGES.sunSize[0])
      expect(p.sunSize).toBeLessThanOrEqual(SKY_RANGES.sunSize[1])
      expect(p.sunIntensity).toBeGreaterThanOrEqual(SKY_RANGES.sunIntensity[0])
      expect(p.sunIntensity).toBeLessThanOrEqual(SKY_RANGES.sunIntensity[1])
      expect(p.clouds.amount).toBeGreaterThanOrEqual(0)
      expect(p.clouds.amount).toBeLessThanOrEqual(1)
      expect(p.stars).toBeGreaterThanOrEqual(0)
      expect(p.stars).toBeLessThanOrEqual(1)
      expect(p.exposure).toBeGreaterThanOrEqual(SKY_RANGES.exposure[0])
      expect(p.exposure).toBeLessThanOrEqual(SKY_RANGES.exposure[1])
      for (const hex of [p.topColor, p.horizonColor, p.groundColor])
        expect(hex).toMatch(/^#[0-9a-f]{6}$/)
      // Sanitize de um preset é o próprio preset (a tabela é canônica).
      expect(sanitizeSkyParams(p)).toEqual(p)
    }
  })

  test('skyPreset devolve uma cópia nova a cada chamada', () => {
    const a = skyPreset('dia')
    const b = skyPreset('dia')
    expect(a).not.toBe(b)
    expect(a.clouds).not.toBe(b.clouds)
  })

  test('sanitize: campos ausentes vêm do preset; preset desconhecido vira custom com base no dia', () => {
    const out = sanitizeSkyParams({ preset: 'noite', stars: 2 })
    expect(out?.preset).toBe('noite')
    expect(out?.stars).toBe(1)
    expect(out?.topColor).toBe(skyPreset('noite').topColor)
    const custom = sanitizeSkyParams({ preset: 'marte' })
    expect(custom?.preset).toBe('custom')
    expect(custom?.sunElevation).toBe(skyPreset('dia').sunElevation)
    expect(sanitizeSkyParams(null)).toBeNull()
    expect(sanitizeSkyParams('x')).toBeNull()
  })

  test('seed é inteiro uint32', () => {
    const out = sanitizeSkyParams({ preset: 'dia', clouds: { seed: 1.7 } })
    expect(out?.clouds.seed).toBe(2)
    const neg = sanitizeSkyParams({ preset: 'dia', clouds: { seed: -5 } })
    expect(neg?.clouds.seed).toBe(0)
  })
})
