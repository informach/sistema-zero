import { describe, expect, it } from 'bun:test'
import { canAddProfile, resolveProfileAllowance } from '../src/lib/profile-allowance'

describe('resolveProfileAllowance — fronteira members → tela de perfis', () => {
  it('não confunde falha da API com acesso sem limite conhecido', () => {
    expect(resolveProfileAllowance({ status: 503, maxProfiles: null })).toEqual({
      kind: 'unavailable',
    })
    expect(canAddProfile({ kind: 'unavailable' }, 0)).toBe(false)
  })

  it('maxProfiles 0 significa que a conta não tem direito a perfil', () => {
    expect(resolveProfileAllowance({ status: 200, maxProfiles: 0 })).toEqual({ kind: 'none' })
    expect(canAddProfile({ kind: 'none' }, 0)).toBe(false)
  })

  it('mantém planos reais limitados e a equipe interna ilimitada', () => {
    expect(resolveProfileAllowance({ status: 200, maxProfiles: 2 })).toEqual({
      kind: 'limited',
      maxProfiles: 2,
    })
    expect(resolveProfileAllowance({ status: 200, maxProfiles: Number.MAX_SAFE_INTEGER })).toEqual({
      kind: 'unlimited',
    })
    expect(resolveProfileAllowance({ status: 200, maxProfiles: 100 })).toEqual({
      kind: 'limited',
      maxProfiles: 100,
    })
  })

  it('só libera o Adicionar quando uma vaga foi confirmada', () => {
    expect(canAddProfile({ kind: 'limited', maxProfiles: 2 }, 1)).toBe(true)
    expect(canAddProfile({ kind: 'limited', maxProfiles: 2 }, 2)).toBe(false)
    expect(canAddProfile({ kind: 'unlimited' }, 200)).toBe(true)
  })
})
