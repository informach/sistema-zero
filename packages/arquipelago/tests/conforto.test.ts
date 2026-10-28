import { describe, expect, test } from 'bun:test'
import { CONTROLE_DA_CAMERA } from '../src/mundo/medidas'
import {
  CONFORTO_PADRAO,
  giroComVoltaSozinha,
  lerConforto,
  METROS_DA_DISTANCIA,
  VOLTA_SOZINHA,
} from '../src/sistemas/conforto'

describe('o conforto da câmera', () => {
  test('nada guardado ou guardado quebrado: o padrão, com a volta sozinha desligada', () => {
    expect(lerConforto(null)).toEqual(CONFORTO_PADRAO)
    expect(lerConforto('{quebrado')).toEqual(CONFORTO_PADRAO)
    expect(CONFORTO_PADRAO.voltaSozinha).toBe(false)
  })

  test('lê o que vale e troca pelo padrão o que não vale', () => {
    const c = lerConforto(
      JSON.stringify({
        rapidez: 'rapida',
        distancia: 'enorme',
        inverterVertical: 'sim',
        voltaSozinha: true,
      }),
    )
    expect(c.rapidez).toBe('rapida')
    expect(c.distancia).toBe('normal')
    expect(c.inverterVertical).toBe(false)
    expect(c.voltaSozinha).toBe(true)
  })

  test('as distâncias ficam dentro do zoom', () => {
    for (const m of Object.values(METROS_DA_DISTANCIA)) {
      expect(m).toBeGreaterThanOrEqual(CONTROLE_DA_CAMERA.distanciaMinima)
      expect(m).toBeLessThanOrEqual(CONTROLE_DA_CAMERA.distanciaMaxima)
    }
  })

  test('a volta sozinha só age ligada, andando e sem mexer na câmera há um tempo', () => {
    const ligado = { ...CONFORTO_PADRAO, voltaSozinha: true }
    const dt = 1 / 60
    const espera = VOLTA_SOZINHA.espera + 0.1
    // Desligada, parada ou mexida há pouco: não mexe.
    expect(giroComVoltaSozinha(0, 1, CONFORTO_PADRAO, 2, espera, dt)).toBe(0)
    expect(giroComVoltaSozinha(0, 1, ligado, 0, espera, dt)).toBe(0)
    expect(giroComVoltaSozinha(0, 1, ligado, 2, 1, dt)).toBe(0)
    // Ligada e andando: vai para as costas (direção + meia volta), pelo lado curto.
    let giro = 0
    for (let i = 0; i < 600; i++) giro = giroComVoltaSozinha(giro, 0, ligado, 2, espera, dt)
    expect(Math.cos(giro - Math.PI)).toBeCloseTo(1, 3)
  })
})
