import { describe, expect, test } from 'bun:test'
import { ConteudoDoDesafioV1Schema, MOEDAS_PADRAO, ObjetivoDoDesafioSchema } from '../src'

const comportamento = {
  type: 'behavior',
  steps: [{ action: 'click', x: 320, y: 400 }],
  expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 1 },
}
const python = {
  id: 'acertar',
  label: 'Acertar a bolha soma um ponto',
  programmingLanguage: 'python' as const,
  profileId: 'python-browser',
  rule: comportamento,
}

describe('objetivos Python dos desafios (C02)', () => {
  test('aceita o objetivo Python com perfil e entradas', () => {
    expect(ObjetivoDoDesafioSchema.safeParse(python).success).toBe(true)
    expect(ObjetivoDoDesafioSchema.safeParse({ ...python, stdin: ['7', ''] }).success).toBe(true)
    expect(
      ObjetivoDoDesafioSchema.safeParse({ ...python, optional: true, hint: 'Clique na bolha.' })
        .success,
    ).toBe(true)
  })

  test('o objetivo Python sem perfil, com perfil inválido ou entradas demais é recusado', () => {
    const { profileId: _, ...semPerfil } = python
    expect(ObjetivoDoDesafioSchema.safeParse(semPerfil).success).toBe(false)
    expect(ObjetivoDoDesafioSchema.safeParse({ ...python, profileId: 'Perfil' }).success).toBe(
      false,
    )
    expect(
      ObjetivoDoDesafioSchema.safeParse({ ...python, stdin: ['1', '2', '3', '4', '5'] }).success,
    ).toBe(false)
    expect(ObjetivoDoDesafioSchema.safeParse({ ...python, stdin: ['a\nb'] }).success).toBe(false)
  })

  test('perfil e entradas são só do Python; outra linguagem é recusada', () => {
    const javascript = { id: 'o1', label: 'Andar', rule: comportamento }
    expect(ObjetivoDoDesafioSchema.safeParse(javascript).success).toBe(true)
    expect(
      ObjetivoDoDesafioSchema.safeParse({ ...javascript, programmingLanguage: 'javascript' })
        .success,
    ).toBe(true)
    expect(
      ObjetivoDoDesafioSchema.safeParse({ ...javascript, profileId: 'python-browser' }).success,
    ).toBe(false)
    expect(ObjetivoDoDesafioSchema.safeParse({ ...javascript, stdin: ['1'] }).success).toBe(false)
    expect(
      ObjetivoDoDesafioSchema.safeParse({ ...javascript, programmingLanguage: 'ruby' }).success,
    ).toBe(false)
  })

  test('o conteúdo do desafio guarda o objetivo Python sem perder campos', () => {
    const conteudo = ConteudoDoDesafioV1Schema.parse({
      versao: 1,
      titulo: 'Mira de bolhas',
      enunciado: 'Clique na bolha para soltar o vagalume.',
      dicas: [],
      projetoInicial: { programmingLanguage: 'python' },
      gabarito: { programmingLanguage: 'python' },
      objetivos: [{ ...python, stdin: ['1'] }],
      recompensa: { cor: false, moedas: MOEDAS_PADRAO.principal, moedasExtra: 0 },
      blocosManuais: { acrescentar: [], retirar: [] },
    })
    expect(conteudo.objetivos[0]).toEqual({ ...python, stdin: ['1'] })
  })
})
