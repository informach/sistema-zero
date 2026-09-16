import { describe, expect, test } from 'bun:test'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import { checkOfferContract } from '../../src/server/offer-contract'

const fixedThirtyDays = {
  pricingMode: 'one_time' as const,
  accessMode: 'fixed' as const,
  accessDurationValue: 30,
  accessDurationUnit: 'days' as const,
  guaranteeDays: 7,
}

describe('contrato entre a copy do funil e a oferta configurada', () => {
  test('o Desafio declara em código a promessa de 30 dias mostrada na página', () => {
    expect(DESAFIO_PRIMEIRO_JOGO.offerContract).toEqual(fixedThirtyDays)
  })

  test('aceita somente a política de acesso declarada pelo funil', () => {
    const contract = DESAFIO_PRIMEIRO_JOGO.offerContract
    expect(checkOfferContract(contract, fixedThirtyDays)).toEqual({ ok: true })
    expect(
      checkOfferContract(contract, {
        pricingMode: 'one_time',
        accessMode: 'lifetime',
        accessDurationValue: null,
        accessDurationUnit: null,
        guaranteeDays: 7,
      }),
    ).toMatchObject({ ok: false, reason: 'policy_mismatch' })
    expect(checkOfferContract(contract, { ...fixedThirtyDays, guaranteeDays: 14 })).toMatchObject({
      ok: false,
      reason: 'policy_mismatch',
    })
  })

  test('falha fechada quando o catálogo não devolve a oferta', () => {
    expect(checkOfferContract(DESAFIO_PRIMEIRO_JOGO.offerContract, null)).toEqual({
      ok: false,
      reason: 'offer_unavailable',
    })
  })

  test('funil sem promessa rígida continua aceitando a oferta dinâmica', () => {
    expect(checkOfferContract(undefined, null)).toEqual({ ok: true })
  })
})
