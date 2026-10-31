import { describe, expect, test } from 'bun:test'
import { getSchemaValidator } from 'elysia'
import { SectionCompletionSchema } from '../../src/interfaces/http/learning.dtos'

const validador = getSchemaValidator(SectionCompletionSchema)
const conclusao = (rule: unknown) => ({
  version: 1,
  blockIds: [],
  projectChecks: [{ id: 'encontro', label: 'Um encontro com efeito', rule }],
})

describe('DTO: a regra causal do jogo autoral (gameCausality)', () => {
  test('aceita os cinco passos', () => {
    for (const step of ['encounter', 'memory', 'decision', 'restart', 'removal'])
      expect(validador.Check(conclusao({ type: 'gameCausality', actor: 'guia', step })), step).toBe(
        true,
      )
  })

  test('recusa passo desconhecido e personagem ausente', () => {
    expect(validador.Check(conclusao({ type: 'gameCausality', actor: 'guia', step: 'voar' }))).toBe(
      false,
    )
    expect(validador.Check(conclusao({ type: 'gameCausality', step: 'memory' }))).toBe(false)
  })
})
