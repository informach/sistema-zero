import { describe, expect, test } from 'bun:test'
import { semTravessao, semTravessaoNosCampos } from '../src/lib/kid-text'

describe('semTravessao', () => {
  test('travessão no meio da frase vira vírgula', () => {
    expect(semTravessao('O dragão — que é verde — voa até o ninho.')).toBe(
      'O dragão, que é verde, voa até o ninho.',
    )
    expect(semTravessao('Pronto–agora teste o pulo.')).toBe('Pronto, agora teste o pulo.')
  })

  test('hífen solto entre palavras também é travessão', () => {
    expect(semTravessao('Aperte a seta - o gato pula.')).toBe('Aperte a seta, o gato pula.')
  })

  test('travessão abrindo a linha sai, sem estragar as outras', () => {
    expect(semTravessao('— Oi! Vamos lá?\n— Bora testar.')).toBe('Oi! Vamos lá?\nBora testar.')
  })

  test('intervalo de números vira "a"', () => {
    expect(semTravessao('Para quem tem 8–13 anos.')).toBe('Para quem tem 8 a 13 anos.')
  })

  test('arruma a pontuação que a troca juntou', () => {
    expect(semTravessao('Muito bom —.')).toBe('Muito bom.')
    expect(semTravessao('Dica: — use as setas.')).toBe('Dica: use as setas.')
    expect(semTravessao('(— só um teste)')).toBe('(só um teste)')
    expect(semTravessao('Agora sim —')).toBe('Agora sim')
  })

  test('deixa em paz o hífen das palavras e a conta entre números', () => {
    const texto = 'O guarda-chuva cai quando a vida fica 10 - 2.'
    expect(semTravessao(texto)).toBe(texto)
  })
})

describe('semTravessaoNosCampos', () => {
  test('só mexe nos campos de texto pedidos, em qualquer profundidade', () => {
    const resposta = {
      title: 'Pular — e pegar',
      blockIds: ['sz_g2d—ok'],
      missions: [{ key: 'a—b', result: 'O gato pula — e pega.' }],
    }
    expect(semTravessaoNosCampos(resposta, new Set(['title', 'result']))).toEqual({
      title: 'Pular, e pegar',
      blockIds: ['sz_g2d—ok'],
      missions: [{ key: 'a—b', result: 'O gato pula, e pega.' }],
    })
  })
})
