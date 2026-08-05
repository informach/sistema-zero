import { describe, expect, test } from 'bun:test'
import { pensaStudioLinkKey, pensaStudioProjectId } from '../src/lib/pensa-studio-link'

describe('vínculo Pensa → Estúdio', () => {
  test('restaura o mesmo projeto deterministicamente e isola cada perfil', () => {
    const pensaProjectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    expect(pensaStudioProjectId(pensaProjectId)).toBe('pensa-aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa')
    expect(pensaStudioProjectId(pensaProjectId)).toBe(pensaStudioProjectId(pensaProjectId))
    expect(pensaStudioLinkKey('child-a', pensaProjectId)).not.toBe(
      pensaStudioLinkKey('child-b', pensaProjectId),
    )
    expect(pensaStudioLinkKey(null, pensaProjectId)).toContain(':account:')
  })
})
