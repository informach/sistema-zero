import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import { asteroidsExample, pongExample } from '../examples'
import { gameTwoDExtension } from '../index'

describe('game-2d — definição da extensão', () => {
  it('nível intermediário — NÃO aparece na paleta do iniciante', () => {
    expect(gameTwoDExtension.manifest.id).toBe('game-2d')
    expect(gameTwoDExtension.minLevel).toBe('intermediario')
  })
})

/** Coleta todos os `type` de nós do IR (deep-walk) para detectar `rawJS`. */
function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('pongExample (game-2d)', () => {
  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRSchema.safeParse(pongExample.ir).success).toBe(true)
  })

  it('NÃO usa bloco de código avançado (rawJS) — tudo vira bloco', () => {
    const types = collectTypes(pongExample.ir)
    expect(types.has('rawJS')).toBe(false)
  })
})

describe('asteroidsExample (game-2d) — perf do SZIRSchema', () => {
  // Guarda de regressão do freeze de ~11s: com `z.union` (não-discriminada) o
  // safeParse desta IR ~107 nós fazia BACKTRACKING exponencial e congelava o
  // editor na carga/import. Com `z.discriminatedUnion('type', …)` é O(nós).
  // Teto FOLGADO (2s) p/ não flakar em CI lento, mas pega a regressão (era ~15s).
  it('valida e parseia em tempo linear (< 2s, não exponencial)', () => {
    const t0 = performance.now()
    const result = SZIRSchema.safeParse(asteroidsExample.ir)
    const elapsed = performance.now() - t0
    expect(result.success).toBe(true)
    expect(elapsed).toBeLessThan(2000)
  })

  it('a física usa os blocos do motor + if/memberSet (gera o código esperado)', () => {
    const code = compileStatements(pongExample.ir.js, 0)
    expect(code).toContain('SZGame2D.applyVelocity(bola)')
    expect(code).toContain('SZGame2D.bounceOnEdges(bola, ctx)')
    expect(code).toContain('SZGame2D.isColliding(jogador, bola)')
    expect(code).toContain('bola.vx = Math.abs(bola.vx)')
    // A física crua antiga (integração manual da velocidade) sumiu.
    expect(code).not.toContain('bola.x += bola.vx')
  })
})
