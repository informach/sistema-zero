import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { draftCommand } from '../../src/interfaces/http/lesson-draft.dtos'

const bloco = (activity: unknown) => ({
  expectedRevision: randomUUID(),
  operationId: randomUUID(),
  change: {
    type: 'block' as const,
    block: {
      id: randomUUID(),
      content: {
        kind: 'interactive',
        title: 'Faça o Dino aparecer',
        instructions: 'Crie o Dino e ligue o desenho.',
        hints: [],
        required: true,
        activity,
      },
    },
  },
})

describe('contrato do rascunho interativo', () => {
  test('salva a experimentação sem alterar sua cena', () => {
    const result = draftCommand(bloco({ type: 'experimentation', scene: 'spawn' }) as never)
    if (result.change.type !== 'block') throw new Error('Mudança inesperada')
    expect(result.change.block.content.activity).toEqual({
      type: 'experimentation',
      scene: 'spawn',
    })
  })

  test('recusa demonstração, pergunta isolada e cena desconhecida', () => {
    for (const activity of [
      { type: 'demonstration', scene: 'world' },
      { type: 'question' },
      { type: 'experimentation', scene: 'cena-que-nao-existe' },
    ]) {
      expect(() => draftCommand(bloco(activity) as never)).toThrow(ValidationError)
    }
  })
})
