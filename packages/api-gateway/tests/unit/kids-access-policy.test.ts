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
  test('cartão de assinatura só é acessível ao responsável, sem exigir produto ativo', () => {
    for (const path of [
      '/payments/my/card-config',
      '/payments/my/subscriptions/sub/card-intents',
      '/payments/my/subscriptions/sub/card-intents/intent',
    ]) {
      for (const method of ['GET', 'POST']) {
        expect(kidsMayAccess(parent, path, method, 'responsavel')).toBe(true)
        expect(kidsMayAccess(student, path, method, 'aluno-admin')).toBe(false)
      }
    }
  })
  test('preserva perfil público e publicação no Mural, sem abrir outras rotas internas', () => {
    const publicProfile = `/auth/internal/profiles/${crypto.randomUUID()}/public`
    expect(kidsMayAccess(student, publicProfile, 'GET', 'andre')).toBe(true)
    expect(kidsMayAccess(student, publicProfile, 'PATCH', 'andre')).toBe(false)
    for (const path of [
      '/hub/internal/showcase-thread',
      '/hub/internal/showcase-thread-studio',
      '/hub/internal/showcase-thread-studio/prepare',
      '/hub/internal/showcase-thread-studio-standalone',
      '/hub/internal/showcase-thread-studio-standalone/prepare',
    ]) {
      expect(kidsMayAccess(student, path, 'POST', 'andre')).toBe(true)
      expect(kidsMayAccess(student, path, 'DELETE', 'andre')).toBe(false)
      expect(kidsMayAccess(parent, path, 'POST', 'pai')).toBe(false)
    }
    expect(kidsMayAccess(student, '/members/internal/device-avatars', 'POST', 'andre')).toBe(false)
    for (const path of [
      '/hub/internal/showcase-thread-studio/prepare/retire',
      '/hub/internal/showcase-thread-studio-standalone/prepare/extra',
      '/hub/internal/showcase-thread-studio-standalone/retire',
    ])
      expect(kidsMayAccess(student, path, 'POST', 'andre')).toBe(false)
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

describe('Arquipélago Vagalume', () => {
  test('a criança joga, mas não muda o tempo da família', () => {
    for (const [method, path] of [
      ['GET', '/arquipelago/acesso'],
      ['PUT', '/arquipelago/salvamento'],
      ['POST', '/arquipelago/tempo/recuperar'],
    ]) {
      expect(kidsMayAccess(student, path as string, method as string, 'aluno')).toBe(true)
      expect(kidsMayAccess(parent, path as string, method as string, 'responsavel')).toBe(false)
    }
    for (const path of ['/arquipelago/familia/limite', '/arquipelago//familia/limite']) {
      expect(kidsMayAccess(student, path, 'PUT', 'aluno')).toBe(false)
    }
  })
  test('a seção Jogo do Admin nunca abre para aluno nem responsável', () => {
    for (const path of [
      '/arquipelago/admin/desafios',
      '/arquipelago//admin/desafios',
      '/arquipelago/ADMIN/desafios/x/publicar',
      '/arquipelago/admin/cobertura',
    ]) {
      for (const method of ['GET', 'POST', 'PUT']) {
        expect(kidsMayAccess(student, path, method, 'aluno-admin')).toBe(false)
        expect(kidsMayAccess(parent, path, method, 'responsavel-admin')).toBe(false)
      }
    }
    expect(kidsMayAccess(student, '/arquipelago/cartas', 'GET', 'aluno')).toBe(true)
    // Desafios: a criança lista, abre, confere e marca o prêmio visto; o responsável não joga.
    const d = '/arquipelago/desafios/22222222-2222-4222-8222-222222222222'
    for (const [method, path] of [
      ['GET', '/arquipelago/desafios'],
      ['GET', d],
      ['POST', `${d}/verificar`],
      ['POST', `${d}/recompensa-vista`],
    ] as const) {
      expect(kidsMayAccess(student, path, method, 'aluno')).toBe(true)
      expect(kidsMayAccess(parent, path, method, 'responsavel')).toBe(false)
    }
  })
  test('o responsável só muda o limite diário', () => {
    expect(kidsMayAccess(parent, '/arquipelago/familia/limite', 'GET', 'responsavel')).toBe(true)
    expect(kidsMayAccess(parent, '/arquipelago/familia/limite', 'PUT', 'responsavel')).toBe(true)
  })
})
