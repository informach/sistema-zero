import { describe, expect, test } from 'bun:test'
import { liveUpstreamPath } from '../src/lib/live-route-policy'

const id = 'da43dd41-73c1-4aeb-9a0c-557b11213687'
describe('live BFF allowlist', () => {
  test('runtime is a workspace operation for learners and teachers, never parents or configuration', () => {
    for (const scope of ['learner', 'teacher'] as const)
      expect(liveUpstreamPath(scope, 'POST', ['workspaces', id, 'runtime'])).toBe(
        `/members/live/workspaces/${id}/runtime`,
      )
    for (const scope of ['parent', 'admin'] as const)
      expect(liveUpstreamPath(scope, 'POST', ['workspaces', id, 'runtime'])).toBeNull()
    expect(liveUpstreamPath('learner', 'GET', ['workspaces', id, 'runtime'])).toBeNull()
  })
  test('separates learner, teacher, parent and configuration', () => {
    expect(liveUpstreamPath('learner', 'POST', ['sessions', id, 'control'])).toBeNull()
    expect(liveUpstreamPath('teacher', 'POST', ['sessions', id, 'control'])).toBe(
      `/members/live/sessions/${id}/control`,
    )
    expect(liveUpstreamPath('parent', 'GET', ['enrollments'])).toBe(
      '/members/parents/live/enrollments',
    )
    expect(liveUpstreamPath('parent', 'POST', ['sessions', id, 'join'])).toBeNull()
    expect(liveUpstreamPath('admin', 'POST', ['programs'])).toBe('/members/admin/live/programs')
    expect(liveUpstreamPath('learner', 'POST', ['programs'])).toBeNull()
    expect(liveUpstreamPath('learner', 'GET', ['sessions', id, 'demonstration'])).toBeNull()
    expect(liveUpstreamPath('teacher', 'GET', ['sessions', id, 'demonstration'])).toBe(
      `/members/live/sessions/${id}/demonstration`,
    )
    // As atividades das etapas do roteiro antigo saíram da sala (14/10/2026): as partes da aula
    // passam pelas rotas de aula de sempre.
    expect(liveUpstreamPath('teacher', 'GET', ['sessions', id, 'learning-preview'])).toBeNull()
    expect(
      liveUpstreamPath('learner', 'POST', ['sessions', id, 'blocks', id, 'learning-attempts']),
    ).toBeNull()
  })
  test('cursos ao vivo: a aula pela rota de sempre, o projeto do bloco e as anotações', () => {
    // A sala da criança lê a aula do encontro pela rota de aula de sempre (só leitura).
    expect(
      liveUpstreamPath('learner', 'GET', ['courses', 'corre-dino-ao-vivo', 'lessons', id]),
    ).toBe(`/members/courses/corre-dino-ao-vivo/lessons/${id}`)
    expect(
      liveUpstreamPath('learner', 'POST', ['courses', 'corre-dino-ao-vivo', 'lessons', id]),
    ).toBeNull()
    expect(liveUpstreamPath('learner', 'GET', ['courses', 'Slug', 'lessons', id])).toBeNull()
    expect(liveUpstreamPath('learner', 'GET', ['courses', 'slug', 'lessons', 'x'])).toBeNull()
    expect(liveUpstreamPath('teacher', 'GET', ['courses', 'slug', 'lessons', id])).toBeNull()
    expect(liveUpstreamPath('parent', 'GET', ['courses', 'slug', 'lessons', id])).toBeNull()
    // O projeto ao vivo do bloco (a consulta leva `sessionId` e `blockId`).
    expect(liveUpstreamPath('learner', 'GET', ['workspaces'])).toBe('/members/live/workspaces')
    expect(liveUpstreamPath('teacher', 'GET', ['workspaces'])).toBe('/members/live/workspaces')
    // As anotações da professora: só pelo BFF do Admin.
    expect(liveUpstreamPath('admin', 'GET', ['lessons', id, 'teacher-notes'])).toBe(
      `/members/admin/live/lessons/${id}/teacher-notes`,
    )
    expect(liveUpstreamPath('learner', 'GET', ['lessons', id, 'teacher-notes'])).toBeNull()
    expect(liveUpstreamPath('teacher', 'GET', ['lessons', id, 'teacher-notes'])).toBeNull()
  })
  test('rejects path traversal, unknown endpoints and generic SFU operations', () => {
    for (const path of [
      ['..', 'admin'],
      ['sessions', `${id}?role=admin`],
      ['sessions', '%2e%2e', 'join'],
      ['occurrences', id, 'media', 'sessions'],
      ['sessions', 'wrong', 'join'],
    ])
      expect(liveUpstreamPath('teacher', 'POST', path)).toBeNull()
    expect(liveUpstreamPath('learner', 'DELETE', ['sessions', id])).toBeNull()
  })
  test('allows only explicit workspace writes and signed asset resolutions', () => {
    expect(liveUpstreamPath('learner', 'POST', ['workspaces', id, 'commits'])).toBe(
      `/members/live/workspaces/${id}/commits`,
    )
    expect(liveUpstreamPath('learner', 'POST', ['workspaces', id, 'assistance'])).toBeNull()
    expect(liveUpstreamPath('learner', 'GET', ['sessions', id, 'materials', id, 'download'])).toBe(
      `/members/live/sessions/${id}/materials/${id}/download`,
    )
  })
})
