import { describe, expect, test } from 'bun:test'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
// Contrato: a prévia da data de término é o espelho da régua do Auth (quem grava a data).
import { studyAccessExpiresAt } from '../../auth/src/domain/study-access/policy'
import {
  accessEndPreviewPhrase,
  childAccessSummary,
  familyAccessReady,
  formatAccessEnd,
  grantState,
  studyAccessEndPreview,
} from '../src/lib/study-access-view'

const NOW = Date.parse('2026-10-10T15:00:00Z')
const DAY = 86_400_000
function grant(over: Partial<StudyGrantView> = {}): StudyGrantView {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    profileId: '11111111-1111-4111-8111-111111111111',
    label: 'Computador de casa',
    expiresAt: new Date(NOW + 60 * DAY).toISOString(),
    revokedAt: null,
    lastUsedAt: null,
    ...over,
  }
}

describe('estado de cada acesso na área dos pais', () => {
  test('liberado, vence em breve (até 7 dias), vencido e encerrado', () => {
    expect(grantState(grant(), NOW)).toBe('active')
    expect(grantState(grant({ expiresAt: new Date(NOW + 7 * DAY).toISOString() }), NOW)).toBe(
      'expiring',
    )
    expect(grantState(grant({ expiresAt: new Date(NOW + 8 * DAY).toISOString() }), NOW)).toBe(
      'active',
    )
    expect(grantState(grant({ expiresAt: new Date(NOW - 1).toISOString() }), NOW)).toBe('expired')
    expect(grantState(grant({ revokedAt: new Date(NOW).toISOString() }), NOW)).toBe('revoked')
  })

  test('o cartão da criança avisa o vencimento próximo antes de dizer "liberado"', () => {
    const soon = grant({
      label: 'Notebook da avó',
      expiresAt: new Date(NOW + 2 * DAY).toISOString(),
    })
    expect(childAccessSummary([grant(), soon], NOW)).toEqual({
      kind: 'expiring',
      live: 2,
      label: 'Notebook da avó',
      expiresAt: soon.expiresAt,
    })
    expect(childAccessSummary([grant()], NOW)).toEqual({ kind: 'ready', live: 1 })
    expect(
      childAccessSummary([grant({ expiresAt: new Date(NOW - DAY).toISOString() })], NOW),
    ).toEqual({ kind: 'expired' })
    expect(childAccessSummary([grant({ revokedAt: new Date(NOW).toISOString() })], NOW)).toEqual({
      kind: 'none',
    })
    expect(childAccessSummary([], NOW)).toEqual({ kind: 'none' })
    // Consulta que falhou não vira "sem acesso".
    expect(childAccessSummary(null, NOW)).toEqual({ kind: 'unknown' })
  })

  test('a família está pronta com UMA autorização viva; consulta falha é "não sei"', () => {
    expect(familyAccessReady({ a: [], b: [grant()] }, NOW)).toBe(true)
    expect(familyAccessReady({ a: [], b: null }, NOW)).toBeNull()
    expect(familyAccessReady({ a: null, b: [grant()] }, NOW)).toBe(true)
    expect(familyAccessReady({ a: [], b: [] }, NOW)).toBe(false)
  })
})

describe('a data de término antes de confirmar', () => {
  test('a prévia é a mesma régua do Auth, em todos os prazos', () => {
    for (const at of ['2026-10-10T15:00:00Z', '2026-10-11T02:30:00Z', '2026-12-31T23:59:00Z']) {
      const now = new Date(at)
      for (const days of [0, 7, 30, 90] as const)
        expect(studyAccessEndPreview(days, now).toISOString()).toBe(
          studyAccessExpiresAt(days, now).toISOString(),
        )
    }
  })

  test('"Somente hoje" termina à meia-noite do MESMO dia, sem parecer um dia a mais', () => {
    const now = new Date('2026-10-10T15:00:00Z')
    expect(accessEndPreviewPhrase(0, now)).toBe('hoje, à meia-noite')
    expect(formatAccessEnd(studyAccessEndPreview(0, now))).toBe('10 de out. de 2026, à meia-noite')
    expect(accessEndPreviewPhrase(90, now)).toBe('em 08 de jan. de 2027')
    expect(formatAccessEnd('2027-01-08T15:00:00Z')).toBe('08 de jan. de 2027')
  })
})
