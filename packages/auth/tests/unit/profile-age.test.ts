import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'

const NOW = new Date('2026-08-15T12:00:00.000Z')

function createProfile(birthDate: string): ProfileAggregate {
  return ProfileAggregate.create({
    id: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Sofia',
    birthDate,
    now: NOW,
  })
}

describe('idade do perfil Kids', () => {
  test('aceita quem ainda tem 17 anos', () => {
    expect(createProfile('2008-08-16').birthDate).toBe('2008-08-16')
  })

  test('recusa cadastro com 18 anos completos usando código de domínio específico', () => {
    try {
      createProfile('2008-08-15')
      throw new Error('cadastro adulto deveria ter sido recusado')
    } catch (error) {
      expect((error as { code?: string }).code).toBe('PROFILE_AGE_RESTRICTED')
    }
  })

  test('perfil já cadastrado não é bloqueado ao completar 18 anos e reenviar a mesma data', () => {
    const createdAt = new Date('2025-08-15T12:00:00.000Z')
    const profile = ProfileAggregate.restore({
      id: randomUUID(),
      accountUserId: randomUUID(),
      name: 'Sofia',
      avatarUrl: null,
      whatsapp: null,
      birthDate: '2007-08-15',
      publicProfileEnabled: false,
      status: 'active',
      sortOrder: 0,
      createdAt,
      updatedAt: createdAt,
    })

    expect(() => profile.setBirthDate('2007-08-15', NOW)).not.toThrow()
    profile.updateDetails({ name: 'Sofia Silva' }, NOW)
    expect(profile.name).toBe('Sofia Silva')
  })
})
