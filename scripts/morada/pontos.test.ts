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

  test('os formatos da pista da arte: canteiro, porta, quina; escada fica de fora', () => {
    const pontos = pontosDaPeca({
      pontos_de_jogo: [
        {
          tipo: 'plantar',
          celulas: [
            [-0.6, -0.2],
            [0.6, 0.2],
          ],
          tamanho_celula_m: 0.4,
          altura_m: 0.19,
        },
        { tipo: 'entrar', vao: { largura_m: 0.9 }, posicao: [1, 0, 0], direcao: [0, 0, 1] },
        { tipo: 'agarrar', nome: 'frente', de: [-2, 1.5, 3], ate: [2, 1.5, 3], fora: [0, 0, 1] },
        { tipo: 'subir', pe: [0, 0, 0.3], topo: [0, 3, 0] },
      ],
    })
    expect(pontos).toEqual({
      plantar_0: { position: [0, 0.19, 0] },
      entrar_1: { position: [1, 0, 0], direction: [0, 0, 1] },
      agarrar_frente: { position: [0, 1.5, 3], direction: [0, 0, 1] },
    })
  })

  test('campo em formato errado pára a migração; célula com NaN não vale', () => {
    expect(() => pontosDaPeca({ id: 'x', pontos: 'lixo' })).toThrow()
    expect(() => pontosDaPeca({ id: 'x', pontos_de_jogo: { tipo: 'sentar' } })).toThrow()
    expect(
      pontosDaPeca({
        pontos_de_jogo: [{ tipo: 'plantar', celulas: [[Number.NaN, 0]], altura_m: 0.19 }],
      }),
    ).toEqual({})
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
