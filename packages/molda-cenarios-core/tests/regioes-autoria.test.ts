import { describe, expect, test } from 'bun:test'
import {
  comandosParaDefinirRegiao,
  criarDocumentoVazio,
  distanciaEntreCaixas,
  type EstadoDeCenario,
  encaixarCaixa,
  executarLote,
  type RegiaoDeCenario,
  vizinhasSugeridas,
} from '../src/v2'

/**
 * A autoria das regiões que a oficina e o agente dividem (lote 7 da conclusão, 22/11/2026): o lote
 * que mantém as vizinhas em par, as sugestões de vizinha e o "Encaixar na vizinha" a até 2 m.
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

const comRegioes = (regioes: RegiaoDeCenario[]): EstadoDeCenario => {
  const inicial: EstadoDeCenario = { documento: criarDocumentoVazio('ilha', 'Ilha'), revisao: 0 }
  if (!regioes.length) return inicial
  return executarLote(inicial, {
    revisaoEsperada: 0,
    comandos: regioes.map((r) => ({ tipo: 'regiao.definir' as const, regiao: r })),
  })
}

const vila = regiao('vila', 'Vila', [-128, -128, 0, 0], ['floresta'])
const floresta = regiao('floresta', 'Floresta', [0, -128, 128, 0], ['vila'])

describe('o lote que mantém as vizinhas em par', () => {
  test('uma região nova com vizinha grava as duas pontas', () => {
    const estado = comRegioes([])
    const lago = regiao('lago', 'Lago', [-128, 0, 0, 128])
    const primeiro = executarLote(estado, {
      revisaoEsperada: 0,
      comandos: comandosParaDefinirRegiao(undefined, lago),
    })
    const praia = regiao('praia', 'Praia', [0, 0, 128, 128], ['lago'])
    const comandos = comandosParaDefinirRegiao(primeiro.documento.regioes, praia)
    expect(comandos).toEqual([
      { tipo: 'regiao.definir', regiao: praia },
      { tipo: 'regiao.definir', regiao: { ...lago, vizinhas: ['praia'] } },
    ])
    const depois = executarLote(primeiro, { revisaoEsperada: 1, comandos })
    expect(depois.documento.regioes?.find((r) => r.id === 'lago')?.vizinhas).toEqual(['praia'])
  })

  test('tirar a vizinha tira dos dois lados; mudar só o nome não toca a outra', () => {
    const estado = comRegioes([vila, floresta])
    const sozinha = { ...vila, vizinhas: [] }
    const comandos = comandosParaDefinirRegiao(estado.documento.regioes, sozinha)
    expect(comandos).toHaveLength(2)
    const depois = executarLote(estado, { revisaoEsperada: 1, comandos })
    expect(depois.documento.regioes?.map((r) => r.vizinhas)).toEqual([[], []])
    expect(
      comandosParaDefinirRegiao(estado.documento.regioes, { ...vila, nome: 'Vila Nova' }),
    ).toHaveLength(1)
  })
})

describe('sugestões e encaixe', () => {
  test('a distância entre caixas e as vizinhas sugeridas a até 2 m', () => {
    expect(distanciaEntreCaixas(vila.caixa, floresta.caixa)).toBe(0)
    const longe = regiao('longe', 'Longe', [3, 10, 20, 20])
    const perto = regiao('perto', 'Perto', [1.5, 10, 20, 20])
    const caixa = { x0: -10, z0: 10, x1: 0, z1: 20 }
    expect(vizinhasSugeridas([longe, perto], caixa).map((r) => r.id)).toEqual(['perto'])
    // A própria região não se sugere.
    expect(vizinhasSugeridas([perto], perto.caixa, 'perto')).toEqual([])
  })

  test('as bordas a até 2 m encostam na vizinha; mais longe ficam onde estão', () => {
    const caixa = { x0: 1.5, z0: -100, x1: 60, z1: -10 }
    expect(encaixarCaixa([vila], caixa)).toEqual({ x0: 0, z0: -100, x1: 60, z1: -10 })
    const longe = { x0: 2.5, z0: -100, x1: 60, z1: -10 }
    expect(encaixarCaixa([vila], longe)).toEqual(longe)
    // De cima: a borda de baixo encosta na borda de cima da Vila (z = 0).
    expect(encaixarCaixa([vila], { x0: -50, z0: 1, x1: -10, z1: 40 })).toEqual({
      x0: -50,
      z0: 0,
      x1: -10,
      z1: 40,
    })
    // Quem não cruza na outra direção não puxa a borda.
    expect(encaixarCaixa([vila], { x0: 1, z0: 10, x1: 40, z1: 40 })).toEqual({
      x0: 1,
      z0: 10,
      x1: 40,
      z1: 40,
    })
  })
})
