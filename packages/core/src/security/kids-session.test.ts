import { describe, expect, test } from 'bun:test'
import {
  type KidsSessionClaim,
  normalizePolicyPath,
  parseKidsSessionClaim,
  sameKidsSession,
} from './kids-session'

const sessionId = '71d3df1b-b2b1-4eaf-ab91-cc4b4b76d900'
const deviceId = '2c6a1a52-6d51-4f63-9a3e-0f1e8d0a7b11'
const grantId = '9a0e2f4c-3b1d-4c5e-8f7a-6b5c4d3e2f10'

describe('claim kids: leitura estrita', () => {
  test('aceita o responsável e o aluno completos e devolve só os campos do contrato', () => {
    expect(
      parseKidsSessionClaim({ kind: 'parent', sessionId, authenticatedAt: 1_700_000_000, x: 1 }),
    ).toEqual({ kind: 'parent', sessionId, authenticatedAt: 1_700_000_000 })
    expect(
      parseKidsSessionClaim({ kind: 'student', sessionId, deviceId, grantId, role: 'admin' }),
    ).toEqual({ kind: 'student', sessionId, deviceId, grantId })
  })

  test('recusa forma incompleta, ids que não são uuid e mistura de públicos', () => {
    for (const value of [
      null,
      'parent',
      { kind: 'parent' },
      { kind: 'parent', sessionId: 'abc', authenticatedAt: 10 },
      { kind: 'parent', sessionId },
      { kind: 'parent', sessionId, authenticatedAt: 0 },
      { kind: 'parent', sessionId, authenticatedAt: 1.5 },
      { kind: 'parent', sessionId, authenticatedAt: '10' },
      { kind: 'parent', sessionId, authenticatedAt: 10, deviceId },
      { kind: 'parent', sessionId, authenticatedAt: 10, grantId },
      { kind: 'student', sessionId, deviceId },
      { kind: 'student', sessionId, grantId },
      { kind: 'student', sessionId, deviceId: 'x', grantId },
      { kind: 'teacher', sessionId, authenticatedAt: 10 },
    ])
      expect(parseKidsSessionClaim(value)).toBeNull()
  })
})

describe('mesma sessão Kids', () => {
  const parent: KidsSessionClaim = { kind: 'parent', sessionId, authenticatedAt: 10 }
  const student: KidsSessionClaim = { kind: 'student', sessionId, deviceId, grantId }

  test('ausência só casa com ausência', () => {
    expect(sameKidsSession(null, undefined)).toBe(true)
    expect(sameKidsSession(parent, null)).toBe(false)
    expect(sameKidsSession(undefined, student)).toBe(false)
  })

  test('cada campo do contexto participa da comparação', () => {
    expect(sameKidsSession(parent, { ...parent })).toBe(true)
    expect(sameKidsSession(student, { ...student })).toBe(true)
    expect(sameKidsSession(parent, { ...parent, authenticatedAt: 11 })).toBe(false)
    expect(sameKidsSession(parent, { ...parent, sessionId: grantId })).toBe(false)
    expect(sameKidsSession(student, { ...student, deviceId: grantId })).toBe(false)
    expect(sameKidsSession(student, { ...student, grantId: deviceId })).toBe(false)
    expect(sameKidsSession(parent, student)).toBe(false)
  })
})

describe('caminho canônico das políticas', () => {
  test('junta barras, ignora query e decodifica os segmentos', () => {
    expect(normalizePolicyPath('/members//parents/report-prefs')).toBe(
      '/members/parents/report-prefs',
    )
    expect(normalizePolicyPath('//members///parents/?x=1#y')).toBe('/members/parents')
    expect(normalizePolicyPath('/members/%70arents/x')).toBe('/members/parents/x')
    expect(normalizePolicyPath('/')).toBe('/')
  })

  test('nega caminho ambíguo', () => {
    for (const path of [
      'members/parents',
      '/members/../parents',
      '/members/./parents',
      '/members/%2e%2e/parents',
      '/members/..%2fparents',
      '/members/parents%5cx',
      '/members/%zz',
      '/members/%00x',
    ])
      expect(normalizePolicyPath(path)).toBeNull()
  })
})
