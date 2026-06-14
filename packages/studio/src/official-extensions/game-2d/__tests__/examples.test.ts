import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import { pongExample } from '../examples'

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
