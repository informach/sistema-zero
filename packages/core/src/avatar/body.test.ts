import { describe, expect, test } from 'bun:test'
import { bodyMeasures, physicalBody } from './body'
import { AVATAR_CATALOG } from './catalog.generated'

const S = AVATAR_CATALOG.base.skeleton

/**
 * O corpo do jogo de hoje (`packages/arquipelago/src/sistemas/corpo.ts` e a `CINTURA` de
 * `modos/chao.ts`), medido para o avatar antigo de 2,13 m. Na ponte de escala 1,85, o corpo
 * derivado do esqueleto do pack precisa ficar perto disso: é o que mantém de pé o mundo de hoje e
 * os testes dele. Se um número sair da faixa, ajuste a REGRA em `body.ts`, não este número.
 */
const HOJE = {
  meiaAltura: 0.55,
  raio: 0.35,
  doCentroAoPe: 0.9,
  cintura: 0.55,
  desenhoDe: 0.45,
  desenhoAte: 1.05,
  desenhoRaio: 0.37,
  desenhoCabeca: 1.7,
}
const perto = (valor: number, alvo: number, faixa = 0.1) =>
  expect(Math.abs(valor - alvo) / alvo).toBeLessThanOrEqual(faixa)

describe('as medidas do corpo', () => {
  test('na escala nativa: a criança de 1,15 m, cabeçuda e de braço curto', () => {
    const m = bodyMeasures(S, 1)
    expect(m.height).toBeCloseTo(1.156, 2)
    expect(m.hips).toBeCloseTo(0.314, 2)
    expect(m.shoulder).toBeCloseTo(0.535, 2)
    // A cabeça é quase metade do corpo.
    expect(m.headRadius * 2).toBeGreaterThan(m.height * 0.45)
    // O braço é curto: a mão esticada para cima não passa do topo da cabeça.
    expect(m.reachUp).toBeLessThan(m.height)
    expect(m.handDown).toBeGreaterThan(0.2)
    expect(m.eyes).toBeGreaterThan(m.neck)
    expect(m.eyes).toBeLessThan(m.height)
    expect(m.leg).toBeCloseTo(m.hips, 1)
  })

  test('a escala multiplica tudo', () => {
    const um = bodyMeasures(S, 1)
    const dobro = bodyMeasures(S, 2)
    for (const k of ['height', 'eyes', 'shoulder', 'arm', 'leg', 'headRadius'] as const)
      expect(dobro[k]).toBeCloseTo(um[k] * 2, 6)
  })

  test('o corpo físico encosta no chão pelo pé e cobre o tronco', () => {
    const c = physicalBody(bodyMeasures(S, 1))
    expect(c.centerToFoot).toBeCloseTo(c.halfHeight + c.radius, 6)
    expect(c.halfHeight).toBeGreaterThan(0)
    expect(c.drawn.to).toBeGreaterThan(c.drawn.from)
  })

  test('na ponte de escala 1,85, o corpo fica a no máximo 10% do corpo do jogo de hoje', () => {
    const c = physicalBody(bodyMeasures(S, 1.85))
    perto(c.halfHeight, HOJE.meiaAltura)
    perto(c.radius, HOJE.raio)
    perto(c.centerToFoot, HOJE.doCentroAoPe)
    perto(c.waist, HOJE.cintura)
    perto(c.drawn.from, HOJE.desenhoDe)
    perto(c.drawn.to, HOJE.desenhoAte)
    perto(c.drawn.radius, HOJE.desenhoRaio)
    perto(c.drawn.head, HOJE.desenhoCabeca)
  })
})
