import { describe, expect, test } from 'bun:test'
import { studioGate } from '../src/server/studio-gate'

const ok = (blocks: string[]) => ({ status: 200, body: { blocks } })

describe('a porta do Estúdio livre: os blocos dos cursos decidem', () => {
  test('com blocos conquistados abre, e a paleta é exatamente a lista', () => {
    const gate = studioGate('coder', 'customer', ok(['sz_g2d_setup_stage', 'sz_g2d_on_key']))
    if (gate.kind !== 'open') throw new Error(`esperava aberto, veio ${gate.kind}`)
    expect(gate.tier.allowBlocks).toEqual(['sz_g2d_setup_stage', 'sz_g2d_on_key'])
    expect(gate.tier.allowedExtensions).toEqual(['game-2d'])
  })

  test('⭐ sem curso concluído não há reserva: o recado de concluir um curso', () => {
    // Até 02/10/2026 o Construtor recebia o Kit essencial aqui, e do Inventor para cima o
    // nível inteiro. Hoje nenhum nível abre o Estúdio livre sem bloco conquistado.
    for (const slug of ['coder', 'hacker', 'god']) {
      expect(studioGate(slug, 'customer', ok([]))).toEqual({
        kind: 'journey-locked',
        reason: 'no-blocks',
      })
    }
  })

  test('lista só com ids que o catálogo não conhece não é paleta', () => {
    // Currículo antigo com blocos que saíram do catálogo: abrir daria uma caixa vazia.
    expect(studioGate('coder', 'customer', ok(['sz_bloco_que_nao_existe'])).kind).toBe(
      'journey-locked',
    )
  })

  test('nível sem Estúdio livre continua trancado mesmo com blocos', () => {
    expect(studioGate('noob', 'customer', ok(['sz_g2d_setup_stage']))).toEqual({
      kind: 'journey-locked',
      reason: 'level',
    })
  })

  test('a Faísca vê o recado do nível mesmo quando a lista não chegou', () => {
    // A lista não a ajudaria: "tente de novo" seria uma promessa falsa.
    expect(studioGate('noob', 'customer', null)).toEqual({
      kind: 'journey-locked',
      reason: 'level',
    })
  })

  test('a lista que não chegou é "tente de novo", nunca "sem blocos"', () => {
    expect(studioGate('god', 'customer', null).kind).toBe('unavailable')
    expect(studioGate('god', 'customer', { status: 502, body: null }).kind).toBe('unavailable')
    expect(studioGate('god', 'customer', { status: 200, body: null }).kind).toBe('unavailable')
  })

  test('a equipe abre com tudo, mesmo sem curso e mesmo sem a lista', () => {
    for (const unlocks of [ok([]), null]) {
      const gate = studioGate('noob', 'staff', unlocks)
      if (gate.kind !== 'open') throw new Error(`esperava aberto, veio ${gate.kind}`)
      expect(gate.tier.allowBlocks).toBeUndefined()
      expect(gate.tier.pro).toBe(true)
    }
  })
})
