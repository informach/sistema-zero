import { describe, expect, it } from 'bun:test'
import { lintLightCopy } from '../../src/domain/copy/light-copy'

function rules(text: string): number[] {
  return lintLightCopy(text)
    .map((i) => i.rule)
    .sort((a, b) => a - b)
}

describe('lintLightCopy (regras mecânicas do Light Copy)', () => {
  it('texto limpo não acusa nada', () => {
    expect(
      lintLightCopy('Você adia a conversa difícil há meses. Veja como destravar em 4 semanas.'),
    ).toEqual([])
  })

  it('1 — travessão (em-dash e en-dash), mas não o hífen composto', () => {
    expect(rules('Faça isso — agora')).toEqual([1])
    expect(rules('Faça isso – agora')).toEqual([1])
    expect(lintLightCopy('A caixa-preta do método fica clara.')).toEqual([])
  })

  it('2 — ponto de exclamação', () => {
    expect(rules('Compre hoje.')).toEqual([])
    expect(rules('Compre hoje!')).toEqual([2])
  })

  it('3 — pergunta SÓ quando é a primeira frase (gancho)', () => {
    expect(rules('Você quer parar de sofrer? Existe um padrão.')).toEqual([3])
    // Pergunta no meio, não no gancho → não acusa a 3.
    expect(rules('Existe um padrão. Você já reparou nele?')).toEqual([])
  })

  it('4 — estrutura "Não é X. É Y."', () => {
    expect(rules('Não é um curso. É uma transformação de verdade.')).toContain(4)
    expect(rules('Não é fácil ganhar músculo em casa.')).not.toContain(4)
  })

  it('6 — "mesmo que" e "sem precisar"', () => {
    expect(rules('Emagreça sem precisar de dieta')).toEqual([6])
    expect(rules('Funciona mesmo que você nunca tenha treinado')).toEqual([6])
  })

  it('acumula várias regras e mantém a ordem por número', () => {
    expect(rules('Você quer isso? Emagreça sem precisar de dieta — de verdade!')).toEqual([
      1, 2, 3, 6,
    ])
  })
})
