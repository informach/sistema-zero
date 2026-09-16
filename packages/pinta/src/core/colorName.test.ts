import { describe, expect, it } from 'bun:test'
import { colorNameFor } from './colorName'
import { COPY } from './copy'

describe('o nome de uma cor para quem não a enxerga', () => {
  it('cor da paleta tem nome próprio, sem "parecido com"', () => {
    expect(colorNameFor('#ff8135')).toBe('laranja')
    expect(colorNameFor('#000000')).toBe('preto')
    // Maiúsculas e sem `#` também casam (desenho antigo guarda assim).
    expect(colorNameFor('FF8135')).toBe('laranja')
  })

  it('cor de FORA da paleta vira "parecido com <a mais próxima>"', () => {
    // #ff9221 é o laranja de uma pixel art: perto do #ff8135 da paleta.
    expect(colorNameFor('#ff9221')).toBe(COPY.vector.colorApprox('laranja'))
    expect(colorNameFor('#010203')).toBe(COPY.vector.colorApprox('preto'))
  })

  it('a escolha é a MAIS parecida, não a primeira do mapa', () => {
    // Um verde escuro: o mapa começa no branco e no vermelho, então pegar "o
    // primeiro" devolveria outra coisa.
    expect(colorNameFor('#4aa030')).toBe(COPY.vector.colorApprox('verde'))
    // Um azul bem claro fica com o azul claro, não com o escuro.
    expect(colorNameFor('#8ef0ff')).toBe(COPY.vector.colorApprox('azul claro'))
  })

  it('hex inválido volta como veio, sem lançar no meio de um anúncio', () => {
    expect(colorNameFor('não é cor')).toBe('não é cor')
  })
})
