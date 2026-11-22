import { describe, expect, test } from 'bun:test'
import {
  CenarioInvalido,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  errosDasRegioes,
  familiasMudadas,
  type RegiaoDeCenario,
  validarDocumento,
} from '../src/v2'

/**
 * As regiões no documento v2 (lote 5 da conclusão, 22/11/2026; formato em
 * `docs/estudio-evolucao/regioes-3d-especificacao.md`).
 */
const regiao = (
  id: string,
  nome: string,
  caixa: [number, number, number, number],
  vizinhas: string[] = [],
): RegiaoDeCenario => ({
  id,
  nome,
  caixa: { x0: caixa[0], z0: caixa[1], x1: caixa[2], z1: caixa[3] },
  vizinhas,
})

function comRegioes(regioes: RegiaoDeCenario[] | undefined): DocumentoDeCenario {
  // Base plana de 256 por 256 metros, centrada na origem: de -128 a 128 nos dois eixos.
  const d = criarDocumentoVazio('ilha', 'Ilha')
  if (regioes) d.regioes = regioes
  return d
}

const recados = (d: DocumentoDeCenario) => {
  try {
    validarDocumento(d)
    return []
  } catch (erro) {
    if (!(erro instanceof CenarioInvalido)) throw erro
    return erro.problemas
  }
}

describe('as regiões do documento', () => {
  test('o cenário sem regiões continua igual, e o com regiões em par e sem sobreposição vale', () => {
    expect(recados(comRegioes(undefined))).toEqual([])
    expect(
      recados(
        comRegioes([
          regiao('vila', 'Vila', [-128, -128, 0, 0], ['floresta']),
          // Borda comum com a Vila (x = 0): encostar pode.
          regiao('floresta', 'Floresta', [0, -128, 128, 0], ['vila']),
        ]),
      ),
    ).toEqual([])
  })

  test('a lista vazia, mais de 64 regiões, nome comprido e campo desconhecido são recusados pelo esquema', () => {
    expect(DocumentoDeCenarioSchema.safeParse(comRegioes([])).success).toBe(false)
    const muitas = Array.from({ length: 65 }, (_, i) =>
      regiao(`r${i}`, `R${i}`, [-128 + i, -128, -127 + i, -127]),
    )
    expect(DocumentoDeCenarioSchema.safeParse(comRegioes(muitas)).success).toBe(false)
    expect(
      DocumentoDeCenarioSchema.safeParse(comRegioes([regiao('a', 'x'.repeat(61), [0, 0, 1, 1])]))
        .success,
    ).toBe(false)
    const extra = comRegioes([regiao('a', 'A', [0, 0, 1, 1])]) as unknown as {
      regioes: Record<string, unknown>[]
    }
    extra.regioes[0]!.cor = 'azul'
    expect(DocumentoDeCenarioSchema.safeParse(extra).success).toBe(false)
  })

  test('cada regra recusa com o recado em português', () => {
    const base = comRegioes(undefined).base
    expect(
      errosDasRegioes(
        [regiao('a', 'Vila', [0, 0, 10, 10]), regiao('a', 'Outra', [20, 20, 30, 30])],
        base,
      ),
    ).toContain('Região duplicada: a')
    expect(
      errosDasRegioes(
        [regiao('a', 'Vila', [0, 0, 10, 10]), regiao('b', ' vila ', [20, 20, 30, 30])],
        base,
      ),
    ).toContain('Já existe uma região chamada vila.')
    expect(errosDasRegioes([regiao('a', '   ', [0, 0, 10, 10])], base)).toContain(
      'A região a precisa de um nome.',
    )
    expect(errosDasRegioes([regiao('a', 'Vila', [5, 0, 5, 10])], base)).toContain(
      'A região Vila precisa ter largura e comprimento.',
    )
    expect(errosDasRegioes([regiao('a', 'Vila', [100, 0, 140, 10])], base)).toContain(
      'A região Vila sai da base do cenário.',
    )
    expect(errosDasRegioes([regiao('a', 'Vila', [0, 0, 10, 10], ['a'])], base)).toContain(
      'A região Vila não pode ser vizinha dela mesma.',
    )
    expect(errosDasRegioes([regiao('a', 'Vila', [0, 0, 10, 10], ['zz'])], base)).toContain(
      'A região Vila cita uma vizinha que não existe: zz',
    )
    expect(
      errosDasRegioes(
        [regiao('a', 'Vila', [0, 0, 10, 10], ['b']), regiao('b', 'Mata', [10, 0, 20, 10])],
        base,
      ),
    ).toEqual(['A região Vila tem Mata como vizinha, mas Mata não tem Vila.'])
    expect(
      errosDasRegioes(
        [
          regiao('a', 'Vila', [0, 0, 10, 10], ['b', 'b']),
          regiao('b', 'Mata', [10, 0, 20, 10], ['a']),
        ],
        base,
      ),
    ).toEqual(['A região Vila repete a vizinha b.'])
    expect(
      errosDasRegioes(
        [regiao('a', 'Vila', [0, 0, 10, 10]), regiao('b', 'Mata', [9, 0, 20, 10])],
        base,
      ),
    ).toEqual(['As regiões Vila e Mata se sobrepõem. Elas podem encostar pela borda.'])
  })

  test('no terreno a caixa vai da origem até colunas vezes o passo; no relevo de perfil não há regiões', () => {
    const terreno = {
      tipo: 'terreno',
      origem: { x: 10, z: 20 },
      passo: 2,
      colunas: 64,
      linhas: 32,
    } as unknown as DocumentoDeCenario['base']
    expect(errosDasRegioes([regiao('a', 'Vila', [10, 20, 138, 84])], terreno)).toEqual([])
    expect(errosDasRegioes([regiao('a', 'Vila', [10, 20, 139, 84])], terreno)).toEqual([
      'A região Vila sai da base do cenário.',
    ])
    const perfil = {
      tipo: 'perfil',
      perfil: 'arquipelago',
      versao: '1',
      carimbos: [],
    } as DocumentoDeCenario['base']
    expect(errosDasRegioes([regiao('a', 'Vila', [0, 0, 10, 10])], perfil)).toEqual([
      'Converta o relevo em terreno antes de desenhar regiões.',
    ])
  })

  test('criar ou mudar uma região é da família "Regiões"; apagar não conta', () => {
    const antes = comRegioes([regiao('vila', 'Vila', [-128, -128, 0, 0])])
    const depois = structuredClone(antes)
    depois.regioes![0]!.nome = 'Vilarejo'
    expect(familiasMudadas(antes, depois)).toEqual(['jogo.regioes'])
    expect(familiasMudadas(comRegioes(undefined), antes)).toEqual(['jogo.regioes'])
    expect(familiasMudadas(antes, comRegioes(undefined))).toEqual([])
  })

  test('apagar uma região com vizinha não conta como mudar a vizinha (revisão do lote 5)', () => {
    const antes = comRegioes([
      regiao('vila', 'Vila', [-128, -128, 0, 0], ['floresta']),
      regiao('floresta', 'Floresta', [0, -128, 128, 0], ['vila']),
    ])
    const depois = comRegioes([regiao('floresta', 'Floresta', [0, -128, 128, 0])])
    expect(familiasMudadas(antes, depois)).toEqual([])
    // Tirar a vizinha SEM apagar a região continua sendo mudança.
    const semPar = comRegioes([
      regiao('vila', 'Vila', [-128, -128, 0, 0]),
      regiao('floresta', 'Floresta', [0, -128, 128, 0]),
    ])
    expect(familiasMudadas(antes, semPar)).toEqual(['jogo.regioes'])
  })
})
