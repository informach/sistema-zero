import { describe, expect, test } from 'bun:test'
import { pontosDaPeca } from './pontos'

describe('pontos da peça', () => {
  test('os pontos antigos continuam (vetor ou objeto com direção)', () => {
    expect(
      pontosDaPeca({
        pontos: { assento: [0, 0.4, 0], cama: { ponto: [0, 0.5, 0], direcao: [0, 0, 1] } },
      }),
    ).toEqual({
      assento: { position: [0, 0.4, 0] },
      cama: { position: [0, 0.5, 0], direction: [0, 0, 1] },
    })
  })

  test('os pontos de jogo da arte entram como <tipo>_<nome>, que o jogo procura', () => {
    const pontos = pontosDaPeca({
      pontos_de_jogo: [
        { tipo: 'sentar', ponto: [0.288, 0.431, 0.287], direcao: [0, 0, 1], nome: 'esquerdo' },
        { tipo: 'sentar', ponto: [-0.288, 0.431, 0.287], direcao: [0, 0, 1], nome: 'direito' },
        { tipo: 'plantar', ponto: [0, 0.19, 0] },
        { tipo: 'deitar', ponto: 'lixo' },
        'lixo',
      ],
    })
    expect(pontos).toEqual({
      sentar_esquerdo: { position: [0.288, 0.431, 0.287], direction: [0, 0, 1] },
      sentar_direito: { position: [-0.288, 0.431, 0.287], direction: [0, 0, 1] },
      plantar_2: { position: [0, 0.19, 0] },
    })
  })

  test('nome antigo vence o de jogo igual; peça sem pontos dá vazio', () => {
    expect(
      pontosDaPeca({
        pontos: { sentar_meio: [0, 1, 0] },
        pontos_de_jogo: [{ tipo: 'sentar', ponto: [0, 2, 0], nome: 'meio' }],
      }).sentar_meio,
    ).toEqual({ position: [0, 1, 0] })
    expect(pontosDaPeca({})).toEqual({})
  })
})
