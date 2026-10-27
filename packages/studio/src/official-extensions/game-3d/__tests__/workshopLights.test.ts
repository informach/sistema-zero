import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gameThreeDRuntime } from '../runtime'

/**
 * A luz que o Jogo 3D cria em toda cena é a MESMA da oficina do Molda (27/10/2026): o modelo
 * feito lá aparece com a mesma cor no jogo. Os dois pacotes não se importam, então a conferência
 * é pelo texto dos dois lados.
 */
const molda = readFileSync(
  resolve(import.meta.dir, '../../../../../molda/src/viewport/workshopLights.ts'),
  'utf8',
)
const numero = (texto: string, padrao: RegExp) => {
  const m = padrao.exec(texto)
  if (!m) throw new Error(`não achei ${padrao}`)
  return Number(m[1])
}

describe('a luz do Jogo 3D e a da oficina do Molda', () => {
  it('têm os mesmos números', () => {
    const ambiente = numero(gameThreeDRuntime, /var LIGHT_AMBIENT = ([\d.]+);/)
    const sol = numero(gameThreeDRuntime, /var LIGHT_SUN = ([\d.]+);/)
    expect(numero(molda, /export const WORKSHOP_AMBIENT = ([\d.]+)/)).toBe(ambiente)
    expect(numero(molda, /export const WORKSHOP_SUN = ([\d.]+)/)).toBe(sol)
    // Calibrada contra as cores do 2D: a frente de um cubo branco sai com ~99% da cor.
    expect(ambiente).toBe(2.1)
    expect(sol).toBe(1.7)
  })

  it('a cena e o Kit Empilhar usam a luz única, sem números soltos', () => {
    expect(gameThreeDRuntime.match(/new THREE\.AmbientLight\(0xffffff, LIGHT_AMBIENT\)/g)).toHaveLength(2)
    expect(gameThreeDRuntime.match(/new THREE\.DirectionalLight\(0xffffff, LIGHT_SUN\)/g)).toHaveLength(2)
  })
})
