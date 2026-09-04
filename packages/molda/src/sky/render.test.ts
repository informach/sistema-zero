import { describe, expect, test } from 'bun:test'
import { fbm, hash2, valueNoise } from './noise'
import { SKY_PRESET_IDS, skyPreset } from './params'
import { dayFactorOf, renderSky, SKY_PREVIEW_SIZE, skyDirection, sunDirection } from './render'

function luminance(rgb: Float32Array, i: number): number {
  return (
    0.2126 * (rgb[i * 3] as number) +
    0.7152 * (rgb[i * 3 + 1] as number) +
    0.0722 * (rgb[i * 3 + 2] as number)
  )
}

function meanLuminance(rgb: Float32Array): number {
  let sum = 0
  const count = rgb.length / 3
  for (let i = 0; i < count; i += 1) sum += luminance(rgb, i)
  return sum / count
}

describe('ruído', () => {
  test('hash2 é determinístico, em [0, 1) e sensível à semente', () => {
    expect(hash2(3, 7, 11)).toBe(hash2(3, 7, 11))
    expect(hash2(3, 7, 11)).not.toBe(hash2(3, 7, 12))
    expect(hash2(3, 7, 11)).not.toBe(hash2(4, 7, 11))
    for (let i = 0; i < 1000; i += 1) {
      const h = hash2(i, i * 3, 5)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
    }
  })

  test('value noise e fbm ficam em [0, 1] e são contínuos', () => {
    let previous = valueNoise(0.5, 0.5, 1)
    for (let i = 1; i < 200; i += 1) {
      const x = 0.5 + i * 0.01
      const n = valueNoise(x, 0.5, 1)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
      expect(Math.abs(n - previous)).toBeLessThan(0.08)
      previous = n
    }
    const f = fbm(12.3, 4.5, 9)
    expect(f).toBeGreaterThanOrEqual(0)
    expect(f).toBeLessThanOrEqual(1)
    expect(fbm(12.3, 4.5, 9)).toBe(f)
  })
})

describe('render do céu', () => {
  test('direções: linha 0 é o zênite, o meio é o horizonte, a última é o nadir', () => {
    const top = skyDirection(0.5, 0)
    const middle = skyDirection(0.5, 0.5)
    const bottom = skyDirection(0.5, 1)
    expect(top[1]).toBeCloseTo(1, 6)
    expect(Math.abs(middle[1])).toBeLessThan(1e-9)
    expect(bottom[1]).toBeCloseTo(-1, 6)
    const sun = sunDirection({ sunElevation: 90, sunAzimuth: 0 })
    expect(sun[1]).toBeCloseTo(1, 6)
    expect(dayFactorOf(-40)).toBe(0)
    expect(dayFactorOf(40)).toBe(1)
  })

  test('determinístico bit a bit; tudo finito e não negativo; presets renderizam', () => {
    for (const id of SKY_PRESET_IDS) {
      const params = skyPreset(id)
      const a = renderSky(params, SKY_PREVIEW_SIZE.width, SKY_PREVIEW_SIZE.height)
      const b = renderSky(params, SKY_PREVIEW_SIZE.width, SKY_PREVIEW_SIZE.height)
      expect(a.rgb).toEqual(b.rgb)
      for (const value of a.rgb) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('o sol a pino brilha no topo; à noite o céu é escuro e tem estrelas', () => {
    const noon = renderSky(
      {
        ...skyPreset('dia'),
        sunElevation: 90,
        sunSize: 4,
        clouds: { amount: 0, softness: 0, seed: 1 },
      },
      64,
      32,
    )
    let brightest = 0
    let brightestRow = -1
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const l = luminance(noon.rgb, y * 64 + x)
        if (l > brightest) {
          brightest = l
          brightestRow = y
        }
      }
    }
    expect(brightestRow).toBeLessThanOrEqual(1)
    expect(brightest).toBeGreaterThan(10)

    const night = renderSky(skyPreset('noite'), 128, 64)
    const day = renderSky(skyPreset('dia'), 128, 64)
    expect(meanLuminance(night.rgb)).toBeLessThan(meanLuminance(day.rgb) / 4)
    const noStars = renderSky({ ...skyPreset('noite'), stars: 0 }, 128, 64)
    let starPixels = 0
    for (let i = 0; i < 128 * 64; i += 1) {
      if (luminance(night.rgb, i) > luminance(noStars.rgb, i) + 0.05) starPixels += 1
    }
    expect(starPixels).toBeGreaterThan(20)
    // De dia não há estrelas, com o mesmo pedido.
    const dayStars = renderSky({ ...skyPreset('dia'), stars: 1 }, 128, 64)
    const dayNoStars = renderSky({ ...skyPreset('dia'), stars: 0 }, 128, 64)
    expect(dayStars.rgb).toEqual(dayNoStars.rgb)
  })

  test('a semente só muda as nuvens; sem nuvens, sementes diferentes dão o mesmo céu', () => {
    // O preset noturno mantém as estrelas visíveis e garante que elas não
    // estejam acidentalmente acopladas à semente das nuvens.
    const base = skyPreset('noite')
    const a = renderSky({ ...base, clouds: { amount: 0, softness: 0.5, seed: 1 } }, 64, 32)
    const b = renderSky({ ...base, clouds: { amount: 0, softness: 0.5, seed: 2 } }, 64, 32)
    expect(a.rgb).toEqual(b.rgb)
    const c = renderSky({ ...base, clouds: { amount: 0.6, softness: 0.5, seed: 1 } }, 64, 32)
    const d = renderSky({ ...base, clouds: { amount: 0.6, softness: 0.5, seed: 2 } }, 64, 32)
    expect(c.rgb).not.toEqual(d.rgb)
    // Abaixo do horizonte as nuvens não entram: a metade de baixo é igual.
    const half = 64 * 16 * 3
    expect(c.rgb.slice(half)).toEqual(d.rgb.slice(half))
  })

  test('a exposição é linear e as estrelas caem nas mesmas posições em qualquer resolução', () => {
    const base = skyPreset('entardecer')
    const one = renderSky({ ...base, exposure: 1 }, 32, 16)
    const two = renderSky({ ...base, exposure: 2 }, 32, 16)
    for (let i = 0; i < one.rgb.length; i += 1) {
      expect(two.rgb[i] as number).toBeCloseTo((one.rgb[i] as number) * 2, 5)
    }
    const night = { ...skyPreset('noite'), clouds: { amount: 0, softness: 0, seed: 1 } }
    const small = renderSky(night, 256, 128)
    const big = renderSky(night, 512, 256)
    const smallNoStars = renderSky({ ...night, stars: 0 }, 256, 128)
    const bigNoStars = renderSky({ ...night, stars: 0 }, 512, 256)
    // Toda estrela da prévia está dentro do bloco 2×2 correspondente no export.
    let checked = 0
    for (let y = 0; y < 128; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        const i = y * 256 + x
        if (luminance(small.rgb, i) <= luminance(smallNoStars.rgb, i) + 0.05) continue
        let found = false
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            const j = (y * 2 + dy) * 512 + x * 2 + dx
            if (luminance(big.rgb, j) > luminance(bigNoStars.rgb, j) + 0.05) found = true
          }
        }
        expect(found).toBe(true)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  test('o export 1024×512 roda em tempo razoável (medição, sem assert apertado)', () => {
    const start = performance.now()
    renderSky(skyPreset('nublado'), 1024, 512)
    const elapsed = performance.now() - start
    console.info(`[molda] renderSky 1024×512: ${elapsed.toFixed(0)} ms`)
    expect(elapsed).toBeLessThan(5000)
  })
})
