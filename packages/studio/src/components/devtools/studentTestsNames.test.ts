import { describe, expect, it } from 'bun:test'
import { studentTestNames } from './studentTestsNames'

/** Os nomes que o formulário de "Meus testes" oferece, a partir do script e dos blocos. */
describe('os nomes do jogo no formulário', () => {
  it('as variáveis do script, os sprites e os grupos dos blocos que os criam', () => {
    const blocos = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_g2d_create_group',
            fields: { NAME: 'esconderijos' },
            next: {
              block: {
                type: 'sz_g2d_create_image_sprite',
                fields: { NAME: 'esconderijo2', IMAGE: 'pedras' },
              },
            },
          },
        ],
      },
    }
    expect(studentTestNames('let achados = 0\nconst esconderijo2 = {}\n', blocos)).toEqual({
      variables: ['achados', 'esconderijo2'],
      sprites: ['esconderijo2'],
      groups: ['esconderijos'],
    })
  })

  it('sem blocos (código digitado na Ponte), as variáveis servem de sprite e de grupo', () => {
    expect(studentTestNames('let heroi = {}\n', null)).toEqual({
      variables: ['heroi'],
      sprites: ['heroi'],
      groups: ['heroi'],
    })
  })
})
