import { describe, expect, test } from 'bun:test'
import { kidsMayUseBff } from '../src/lib/kids-bff-policy'

describe('permissões Kids na borda local', () => {
  test('responsável gerencia a família, mas não estuda nem usa a IA de um aluno', () => {
    const parent = { kind: 'parent', sessionId: 'session', authenticatedAt: 1 } as const
    for (const path of [
      '/api/parents/children-stats',
      '/api/profiles',
      '/api/payments/my',
      '/api/helpdesk/portal/tickets',
    ])
      expect(kidsMayUseBff(parent, path, 'POST', 'parent')).toBe(true)
    for (const path of [
      '/api/pensa/ai/chat',
      '/api/studio/zappy/ask',
      '/api/members/room',
      '/api/creations/pinta/id/upload',
    ])
      expect(kidsMayUseBff(parent, path, 'POST', 'parent')).toBe(false)
  })
  test('aluno estuda e edita o próprio perfil, sem editar irmãos ou abrir compras', () => {
    const child = {
      kind: 'student',
      sessionId: 'session',
      deviceId: 'device',
      grantId: 'grant',
    } as const
    expect(kidsMayUseBff(child, '/api/profiles/child', 'PATCH', 'child')).toBe(true)
    expect(kidsMayUseBff(child, '/api/profiles/sibling', 'PATCH', 'child')).toBe(false)
    expect(kidsMayUseBff(child, '/api/profiles', 'POST', 'child')).toBe(false)
    for (const path of [
      '/api/parents/children-stats',
      '/api/payments/my',
      '/api/helpdesk/portal/tickets',
    ])
      expect(kidsMayUseBff(child, path, 'GET', 'child')).toBe(false)
    expect(kidsMayUseBff(child, '/api/creations/pinta/id/upload', 'POST', 'child')).toBe(true)
  })
})
