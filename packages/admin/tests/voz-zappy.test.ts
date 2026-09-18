import { describe, expect, test } from 'bun:test'
import { chaveDeVoz, roteiroDoZappy } from '@sistemazero/core/learning/scene'
import { falasDaAula, resumoDaGeracaoDeVoz } from '../src/components/editor/voz-zappy-button'
import {
  assinaturaDoCacheDaVozDoZappy,
  payloadDaSinteseDoZappy,
} from '../src/lib/voz-zappy-roteiro'

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

describe('roteiro enviado para a voz do Zappy', () => {
  test('preserva a frase editorial e manda a exceção autoral como roteiro efetivo', () => {
    const [fala] = falasDaAula([
      {
        id: 'dialogo-1',
        content: {
          kind: 'dialogue',
          text: 'Clique no botão X.',
          zappySpeech: {
            sourceText: 'Clique no botão X.',
            speechText: 'Clique no botão xis.<break time="0.5s" />',
          },
        },
      },
    ])

    expect(fala?.falas).toEqual([
      {
        visibleText: 'Clique no botão X.',
        speechText: 'Clique no botão xis.<break time="0.5s" />',
      },
    ])
    expect(chaveDeVoz(fala?.falas[0]?.speechText ?? '')).toContain('Clique no botão xis.')
  })

  test('aplica o perfil global quando a autora ainda não fez um ajuste', () => {
    expect(roteiroDoZappy('Use a tecla X e a tecla Y.')).toBe('Use a tecla xis e a tecla ípsilon.')
  })

  test('versiona o cache e envia ao ElevenLabs o roteiro normalizado', () => {
    const roteiro = 'Olá.<break time="1.0s" /> Vamos criar!'
    expect(payloadDaSinteseDoZappy(roteiro, 'eleven_multilingual_v2')).toEqual({
      text: 'Olá.<break time="1s" /> Vamos criar!',
      model_id: 'eleven_multilingual_v2',
    })
    expect(
      assinaturaDoCacheDaVozDoZappy({
        voiceId: 'voz-a',
        model: 'eleven_multilingual_v2',
        roteiro,
      }),
    ).toBe('voz-a\neleven_multilingual_v2\npt-BR-1\nOlá.<break time="1s" /> Vamos criar!')
  })
})
