import { describe, expect, test } from 'bun:test'
import { entitlementBadge } from '../src/lib/entitlement-status'

describe('entitlementBadge', () => {
  test('⭐ `active` com validade vencida vira "lapsed" (o selo diz "Vencida")', () => {
    // O caso do incidente de 08/2026: a renovação não chegou, o acesso caiu, e a
    // coluna do banco continuou 'active' — o painel dizia "Ativo" em verde.
    expect(entitlementBadge({ status: 'active', activeNow: false })).toBe('lapsed')
  })

  test('`active` com acesso liberado continua "active"', () => {
    expect(entitlementBadge({ status: 'active', activeNow: true })).toBe('active')
  })

  test('revogada e expirada mantêm o próprio nome (não viram "lapsed")', () => {
    // Cancelamento e fim de prazo são coisas diferentes para quem atende o cliente.
    expect(entitlementBadge({ status: 'revoked', activeNow: false })).toBe('revoked')
    expect(entitlementBadge({ status: 'expired', activeNow: false })).toBe('expired')
  })

  test('members SEM o campo cai no comportamento antigo (nada vira "lapsed")', () => {
    // Compatibilidade: painel novo × serviço velho não pode chamar tudo de vencido.
    expect(entitlementBadge({ status: 'active' })).toBe('active')
  })

  test('⚠️ status DESCONHECIDO passa direto, não vira "active"', () => {
    // A 1ª versão devolvia 'active' no default e um status futuro apareceria como
    // "Ativo" — pior que o problema que a função foi escrita para resolver.
    expect(entitlementBadge({ status: 'coisa-nova', activeNow: false })).toBe('coisa-nova')
    expect(entitlementBadge({ status: 'pending', activeNow: false })).toBe('pending')
  })
})
