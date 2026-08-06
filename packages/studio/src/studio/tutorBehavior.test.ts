import { describe, expect, it } from 'bun:test'
import type { SZIRInput } from '../ir/schema'
import { buildTutorBehavior } from './tutorBehavior'

/**
 * Fixtures propositalmente FROUXAS: o digest anda a IR de forma genérica (é o que
 * o faz cobrir centenas de tipos de nó sem tabela), então os testes exercitam a
 * FORMA dos nós, não o schema completo de cada um.
 */
type FakeNode = Record<string, unknown>

function ir(behavior: { start?: FakeNode[]; events?: FakeNode[]; loops?: FakeNode[] }): SZIRInput {
  return {
    version: 2,
    html: [],
    css: [],
    behavior: { start: [], events: [], loops: [], ...behavior },
    extensions: [],
  } as unknown as SZIRInput
}

describe('buildTutorBehavior', () => {
  it('sem IR não inventa nada', () => {
    expect(buildTutorBehavior(null)).toBeUndefined()
    expect(buildTutorBehavior(undefined)).toBeUndefined()
  })

  it('carrega os VALORES que a criança escolheu — o que o esboço de tipos perdia', () => {
    const entries = buildTutorBehavior(
      ir({
        start: [
          {
            type: 'g2d:createSprite',
            varName: 'heroi',
            x: { type: 'num', value: 100 },
            y: { type: 'num', value: 40 },
            color: '#3b82f6',
            __id: 'bloco-1',
          },
        ],
      }),
    )
    expect(entries).toHaveLength(1)
    const [sprite] = entries ?? []
    expect(sprite?.type).toBe('g2d:createSprite')
    expect(sprite?.area).toBe('start')
    expect(sprite?.blockId).toBe('bloco-1')
    expect(sprite?.values).toEqual([
      { name: 'varName', value: 'heroi' },
      { name: 'x', value: '100' },
      { name: 'y', value: '40' },
      { name: 'color', value: '#3b82f6' },
    ])
  })

  it('o bug clássico aparece: velocidade 0 dentro do evento da tecla', () => {
    const entries =
      buildTutorBehavior(
        ir({
          events: [
            {
              type: 'g2d:onKey',
              key: 'ArrowRight',
              __id: 'evento-1',
              body: [
                {
                  type: 'g2d:setVelocity',
                  spriteVar: 'heroi',
                  vx: { type: 'num', value: 0 },
                  __id: 'bloco-2',
                },
              ],
            },
          ],
        }),
      ) ?? []

    expect(entries.map((entry) => entry.type)).toEqual(['g2d:onKey', 'g2d:setVelocity'])
    // A tecla escolhida e o zero da velocidade — os dois invisíveis antes.
    expect(entries[0]?.values).toContainEqual({ name: 'key', value: 'ArrowRight' })
    expect(entries[1]?.values).toContainEqual({ name: 'vx', value: '0' })
    // O aninhamento diz que a velocidade roda DENTRO do evento.
    expect(entries[1]?.depth).toBe(1)
    expect(entries[1]?.area).toBe('events')
  })

  it('separa o que roda ao iniciar, no evento e a cada quadro', () => {
    const entries =
      buildTutorBehavior(
        ir({
          start: [{ type: 'g2d:createSprite', varName: 'heroi' }],
          events: [{ type: 'g2d:onKey', key: 'Space', body: [] }],
          loops: [{ type: 'g2d:moveSprite', spriteVar: 'heroi' }],
        }),
      ) ?? []
    expect(entries.map((entry) => entry.area)).toEqual(['start', 'events', 'loops'])
  })

  it('referência a nome vira valor legível (erro de grafia é bug silencioso)', () => {
    const entries =
      buildTutorBehavior(
        ir({
          start: [{ type: 'g2d:setVelocity', vx: { type: 'var', name: 'velocidade' } }],
        }),
      ) ?? []
    expect(entries[0]?.values).toContainEqual({ name: 'vx', value: 'variável velocidade' })
  })

  it('expressão composta não vira valor inventado', () => {
    const entries =
      buildTutorBehavior(
        ir({
          start: [
            {
              type: 'g2d:setVelocity',
              vx: {
                type: 'binop',
                op: '+',
                left: { type: 'num', value: 1 },
                right: { type: 'num', value: 2 },
              },
            },
          ],
        }),
      ) ?? []
    // Melhor omitir do que afirmar um literal que não existe.
    expect(entries[0]?.values.some((value) => value.name === 'vx')).toBe(false)
  })

  it('respeita os tetos e não estoura com projeto grande', () => {
    const muitos = Array.from({ length: 400 }, (_, index) => ({
      type: 'g2d:moveSprite',
      spriteVar: `sprite-${index}`,
      nota: 'x'.repeat(200),
    }))
    const entries = buildTutorBehavior(ir({ start: muitos })) ?? []
    expect(entries.length).toBeLessThanOrEqual(120)
    for (const entry of entries) {
      for (const value of entry.values) expect(value.value.length).toBeLessThanOrEqual(40)
    }
  })

  it('IR malformada não derruba a pergunta', () => {
    expect(buildTutorBehavior({ nada: true } as unknown as SZIRInput)).toBeUndefined()
  })
})
