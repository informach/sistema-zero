import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { boasVindas } from '../src/sistemas/abertura'
import { registrarNaPraia } from '../src/sistemas/colecoes-da-praia'
import {
  corDaSuaIlha,
  DURACAO_DA_COR_S,
  passoDaCor,
  QUANTO_DESBOTADO,
} from '../src/sistemas/cor-da-sua-ilha'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

describe('a cor da sua ilha (§6.28, A17)', () => {
  test('na chegada só o quarto tem cor: casa, horta e píer desbotados', () => {
    expect(corDaSuaIlha(inicial())).toEqual({ casa: false, horta: false, pier: false })
    expect(boasVindas('Lia')).toContain('Só o seu quarto ainda tem cor.')
  })

  test('cada parte ganha cor com o que a criança faz, e não volta a desbotar', () => {
    const s = inicial()
    const comPorta = { ...s, casa: { ...s.casa, portaNova: true } }
    expect(corDaSuaIlha(comPorta)).toEqual({ casa: true, horta: false, pier: false })
    const colheu = {
      ...comPorta,
      projetos: {
        ...comPorta.projetos,
        geladeira: { ganhoEm: s.criadoEm, aparencia: null, aparencias: [] },
      },
    }
    expect(corDaSuaIlha(colheu).horta).toBe(true)
    const pescou = registrarNaPraia(colheu, 'peixe-sardinha')
    expect(corDaSuaIlha(pescou)).toEqual({ casa: true, horta: true, pier: true })
  })

  test('na casa de um irmão tudo aparece com cor', () => {
    expect(corDaSuaIlha(inicial(), true)).toEqual({ casa: true, horta: true, pier: true })
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
