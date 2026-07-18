import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../js'

/**
 * R29 — os 3 dropdowns do gk que NÃO validavam o enum (playEffect FX, rpgInflict
 * WHO, rpgFace DIR) agora seguem a regra do resto: valor DENTRO da lista vira o nó
 * gk:; FORA da lista NÃO vira gk: (senão a Ponte reversa coagia o FieldDropdown p/ a
 * 1ª opção e reescrevia o código da criança). Fora da lista cai no memberCall
 * GENÉRICO, que preserva o valor VERBATIM (o round-trip mantém "boom", não vira
 * "coin"). O blockAudit só testa o valor DEFAULT (sempre na lista) — este cobre o fora.
 */
function nodeOf(src: string): { type?: string } {
  const js = parseJS(src) as Array<{ type?: string }>
  return js[0] ?? {}
}

describe('gk — dropdowns: valor fora da lista NÃO é coagido (fidelidade da Ponte)', () => {
  it('playEffect: da lista → gk:playEffect; fora → genérico que preserva o valor', () => {
    expect(nodeOf('SZGameKit.playEffect("coin");').type).toBe('gk:playEffect')
    expect(nodeOf('SZGameKit.playEffect("win");').type).toBe('gk:playEffect')
    const fora = nodeOf('SZGameKit.playEffect("boom");')
    expect(fora.type).not.toBe('gk:playEffect') // NÃO coage p/ o nó gk
    // e o valor "boom" sobrevive ao gerar de novo (não virou "coin")
    expect(compileStatements([fora] as never, 0)).toContain('"boom"')
  })

  it('rpgInflict: quem da lista → gk:rpgInflict; quem fora → não coage', () => {
    expect(nodeOf('SZGameKit.rpgInflict("inimigo", "veneno", 3);').type).toBe('gk:rpgInflict')
    expect(nodeOf('SZGameKit.rpgInflict("heroi", "regenera", 2);').type).toBe('gk:rpgInflict')
    const fora = nodeOf('SZGameKit.rpgInflict("todos", "veneno", 3);')
    expect(fora.type).not.toBe('gk:rpgInflict')
    expect(compileStatements([fora] as never, 0)).toContain('"todos"')
  })

  it('rpgFace: direção da lista → gk:rpgFace; fora → não coage', () => {
    expect(nodeOf('SZGameKit.rpgFace("guarda", "down");').type).toBe('gk:rpgFace')
    const fora = nodeOf('SZGameKit.rpgFace("guarda", "diagonal");')
    expect(fora.type).not.toBe('gk:rpgFace')
    expect(compileStatements([fora] as never, 0)).toContain('"diagonal"')
  })
})
