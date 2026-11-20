import { afterEach, describe, expect, test } from 'bun:test'
import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { criarConferenciaDoMolda } from '../../src/application/cenarios/molda-dos-cenarios'
import {
  invalidateToolOwnership,
  resetToolOwnershipCacheForTests,
} from '../../src/application/creations/tool-ownership-cache'
import type { Ator } from '../../src/domain/cenarios/cenarios'
import { CenariosIndisponiveisError } from '../../src/domain/cenarios/cenarios.errors'

const CONTA = '11111111-1111-4111-8111-111111111111'
const PERFIL = '33333333-3333-4333-8333-333333333333'
const crianca: Ator = {
  usuarioId: PERFIL,
  contaId: CONTA,
  equipe: false,
  suporte: false,
  perfil: true,
}
const adulto: Ator = {
  usuarioId: CONTA,
  contaId: CONTA,
  equipe: false,
  suporte: false,
  perfil: false,
}

function montar(
  o: {
    produto?: string[]
    kids?: string[]
    adulto?: string[]
    curriculo?: boolean
    falha?: boolean
  } = {},
) {
  const chamadas = { produto: [] as string[][], kids: 0, adulto: 0 }
  let agora = 1_000_000
  const conferencia = criarConferenciaDoMolda({
    agora: () => agora,
    accessCheck: {
      execute: async (_conta, refs) => {
        chamadas.produto.push(refs)
        if (o.falha) throw Error('fora do ar')
        const tem = refs.filter((r) => (o.produto ?? []).includes(r))
        return { grants: tem, communities: [] } as never
      },
    },
    kidsJourney: {
      get: async () => {
        chamadas.kids += 1
        if (o.falha) throw Error('fora do ar')
        return { earned: { capabilities: o.kids ?? [] } } as never
      },
    },
    adultJourney: {
      get: async () => {
        chamadas.adulto += 1
        return {
          capabilities: o.adulto ?? [],
          ...(o.curriculo ? { curriculum: {} } : {}),
        } as never
      },
    },
  })
  return {
    conferir: conferencia.produto,
    faixas: conferencia.faixas,
    chamadas,
    passar: (ms: number) => (agora += ms),
  }
}

afterEach(() => resetToolOwnershipCacheForTests())

describe('o Molda de quem abre os cenários', () => {
  test('no Kids: o produto Molda do Kids e a capacidade molda do perfil', async () => {
    const ref = creativeToolAccessRef('molda', 'kids')
    expect(await montar({ produto: [ref], kids: ['molda'] }).conferir(crianca)).toBe(true)
    resetToolOwnershipCacheForTests()
    expect(await montar({ produto: [ref], kids: [] }).conferir(crianca)).toBe(false)
    resetToolOwnershipCacheForTests()
    expect(await montar({ produto: [], kids: ['molda'] }).conferir(crianca)).toBe(false)
  })

  test('no adulto: o produto adulto e a capacidade da jornada adulta', async () => {
    const ref = creativeToolAccessRef('molda', 'adult')
    const { conferir, chamadas } = montar({ produto: [ref], adulto: ['molda'] })
    expect(await conferir(adulto)).toBe(true)
    expect(chamadas.produto).toEqual([[ref]])
    expect(chamadas).toMatchObject({ kids: 0, adulto: 1 })
    resetToolOwnershipCacheForTests()
    expect(
      await montar({
        produto: [creativeToolAccessRef('molda', 'kids')],
        adulto: ['molda'],
      }).conferir(adulto),
    ).toBe(false)
  })

  test('o "pode" fica 60 s na memória e a revogação da matrícula o apaga na hora', async () => {
    const ref = creativeToolAccessRef('molda', 'kids')
    const { conferir, chamadas, passar } = montar({ produto: [ref], kids: ['molda'] })
    await conferir(crianca)
    await conferir(crianca)
    expect(chamadas.produto).toHaveLength(1)
    expect(chamadas.kids).toBe(1)
    invalidateToolOwnership(CONTA)
    await conferir(crianca)
    expect(chamadas.produto).toHaveLength(2)
    expect(chamadas.kids).toBe(2)
    passar(61_000)
    await conferir(crianca)
    expect(chamadas.produto).toHaveLength(3)
    expect(chamadas.kids).toBe(3)
  })

  test('recusa não fica guardada e leitura que falha vira indisponível, nunca "não tem"', async () => {
    const { conferir, chamadas } = montar({
      produto: [creativeToolAccessRef('molda', 'kids')],
      kids: [],
    })
    expect(await conferir(crianca)).toBe(false)
    expect(await conferir(crianca)).toBe(false)
    expect(chamadas.kids).toBe(2)
    expect(
      await montar({ falha: true })
        .conferir(crianca)
        .catch((e) => e),
    ).toBeInstanceOf(CenariosIndisponiveisError)
  })

  test('as faixas seguem a jornada: uma capacidade por faixa, e o adulto antigo tem todas', async () => {
    expect(await montar({ kids: ['molda', 'molda-intermediate'] }).faixas(crianca)).toEqual([
      'basic',
      'intermediate',
    ])
    resetToolOwnershipCacheForTests()
    expect(await montar({ kids: ['molda-professional'] }).faixas(crianca)).toEqual(['professional'])
    resetToolOwnershipCacheForTests()
    expect(await montar({ adulto: ['molda'] }).faixas(adulto)).toEqual([
      'basic',
      'intermediate',
      'professional',
    ])
    resetToolOwnershipCacheForTests()
    expect(await montar({ adulto: ['molda'], curriculo: true }).faixas(adulto)).toEqual(['basic'])
    resetToolOwnershipCacheForTests()
    expect(
      await montar({ falha: true, kids: ['molda'] })
        .faixas(crianca)
        .catch((e) => e),
    ).toBeInstanceOf(CenariosIndisponiveisError)
  })
})
