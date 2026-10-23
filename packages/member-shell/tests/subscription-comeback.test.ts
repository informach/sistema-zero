import { describe, expect, test } from 'bun:test'
import {
  comebackSubscriptionId,
  isAdultComunidadeSubscription,
  isKidsComunidadeSubscription,
} from '../src/lib/subscription-comeback'

/**
 * O botão de voltar para a Comunidade (Compras adulto e Conta dos pais). A view do payments só
 * traz o nome do produto: Kids "Comunidade dos Criadores", adulto "Comunidade dos Criadores
 * (adultos)". Só a Encerrada mais recente ganha o botão; a Cancelada ainda tem acesso.
 */

const sub = (id: string, status: string, description: string | null, createdAt: string) => ({
  id,
  status,
  description,
  createdAt,
})

const KIDS = 'Comunidade dos Criadores'
const ADULT = 'Comunidade dos Criadores (adultos)'

describe('o público da assinatura pelo nome', () => {
  test('adulto exige a marca "(adultos)"', () => {
    expect(isAdultComunidadeSubscription({ description: ADULT })).toBe(true)
    expect(isAdultComunidadeSubscription({ description: KIDS })).toBe(false)
    expect(isAdultComunidadeSubscription({ description: 'Curso adulto' })).toBe(false)
    expect(isAdultComunidadeSubscription({ description: null })).toBe(false)
  })

  test('Kids é o nome da Comunidade sem a marca', () => {
    expect(isKidsComunidadeSubscription({ description: KIDS })).toBe(true)
    expect(isKidsComunidadeSubscription({ description: ADULT })).toBe(false)
    expect(isKidsComunidadeSubscription({ description: 'Plano da família' })).toBe(false)
    expect(isKidsComunidadeSubscription({ description: null })).toBe(false)
  })
})

describe('comebackSubscriptionId', () => {
  test('a Encerrada mais recente do produto ganha o botão', () => {
    expect(
      comebackSubscriptionId(
        [
          sub('velha', 'EXPIRED', ADULT, '2026-01-01T00:00:00Z'),
          sub('nova', 'EXPIRED', ADULT, '2026-05-01T00:00:00Z'),
          sub('kids', 'EXPIRED', KIDS, '2026-06-01T00:00:00Z'),
        ],
        isAdultComunidadeSubscription,
      ),
    ).toBe('nova')
  })

  test('Cancelada não ganha o botão e segura o de uma Encerrada mais antiga', () => {
    expect(
      comebackSubscriptionId(
        [sub('a', 'CANCELED', ADULT, '2026-05-01')],
        isAdultComunidadeSubscription,
      ),
    ).toBeNull()
    expect(
      comebackSubscriptionId(
        [sub('a', 'EXPIRED', KIDS, '2026-01-01'), sub('b', 'CANCELED', KIDS, '2026-05-01')],
        isKidsComunidadeSubscription,
      ),
    ).toBeNull()
  })

  test('com uma Ativa do mesmo produto, nenhuma; a Pendente não segura o botão', () => {
    expect(
      comebackSubscriptionId(
        [sub('a', 'EXPIRED', KIDS, '2026-01-01'), sub('b', 'ACTIVE', KIDS, '2026-05-01')],
        isKidsComunidadeSubscription,
      ),
    ).toBeNull()
    expect(
      comebackSubscriptionId(
        [sub('a', 'EXPIRED', KIDS, '2026-01-01'), sub('b', 'PENDING', KIDS, '2026-05-01')],
        isKidsComunidadeSubscription,
      ),
    ).toBe('a')
    // A ativa de OUTRO público não segura o botão.
    expect(
      comebackSubscriptionId(
        [sub('a', 'EXPIRED', ADULT, '2026-01-01'), sub('b', 'ACTIVE', KIDS, '2026-05-01')],
        isAdultComunidadeSubscription,
      ),
    ).toBe('a')
  })

  test('sem assinatura do produto, nenhuma', () => {
    expect(comebackSubscriptionId([], isKidsComunidadeSubscription)).toBeNull()
    expect(
      comebackSubscriptionId(
        [sub('a', 'EXPIRED', 'Outro produto', '2026-01-01')],
        isAdultComunidadeSubscription,
      ),
    ).toBeNull()
  })
})
