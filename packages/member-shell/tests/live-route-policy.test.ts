import { describe, expect, test } from 'bun:test'
import { liveUpstreamPath } from '../src/lib/live-route-policy'

const id = 'da43dd41-73c1-4aeb-9a0c-557b11213687'
describe('live BFF allowlist', () => {
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
    expect(liveUpstreamPath('learner', 'GET', ['sessions', id, 'learning-preview'])).toBeNull()
    expect(liveUpstreamPath('teacher', 'GET', ['sessions', id, 'learning-preview'])).toBe(
      `/members/live/sessions/${id}/learning-preview`,
    )
    expect(
      liveUpstreamPath('learner', 'POST', ['sessions', id, 'blocks', id, 'learning-attempts']),
    ).toBe(`/members/live/sessions/${id}/blocks/${id}/learning-attempts`)
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
