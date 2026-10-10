import { describe, expect, test } from 'bun:test'
import type { KidsSessionClaim } from '@sistemazero/core/security'
import { kidsMayAccess } from '../../src/application/auth/kids-access-policy'

const parent: KidsSessionClaim = {
  kind: 'parent',
  sessionId: crypto.randomUUID(),
  authenticatedAt: 1,
}
const student: KidsSessionClaim = {
  kind: 'student',
  sessionId: crypto.randomUUID(),
  deviceId: crypto.randomUUID(),
  grantId: crypto.randomUUID(),
}
describe('áreas separadas no servidor', () => {
  test('preserva perfil público e publicação no Mural, sem abrir outras rotas internas', () => {
    const publicProfile = `/auth/internal/profiles/${crypto.randomUUID()}/public`
    expect(kidsMayAccess(student, publicProfile, 'GET', 'andre')).toBe(true)
    expect(kidsMayAccess(student, publicProfile, 'PATCH', 'andre')).toBe(false)
    for (const path of [
      '/hub/internal/showcase-thread',
      '/hub/internal/showcase-thread-studio',
      '/hub/internal/showcase-thread-studio-standalone',
    ]) {
      expect(kidsMayAccess(student, path, 'POST', 'andre')).toBe(true)
      expect(kidsMayAccess(student, path, 'DELETE', 'andre')).toBe(false)
      expect(kidsMayAccess(parent, path, 'POST', 'pai')).toBe(false)
    }
    expect(kidsMayAccess(student, '/members/internal/device-avatars', 'POST', 'andre')).toBe(false)
  })
  test('aluno não usa finanças, gestão, suporte adulto nem seleção antiga', () => {
    for (const path of [
      '/payments/my',
      '/members/parents/children-stats',
      '/helpdesk/portal/tickets',
      '/referrals/me/ambassador',
      '/auth/profiles/irmao/select',
      '/auth/profile-session/exit',
      '/members/admin/courses',
    ])
      expect(kidsMayAccess(student, path, 'GET', 'andre')).toBe(false)
    expect(kidsMayAccess(student, '/auth/profiles/debora', 'PATCH', 'andre')).toBe(false)
    expect(kidsMayAccess(student, '/auth/profiles/andre', 'PATCH', 'andre')).toBe(true)
    expect(kidsMayAccess(student, '/members/learning/session', 'POST', 'andre')).toBe(true)
  })
  test('responsável gerencia sem começar a estudar em nome do perfil', () => {
    expect(kidsMayAccess(parent, '/members/learning/session', 'POST', 'pai')).toBe(false)
    expect(kidsMayAccess(parent, '/hub/topics', 'POST', 'pai')).toBe(false)
    expect(kidsMayAccess(parent, '/auth/profiles/andre/select', 'POST', 'pai')).toBe(false)
    expect(kidsMayAccess(parent, '/auth/profiles', 'POST', 'pai')).toBe(true)
    expect(kidsMayAccess(parent, '/members/parents/children-stats', 'GET', 'pai')).toBe(true)
    expect(kidsMayAccess(parent, '/payments/my', 'GET', 'pai')).toBe(true)
  })
})
