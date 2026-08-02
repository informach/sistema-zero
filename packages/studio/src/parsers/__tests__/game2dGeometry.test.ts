import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../js'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

// Bloquinhos de VALOR de geometria do sprite (posição/tamanho/centro): facilitadores
// p/ a criança não fazer x+largura/2 na mão. Geram SZGame2D.<fn>(sprite) e voltam.
const GETTERS = [
  ['spriteX', 'g2d:spriteX'],
  ['spriteY', 'g2d:spriteY'],
  ['spriteW', 'g2d:spriteW'],
  ['spriteH', 'g2d:spriteH'],
  ['centerX', 'g2d:centerX'],
  ['centerY', 'g2d:centerY'],
] as const

describe('game-2d: geometria do sprite (posição/tamanho/centro)', () => {
  it('o parser reconhece os 6 getters como VALOR g2d (não cai em código avançado)', () => {
    for (const [fn, irType] of GETTERS) {
      const ir = parseJS(`let v = SZGame2D.${fn}(nave);`)
      const types = collectTypes(ir)
      expect(types.has(irType)).toBe(true)
      // É "valor simples" (isSimpleValue) → não vira rawJS.
      expect(types.has('rawJS')).toBe(false)
    }
  })

  it('round-trip código→IR→código preserva a chamada (centro com a metade embutida)', () => {
    const regen = compileStatements(
      parseJS('let alvo = SZGame2D.centerX(nave) + SZGame2D.spriteY(chao);'),
      0,
    )
    expect(regen).toContain('SZGame2D.centerX(nave)')
    expect(regen).toContain('SZGame2D.spriteY(chao)')
  })
})

describe('game-2d: posição aleatória na tela (randomX/randomY)', () => {
  it('o parser reconhece randomX/randomY como VALOR (não cai em código avançado)', () => {
    for (const [fn, irType] of [
      ['randomX', 'g2d:randomX'],
      ['randomY', 'g2d:randomY'],
    ] as const) {
      const types = collectTypes(parseJS(`let v = SZGame2D.${fn}();`))
      expect(types.has(irType)).toBe(true)
      expect(types.has('rawJS')).toBe(false)
    }
  })

  it('round-trip código→IR→código preserva a chamada (1 bloco no lugar de Math.random()*largura)', () => {
    const regen = compileStatements(parseJS('let x = SZGame2D.randomX();'), 0)
    expect(regen).toContain('SZGame2D.randomX()')
    expect(regen).not.toContain('Math.random()')
  })
})
