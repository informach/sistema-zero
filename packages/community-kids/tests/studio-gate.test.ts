import { describe, expect, test } from 'bun:test'
import { studioGate } from '../src/server/studio-gate'
import { kidsView, kidsStaffPreview } from './kids-journey-fixtures'

const ok = (blocks: string[]) => ({ status: 200, body: { blocks } })

describe('a porta do Estúdio livre: os blocos dos cursos decidem', () => {
  test('com blocos conquistados abre, e a paleta é exatamente a lista', () => {
    const gate = studioGate(kidsView(['studio']), ok(['sz_g2d_setup_stage', 'sz_g2d_on_key']))
    if (gate.kind !== 'open') throw new Error(`esperava aberto, veio ${gate.kind}`)
    expect(gate.tier.allowBlocks).toEqual(['sz_g2d_setup_stage', 'sz_g2d_on_key'])
    expect(gate.tier.allowedExtensions).toEqual(['game-2d'])
  })

  test('⭐ sem curso concluído não há reserva: o recado de concluir um curso', () => {
    // Até 02/10/2026 o Construtor recebia o Kit essencial aqui, e do Inventor para cima o
    // nível inteiro. Hoje nenhum nível abre o Estúdio livre sem bloco conquistado.
    for (const slug of ['coder', 'hacker', 'god'] as const) {
      expect(studioGate(kidsView(['studio'], slug), ok([]))).toEqual({
        kind: 'journey-locked',
        reason: 'no-blocks',
      })
    }
  })

  test('lista só com ids que o catálogo não conhece não é paleta', () => {
    // Currículo antigo com blocos que saíram do catálogo: abrir daria uma caixa vazia.
    expect(studioGate(kidsView(['studio']), ok(['sz_bloco_que_nao_existe'])).kind).toBe(
      'journey-locked',
    )
  })

  test('nível sem Estúdio livre continua trancado mesmo com blocos', () => {
    expect(studioGate(kidsView([]), ok(['sz_g2d_setup_stage']))).toEqual({
      kind: 'journey-locked',
      reason: 'level',
    })
  })

  test('a Faísca vê o recado do nível mesmo quando a lista não chegou', () => {
    // A lista não a ajudaria: "tente de novo" seria uma promessa falsa.
    expect(studioGate(kidsView([]), null)).toEqual({
      kind: 'journey-locked',
      reason: 'level',
    })
  })

  test('a lista que não chegou é "tente de novo", nunca "sem blocos"', () => {
    expect(studioGate(kidsView(['studio', 'pro'], 'god'), null).kind).toBe('unavailable')
    expect(studioGate(kidsView(['studio', 'pro'], 'god'), { status: 502, body: null }).kind).toBe('unavailable')
    expect(studioGate(kidsView(['studio', 'pro'], 'god'), { status: 200, body: null }).kind).toBe('unavailable')
  })

  test('a equipe abre com tudo, mesmo sem curso e mesmo sem a lista', () => {
    for (const unlocks of [ok([]), null]) {
      const gate = studioGate(kidsStaffPreview, unlocks)
      if (gate.kind !== 'open') throw new Error(`esperava aberto, veio ${gate.kind}`)
      expect(gate.tier.allowBlocks).toBeUndefined()
      expect(gate.tier.pro).toBe(true)
    }
  })
})


test('unavailable policy never becomes a journey lock or a pretend Noob', () => {
  expect(studioGate(null, ok(['sz_g2d_setup_stage']))).toEqual({ kind: 'unavailable' })
})

test('custom capabilities open a low rank and can leave a high rank closed', () => {
  expect(studioGate(kidsView(['studio'], 'noob'), ok(['sz_g2d_setup_stage'])).kind).toBe('open')
  expect(studioGate(kidsView([], 'god'), ok(['sz_g2d_setup_stage']))).toEqual({ kind: 'journey-locked', reason: 'level' })
})
