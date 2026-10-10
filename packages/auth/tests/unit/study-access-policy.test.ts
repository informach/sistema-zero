import { describe, expect, test } from 'bun:test'
import { parseKidsSessionClaim } from '@sistemazero/core/security'
import { normalizeStudyCode, studyAccessExpiresAt } from '../../src/domain/study-access/policy'

describe('acesso infantil: códigos e prazo absoluto', () => {
  test('aceita copiar o código com espaços, hífen e letras minúsculas', () => {
    expect(normalizeStudyCode('abcde-fghjk')).toBe('ABCDEFGHJK')
    expect(normalizeStudyCode(' abcde fghjk ')).toBe('ABCDEFGHJK')
    expect(normalizeStudyCode('ABCDE<script>')).toBeNull()
    expect(normalizeStudyCode('ABCDE')).toBeNull()
  })
  test('prazo em dias começa no resgate, sem prolongamento por visita', () => {
    const now = new Date('2026-10-10T18:00:00Z')
    expect(studyAccessExpiresAt(7, now).toISOString()).toBe('2026-10-17T18:00:00.000Z')
    expect(studyAccessExpiresAt(90, now).toISOString()).toBe('2027-01-08T18:00:00.000Z')
    expect(() => studyAccessExpiresAt(365, now)).toThrow()
  })
  test('somente hoje acaba à meia-noite de São Paulo, inclusive perto da virada UTC', () => {
    expect(studyAccessExpiresAt(0, new Date('2026-10-11T02:50:00Z')).toISOString()).toBe(
      '2026-10-11T03:00:00.000Z',
    )
    expect(studyAccessExpiresAt(0, new Date('2026-10-11T03:01:00Z')).toISOString()).toBe(
      '2026-10-12T03:00:00.000Z',
    )
  })
  test('não aceita contexto de aluno incompleto ou contexto adulto misturado', () => {
    const sessionId = '71d3df1b-b2b1-4eaf-ab91-cc4b4b76d900'
    expect(parseKidsSessionClaim({ kind: 'student', sessionId })).toBeNull()
    expect(parseKidsSessionClaim({ kind: 'parent', sessionId, authenticatedAt: -1 })).toBeNull()
    expect(
      parseKidsSessionClaim({ kind: 'parent', sessionId, authenticatedAt: 10, grantId: sessionId }),
    ).toBeNull()
    expect(parseKidsSessionClaim({ kind: 'parent', sessionId, authenticatedAt: 10 })).toEqual({
      kind: 'parent',
      sessionId,
      authenticatedAt: 10,
    })
  })
})
