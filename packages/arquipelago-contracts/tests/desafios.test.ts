import { describe, expect, test } from 'bun:test'
import {
  blocosExigidos,
  ConteudoDoDesafioV1Schema,
  type CurriculoDeBlocos,
  coberturaDosBlocos,
  DesafioAbertoSchema,
  DesafioNaListaSchema,
  MetadadosDoDesafioSchema,
  MOEDAS_PADRAO,
  migrarConteudoDoDesafio,
} from '../src'

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const conteudo = {
  versao: 1 as const,
  titulo: 'A borboleta que voa',
  enunciado: 'Faça a borboleta voar até a flor.',
  dicas: ['Use o bloco de mover.'],
  projetoInicial: projeto,
  gabarito: projeto,
  objetivos: [
    { id: 'o1', label: 'A borboleta chega na flor', rule: { type: 'usesBlock', block: 'x' } },
  ],
  recompensa: { cor: true, moedas: MOEDAS_PADRAO.principal, moedasExtra: MOEDAS_PADRAO.extra },
  blocosManuais: { acrescentar: [], retirar: [] },
}

describe('cadastro do desafio', () => {
  test('conteúdo V1 válido passa e lido de novo volta igual', () => {
    expect(ConteudoDoDesafioV1Schema.safeParse(conteudo).success).toBe(true)
    expect(migrarConteudoDoDesafio(conteudo)?.titulo).toBe('A borboleta que voa')
    expect(migrarConteudoDoDesafio({ versao: 2 })).toBeNull()
  })

  test('sem objetivo, sem projeto ou moedas acima do teto: recusado', () => {
    expect(ConteudoDoDesafioV1Schema.safeParse({ ...conteudo, objetivos: [] }).success).toBe(false)
    expect(ConteudoDoDesafioV1Schema.safeParse({ ...conteudo, gabarito: null }).success).toBe(false)
    expect(
      ConteudoDoDesafioV1Schema.safeParse({
        ...conteudo,
        recompensa: { ...conteudo.recompensa, moedas: 501 },
      }).success,
    ).toBe(false)
  })

  test('só o Quadro das Cores tem número de quadro, e ele sempre tem', () => {
    const base = { slug: 'borboleta', publico: 'kids', ilha: 'bosque', ordem: 0 }
    expect(
      MetadadosDoDesafioSchema.safeParse({ ...base, tipo: 'quadro-das-cores', quadro: 2 }).success,
    ).toBe(true)
    expect(
      MetadadosDoDesafioSchema.safeParse({ ...base, tipo: 'quadro-das-cores', quadro: null })
        .success,
    ).toBe(false)
    expect(
      MetadadosDoDesafioSchema.safeParse({ ...base, tipo: 'desafio-do-dia', quadro: 1 }).success,
    ).toBe(false)
    expect(
      MetadadosDoDesafioSchema.safeParse({ ...base, tipo: 'quadro-das-cores', quadro: 7 }).success,
    ).toBe(false)
  })
})

describe('o que a pessoa recebe', () => {
  test('gabarito e regra não passam nas visões da pessoa', () => {
    const aberto = {
      id: '00000000-0000-4000-8000-000000000001',
      revisao: 1,
      titulo: 't',
      enunciado: 'e',
      dicas: [],
      desafioExtra: null,
      objetivos: [{ id: 'o1', label: 'l', kind: 'block' }],
      projetoInicial: projeto,
      ultimosResultados: [],
      concluido: false,
    }
    expect(DesafioAbertoSchema.safeParse(aberto).success).toBe(true)
    expect(DesafioAbertoSchema.safeParse({ ...aberto, gabarito: projeto }).success).toBe(false)
    expect(
      DesafioAbertoSchema.safeParse({
        ...aberto,
        objetivos: [{ id: 'o1', label: 'l', kind: 'block', rule: {} }],
      }).success,
    ).toBe(false)
    expect(DesafioNaListaSchema.shape).not.toHaveProperty('gabarito')
  })
})

describe('blocos exigidos e cobertura', () => {
  test('gabarito + acrescentados − retirados, sem repetir', () => {
    expect(blocosExigidos(['b', 'a', 'c'], { acrescentar: ['d', 'a'], retirar: ['c'] })).toEqual([
      'a',
      'b',
      'd',
    ])
  })

  const curriculo: CurriculoDeBlocos = {
    versao: 1,
    cursos: [
      {
        courseId: '00000000-0000-4000-8000-000000000001',
        titulo: 'Curso cedo',
        slug: 'cedo',
        posto: 'coder',
        papel: 'base2d',
        blocos: ['cedo'],
      },
      {
        courseId: '00000000-0000-4000-8000-000000000002',
        titulo: 'Curso tarde',
        slug: 'tarde',
        posto: 'elite',
        papel: 'power',
        blocos: ['tarde'],
      },
    ],
    catalogo: [
      { type: 'cedo', rotulo: 'Cedo', categoria: 'x' },
      { type: 'tarde', rotulo: 'Tarde', categoria: 'x' },
      { type: 'orfao', rotulo: 'Órfão', categoria: 'x' },
    ],
  }

  test('avisa bloco sem curso, desconhecido e curso depois do posto da ilha', () => {
    const r = coberturaDosBlocos(['cedo', 'tarde', 'orfao', 'inventado'], curriculo, 'hacker')
    expect(r.map((c) => [c.bloco, c.avisos])).toEqual([
      ['cedo', []],
      ['tarde', ['curso-depois-da-ilha']],
      ['orfao', ['sem-curso']],
      ['inventado', ['bloco-desconhecido', 'sem-curso']],
    ])
    expect(r[0]?.rotulo).toBe('Cedo')
  })
})
