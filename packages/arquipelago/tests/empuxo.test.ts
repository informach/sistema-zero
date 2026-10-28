import { describe, expect, test } from 'bun:test'
import { PASSO_DA_FISICA } from '../src/mundo/medidas'
import { forcaDaAgua, fracaoSubmersa, pontosDoTronco } from '../src/sistemas/empuxo'
import { boia, MATERIAIS, massaDe, type NomeDoMaterial } from '../src/sistemas/materiais-fisicos'

const G = 24
const RAIO = 0.16
const COMPRIMENTO = 1.6

/**
 * Um tronco no plano (altura do meio `y` e inclinação `angulo`), com os quatro pontos de flutuação,
 * integrado em passos fixos como o jogo faz. A superfície da água está em y = 0. `peso` é uma força
 * para baixo na ponta +x (a criança em pé nela).
 */
function simular(
  material: NomeDoMaterial,
  segundos: number,
  inicio = { y: 0.5, angulo: 0 },
  peso = 0,
) {
  const volume = Math.PI * RAIO * RAIO * COMPRIMENTO
  const massa = massaDe(material, volume)
  const inercia = (massa * COMPRIMENTO * COMPRIMENTO) / 12
  const pontos = pontosDoTronco(COMPRIMENTO)
  let { y, angulo } = inicio
  let vy = 0
  let w = 0
  const f = { x: 0, y: 0, z: 0 }
  const vel = { x: 0, y: 0, z: 0 }
  let submersa = 0
  for (let t = 0; t < segundos; t += PASSO_DA_FISICA) {
    let forca = -massa * G
    let torque = 0
    submersa = 0
    for (const p of pontos) {
      const c = Math.cos(angulo)
      const py = y + p.x * Math.sin(angulo)
      vel.y = vy + p.x * w * c
      submersa += forcaDaAgua(-py, 2 * RAIO, volume / pontos.length, vel, G, f) / pontos.length
      forca += f.y
      torque += p.x * c * f.y
    }
    const ponta = COMPRIMENTO / 2
    forca -= peso
    torque -= ponta * Math.cos(angulo) * peso
    vy += (forca / massa) * PASSO_DA_FISICA
    w += (torque / inercia) * PASSO_DA_FISICA
    y += vy * PASSO_DA_FISICA
    angulo += w * PASSO_DA_FISICA
  }
  return { y, angulo, vy, w, submersa }
}

describe('o catálogo de materiais', () => {
  test('madeira e palha boiam, pedra afunda', () => {
    expect(boia('madeira')).toBe(true)
    expect(boia('palha')).toBe(true)
    expect(boia('pedra')).toBe(false)
    expect(massaDe('madeira', 2)).toBe(MATERIAIS.madeira.densidade * 2)
  })
})

describe('o empuxo por pontos', () => {
  test('a parte submersa vai de 0 (acima) a 1 (abaixo), metade com o meio na superfície', () => {
    expect(fracaoSubmersa(-1, 0.3)).toBe(0)
    expect(fracaoSubmersa(0, 0.3)).toBe(0.5)
    expect(fracaoSubmersa(1, 0.3)).toBe(1)
  })

  test('fora da água não há força', () => {
    const f = { x: 1, y: 1, z: 1 }
    expect(forcaDaAgua(-1, 0.3, 0.01, { x: 0, y: -2, z: 0 }, G, f)).toBe(0)
    expect(f).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('o tronco de madeira cai na água, balança e assenta com metade de fora', () => {
    const r = simular('madeira', 12)
    // Densidade metade da água: assenta com metade do volume dentro (o meio na superfície).
    expect(r.submersa).toBeCloseTo(MATERIAIS.madeira.densidade / MATERIAIS.agua.densidade, 1)
    expect(Math.abs(r.y)).toBeLessThan(0.03)
    expect(Math.abs(r.vy)).toBeLessThan(0.01)
  })

  test('inclinado, ele volta a deitar', () => {
    const r = simular('madeira', 12, { y: 0, angulo: 0.4 })
    expect(Math.abs(r.angulo)).toBeLessThan(0.01)
  })

  test('com peso numa ponta, ele inclina para lá e continua boiando', () => {
    const volume = Math.PI * RAIO * RAIO * COMPRIMENTO
    // Um peso de um quinto da massa do tronco na ponta +x.
    const r = simular('madeira', 12, { y: 0, angulo: 0 }, massaDe('madeira', volume) * G * 0.2)
    expect(r.angulo).toBeLessThan(-0.05)
    expect(r.submersa).toBeLessThan(1)
    expect(Math.abs(r.vy)).toBeLessThan(0.01)
  })

  test('a pedra afunda', () => {
    const r = simular('pedra', 2)
    expect(r.submersa).toBe(1)
    expect(r.vy).toBeLessThan(0)
    expect(r.y).toBeLessThan(-1)
  })
})
