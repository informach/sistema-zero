import { describe, expect, it } from 'bun:test'
import { lintLightCopy } from '../src/lib/lightcopy'

const rules = (t: string) =>
  lintLightCopy(t)
    .map((i) => i.rule)
    .sort((a, b) => a - b)

describe('lintLightCopy (front, espelha o backend)', () => {
  it('texto limpo não acusa nada', () => {
    expect(lintLightCopy('Você adia a conversa difícil há meses. Veja como destravar.')).toEqual([])
  })

  it('travessão sim, hífen composto não', () => {
    expect(rules('Faça isso — agora')).toEqual([1])
    expect(lintLightCopy('A caixa-preta do método fica clara.')).toEqual([])
  })

  it('exclamação e pergunta no gancho', () => {
    expect(rules('Compre hoje!')).toEqual([2])
    expect(rules('Você quer isso? Existe um padrão.')).toEqual([3])
    expect(rules('Existe um padrão. Você reparou?')).toEqual([])
  })

  it('"não é X. é Y." e as muletas', () => {
    expect(rules('Não é um curso. É uma transformação de verdade.')).toContain(4)
    expect(rules('Emagreça sem precisar de dieta')).toEqual([6])
  })

  it('acumula em ordem', () => {
    expect(rules('Você quer isso? Emagreça sem precisar de dieta — de verdade!')).toEqual([
      1, 2, 3, 6,
    ])
  })
})
