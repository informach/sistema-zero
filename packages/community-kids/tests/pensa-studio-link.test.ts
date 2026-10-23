import { describe, expect, test } from 'bun:test'
import { pensaPlanIdFromStudioProjectId, pensaStudioProjectId } from '../src/lib/pensa-studio-link'

describe('vínculo Pensa → Estúdio', () => {
  test('restaura o mesmo projeto deterministicamente e permite encontrar seu plano', () => {
    const pensaProjectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    expect(pensaStudioProjectId(pensaProjectId)).toBe('pensa-aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa')
    expect(pensaStudioProjectId(pensaProjectId)).toBe(pensaStudioProjectId(pensaProjectId))
    expect(pensaPlanIdFromStudioProjectId(pensaStudioProjectId(pensaProjectId))).toBe(
      pensaProjectId,
    )
    expect(pensaPlanIdFromStudioProjectId('jogo-livre')).toBeNull()
  })
})
