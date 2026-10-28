import { describe, expect, test } from 'bun:test'
import { PASSO_DA_FISICA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  aproximarVelocidade,
  criarPulo,
  PERFIS,
  type PerfilDeMovimento,
  passoDoPulo,
  TOLERANCIA_DO_PULO,
} from '../src/sistemas/movimento'

const dt = PASSO_DA_FISICA

/** Quantos segundos até a velocidade chegar (perto o bastante) no alvo. */
function tempoAte(
  v: { x: number; z: number },
  alvoX: number,
  alvoZ: number,
  perfil: PerfilDeMovimento = PERFIS.chao,
) {
  let t = 0
  while (Math.hypot(alvoX - v.x, alvoZ - v.z) > 1e-6 && t < 5) {
    aproximarVelocidade(v, alvoX, alvoZ, perfil, dt)
    t += dt
  }
  return t
}

describe('aceleração e desaceleração', () => {
  test('anda e corre logo, mas não na hora', () => {
    const andar = tempoAte({ x: 0, z: 0 }, 0, CORPO.andar)
    expect(andar).toBeGreaterThan(0.08)
    expect(andar).toBeLessThan(0.18)
    const correr = tempoAte({ x: 0, z: 0 }, 0, CORPO.correr)
    expect(correr).toBeGreaterThan(0.2)
    expect(correr).toBeLessThan(0.32)
  })

  test('para mais rápido do que acelera', () => {
    const parar = tempoAte({ x: 0, z: CORPO.correr }, 0, 0)
    const acelerar = tempoAte({ x: 0, z: 0 }, 0, CORPO.correr)
    expect(parar).toBeLessThan(acelerar)
  })

  test('virar para trás freia antes de ir', () => {
    const v = { x: 0, z: CORPO.correr }
    aproximarVelocidade(v, 0, -CORPO.correr, PERFIS.chao, dt)
    expect(v.z).toBeCloseTo(CORPO.correr - PERFIS.chao.freio * dt, 6)
  })

  test('na água acelera e para mais devagar que no chão', () => {
    expect(tempoAte({ x: 0, z: 0 }, 2.6, 0, PERFIS.agua)).toBeGreaterThan(
      tempoAte({ x: 0, z: 0 }, 2.6, 0, PERFIS.chao),
    )
  })

  test('nunca passa do alvo', () => {
    const v = { x: 0, z: 0 }
    for (let i = 0; i < 100; i++) {
      aproximarVelocidade(v, 1, 0, PERFIS.chao, dt)
      expect(v.x).toBeLessThanOrEqual(1)
    }
  })
})

describe('pulo com tolerância', () => {
  test('no chão, o toque pula na hora', () => {
    const p = criarPulo()
    expect(passoDoPulo(p, true, false, dt)).toBe(false)
    expect(passoDoPulo(p, true, true, dt)).toBe(true)
  })

  test('coyote: pula um instante depois de sair da beirada, não muito depois', () => {
    const cedo = criarPulo()
    passoDoPulo(cedo, true, false, dt)
    for (let t = 0; t < TOLERANCIA_DO_PULO.coyote - 2 * dt; t += dt)
      passoDoPulo(cedo, false, false, dt)
    expect(passoDoPulo(cedo, false, true, dt)).toBe(true)

    const tarde = criarPulo()
    passoDoPulo(tarde, true, false, dt)
    for (let t = 0; t < TOLERANCIA_DO_PULO.coyote + 2 * dt; t += dt)
      passoDoPulo(tarde, false, false, dt)
    expect(passoDoPulo(tarde, false, true, dt)).toBe(false)
  })

  test('buffer: o toque um instante antes de pousar vale ao pousar', () => {
    const p = criarPulo()
    expect(passoDoPulo(p, false, true, dt)).toBe(false)
    for (let i = 0; i < 4; i++) expect(passoDoPulo(p, false, false, dt)).toBe(false)
    expect(passoDoPulo(p, true, false, dt)).toBe(true)
  })

  test('o toque cedo demais não fica guardado', () => {
    const p = criarPulo()
    passoDoPulo(p, false, true, dt)
    for (let t = 0; t < TOLERANCIA_DO_PULO.buffer + 2 * dt; t += dt)
      passoDoPulo(p, false, false, dt)
    expect(passoDoPulo(p, true, false, dt)).toBe(false)
  })

  test('um toque é um pulo: sem pulo duplo no ar nem pulo de coelho', () => {
    const p = criarPulo()
    expect(passoDoPulo(p, true, true, dt)).toBe(true)
    // No ar, outro toque logo depois não pula de novo.
    expect(passoDoPulo(p, false, true, dt)).toBe(false)
    // Pousa sem tocar de novo depois do buffer: nada.
    for (let i = 0; i < 20; i++) passoDoPulo(p, false, false, dt)
    expect(passoDoPulo(p, true, false, dt)).toBe(false)
  })
})
