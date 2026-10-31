import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { boasVindas } from '../src/sistemas/abertura'
import { registrarNaPraia } from '../src/sistemas/colecoes-da-praia'
import {
  corDaSuaIlha,
  DURACAO_DA_COR_S,
  falaDaCorDaSuaIlha,
  PARTES_DA_SUA_ILHA,
  passoDaCor,
  QUANTO_DESBOTADO,
} from '../src/sistemas/cor-da-sua-ilha'

const SEM_COR = {
  casa: false,
  horta: false,
  pier: false,
  praia: false,
  gramado: false,
  trilha: false,
}
const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

describe('a cor da sua ilha (§6.28, A17)', () => {
  test('na chegada só o quarto tem cor: casa, horta e píer desbotados', () => {
    expect(corDaSuaIlha(inicial())).toEqual({ ...SEM_COR })
    expect(boasVindas('Lia')).toContain('Só o seu quarto ainda tem cor.')
  })

  test('cada parte ganha cor com o que a criança faz, e não volta a desbotar', () => {
    const s = inicial()
    const comPorta = { ...s, casa: { ...s.casa, portaNova: true } }
    expect(corDaSuaIlha(comPorta)).toEqual({ ...SEM_COR, casa: true })
    const colheu = {
      ...comPorta,
      projetos: {
        ...comPorta.projetos,
        geladeira: { ganhoEm: s.criadoEm, aparencia: null, aparencias: [] },
      },
    }
    expect(corDaSuaIlha(colheu).horta).toBe(true)
    const pescou = registrarNaPraia(colheu, 'peixe-sardinha')
    expect(corDaSuaIlha(pescou)).toEqual({ ...SEM_COR, casa: true, horta: true, pier: true })
  })

  test('na casa de um irmão tudo aparece com cor', () => {
    expect(Object.values(corDaSuaIlha(inicial(), true)).every(Boolean)).toBe(true)
  })

  test('a cor escorre no tempo certo, e com menos movimento vem na hora', () => {
    let q = QUANTO_DESBOTADO
    let t = 0
    while (q > 0 && t < 10) {
      q = passoDaCor(q, 0, 1 / 60, false)
      t += 1 / 60
    }
    expect(t).toBeCloseTo(DURACAO_DA_COR_S, 1)
    expect(passoDaCor(QUANTO_DESBOTADO, 0, 1 / 60, true)).toBe(0)
    expect(passoDaCor(0, QUANTO_DESBOTADO, 1 / 60, true)).toBe(QUANTO_DESBOTADO)
  })
})

describe('a cor da sua ilha por quadro (lacunas, 01/11/2026)', () => {
  test('cada quadro feito pinta a parte dele, somando com as ações', () => {
    expect(PARTES_DA_SUA_ILHA).toEqual(['casa', 'horta', 'pier', 'praia', 'gramado', 'trilha'])
    expect(corDaSuaIlha(inicial(), false, [4])).toEqual({ ...SEM_COR, praia: true })
    expect(corDaSuaIlha(inicial(), false, [1, 5, 6])).toEqual({
      ...SEM_COR,
      casa: true,
      gramado: true,
      trilha: true,
    })
    const tudo = corDaSuaIlha(inicial(), false, [1, 2, 3, 4, 5, 6])
    expect(Object.values(tudo).every(Boolean)).toBe(true)
  })

  test('o Zappy diz qual parte ganhou cor, sem travessão nem exclamação', () => {
    expect(falaDaCorDaSuaIlha([3])).toBe('Desafio feito. A cor voltou para o píer da sua ilha.')
    expect(falaDaCorDaSuaIlha([4, 6])).toBe(
      'Desafio feito. A cor voltou para a praia e a trilha das pedras da sua ilha.',
    )
    for (const q of [1, 2, 3, 4, 5, 6]) expect(falaDaCorDaSuaIlha([q])).not.toMatch(/[—–!?]/)
  })
})
