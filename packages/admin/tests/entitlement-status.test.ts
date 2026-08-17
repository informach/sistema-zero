import { describe, expect, test } from 'bun:test'
import { ENTITLEMENT_BADGE_LABEL, entitlementBadge } from '../src/lib/entitlement-status'

describe('entitlementBadge', () => {
  test('⭐ `active` com validade vencida vira "Vencida", não "Ativo"', () => {
    // O caso do incidente de 08/2026: a renovação não chegou, o acesso caiu, e a
    // coluna do banco continuou 'active' — o painel dizia "Ativo" em verde.
    const badge = entitlementBadge({ status: 'active', activeNow: false })
    expect(badge).toBe('lapsed')
    expect(ENTITLEMENT_BADGE_LABEL[badge]).toBe('Vencida')
  })

  test('`active` com acesso liberado continua "Ativo"', () => {
    expect(entitlementBadge({ status: 'active', activeNow: true })).toBe('active')
  })

  test('revogada e expirada mantêm o próprio nome (não viram "Vencida")', () => {
    // Cancelamento e fim de prazo são coisas diferentes para quem atende o cliente.
    expect(entitlementBadge({ status: 'revoked', activeNow: false })).toBe('revoked')
    expect(entitlementBadge({ status: 'expired', activeNow: false })).toBe('expired')
  })

  test('members SEM o campo cai no comportamento antigo (nada vira "Vencida")', () => {
    // Compatibilidade: painel novo × serviço velho não pode chamar tudo de vencido.
    expect(entitlementBadge({ status: 'active' })).toBe('active')
  })

  test('status desconhecido não quebra a tela', () => {
    expect(entitlementBadge({ status: 'coisa-nova', activeNow: false })).toBe('active')
    expect(entitlementBadge({ status: 'pending', activeNow: false })).toBe('pending')
  })
})
