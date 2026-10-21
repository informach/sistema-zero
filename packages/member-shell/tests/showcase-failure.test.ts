import { describe, expect, test } from 'bun:test'
import {
  SHOWCASE_FAILURE_MESSAGE,
  showcaseErrorMessage,
  showcaseFailureBody,
} from '../src/lib/showcase-failure'

const validatorReport = JSON.stringify({
  type: 'validation',
  on: 'body',
  property: '/coverImageUrl',
  expected: { coverImageUrl: 'https://...' },
})

describe('mensagem de recusa ao publicar no Mural', () => {
  test('relatório do validador vira frase; o código fica para o diagnóstico', () => {
    const body = { error: { code: 'VALIDATION_ERROR', message: validatorReport } }
    expect(showcaseErrorMessage(body)).toBe(SHOWCASE_FAILURE_MESSAGE)
    expect(showcaseFailureBody(body, 'SHOWCASE_FAILED')).toEqual({
      error: { code: 'VALIDATION_ERROR', message: SHOWCASE_FAILURE_MESSAGE },
    })
  })

  test('mensagem técnica sem código conhecido também não chega à tela', () => {
    for (const message of [validatorReport, '[1,2]', 'linha 1\nlinha 2', 'x'.repeat(241), ''])
      expect(showcaseErrorMessage({ error: { code: 'SOMETHING', message } })).toBe(
        SHOWCASE_FAILURE_MESSAGE,
      )
    for (const code of ['PARSE_ERROR', 'INTERNAL_ERROR'])
      expect(showcaseErrorMessage({ error: { code, message: 'Erro interno' } })).toBe(
        SHOWCASE_FAILURE_MESSAGE,
      )
  })

  test('frase de domínio passa; corpo vazio usa o código de reserva e o fallback do chamador', () => {
    expect(
      showcaseErrorMessage({ error: { code: 'FORBIDDEN', message: 'Peça a um responsável.' } }),
    ).toBe('Peça a um responsável.')
    expect(showcaseFailureBody(null, 'SHOWCASE_FAILED')).toEqual({
      error: { code: 'SHOWCASE_FAILED', message: SHOWCASE_FAILURE_MESSAGE },
    })
    expect(showcaseErrorMessage(null, 'Seu projeto continua guardado.')).toBe(
      'Seu projeto continua guardado.',
    )
  })
})
