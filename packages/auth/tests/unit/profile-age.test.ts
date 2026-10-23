import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'

const NOW = new Date('2026-08-15T12:00:00.000Z')

function createProfile(birthDate: string, now: Date = NOW): ProfileAggregate {
  return ProfileAggregate.create({
    id: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Sofia',
    birthDate,
    now,
  })
}

describe('idade do perfil Kids', () => {
  test('aceita quem ainda tem 17 anos', () => {
    expect(createProfile('2008-08-16').birthDate).toBe('2008-08-16')
  })

  test('usa o dia civil de São Paulo na virada UTC', () => {
    const afterUtcMidnight = new Date('2026-08-16T00:30:00.000Z')

    expect(createProfile('2008-08-16', afterUtcMidnight).birthDate).toBe('2008-08-16')
    expect(() => createProfile('2026-08-16', afterUtcMidnight)).toThrow(
      'Data de nascimento não pode estar no futuro',
    )
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
      voiceInputEnabled: false,
      voiceInputEnabledAt: null,
      status: 'active',
      admissionState: 'ready',
      sortOrder: 0,
      createdAt,
      updatedAt: createdAt,
    })

    expect(() => profile.setBirthDate('2007-08-15', NOW)).not.toThrow()
    profile.updateDetails({ name: 'Sofia Silva' }, NOW)
    expect(profile.name).toBe('Sofia Silva')
  })
})

describe('data de nascimento obrigatória (23/10/2026)', () => {
  const base = () => ({ id: randomUUID(), accountUserId: randomUUID(), name: 'Sofia', now: NOW })

  test('perfil novo sem data é recusado, com a mensagem que os pais leem', () => {
    expect(() => ProfileAggregate.create({ ...base() })).toThrow(
      'Informe a data de nascimento da criança',
    )
    expect(() => ProfileAggregate.create({ ...base(), birthDate: null })).toThrow(
      'Informe a data de nascimento da criança',
    )
    expect(() => ProfileAggregate.create({ ...base(), birthDate: '   ' })).toThrow(
      'Informe a data de nascimento da criança',
    )
  })

  test('a data informada pode ser corrigida, mas não apagada', () => {
    const profile = createProfile('2016-05-10')
    profile.setBirthDate('2016-06-01', NOW)
    expect(profile.birthDate).toBe('2016-06-01')
    expect(() => profile.setBirthDate(null, NOW)).toThrow('Informe a data de nascimento da criança')
    expect(profile.birthDate).toBe('2016-06-01')
  })

  test('só o perfil-padrão legado nasce sem data, e a família informa depois', () => {
    const legacy = ProfileAggregate.create({ ...base(), allowMissingBirthDate: true })
    expect(legacy.birthDate).toBeNull()
    // Reenviar "sem data" num perfil que nunca teve data não muda nada.
    legacy.setBirthDate(null, NOW)
    expect(legacy.birthDate).toBeNull()
    legacy.setBirthDate('2015-01-20', NOW)
    expect(legacy.birthDate).toBe('2015-01-20')
  })
})
