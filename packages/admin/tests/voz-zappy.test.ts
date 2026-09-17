import { describe, expect, test } from 'bun:test'
import { resumoDaGeracaoDeVoz } from '../src/components/editor/voz-zappy-button'

describe('resumo da geração da voz do Zappy', () => {
  test('não chama de pronta uma fala que a rota não conseguiu gerar nem reaproveitar', () => {
    expect(
      resumoDaGeracaoDeVoz({
        total: 2,
        geradas: 1,
        reaproveitadas: 0,
        longasDemais: 0,
      }),
    ).toEqual({ prontas: 0, faltou: 1 })
  })

  test('conta separadamente áudio já existente e fala longa fora da geração', () => {
    expect(
      resumoDaGeracaoDeVoz({
        total: 5,
        geradas: 1,
        reaproveitadas: 2,
        longasDemais: 1,
      }),
    ).toEqual({ prontas: 2, faltou: 1 })
  })
})
