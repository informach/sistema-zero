import { describe, expect, test } from 'bun:test'
import { assertBlockCoherent } from '../../src/application/content-admin/content-admin.service'
import { blockRevisionFingerprint } from '../../src/domain/course/block-revision'

describe('revisão do bloco', () => {
  const studio = { kind: 'studio', initialProject: { name: 'a' } }
  test('o gabarito do Estúdio não entra na revisão', () => {
    expect(blockRevisionFingerprint({ ...studio, solutionProject: { name: 'b' } })).toBe(
      blockRevisionFingerprint(studio),
    )
  })
  test('per-part checkpoints and solutions preserve the exact child revision', () => {
    const old = { ...studio, solutionProject: { id: 'same-project', source: 'one' } }
    const converted = {
      ...studio,
      projectExamples: {
        version: 1,
        examples: { ownExampleId: { id: 'same-project', source: 'one' } },
        sections: { ownSectionId: { solutionExampleId: 'ownExampleId' } },
      },
    }
    expect(blockRevisionFingerprint(converted)).toBe(blockRevisionFingerprint(old))
    expect(
      blockRevisionFingerprint({
        ...converted,
        projectExamples: { version: 1, examples: {}, sections: {} },
      }),
    ).toBe(blockRevisionFingerprint(studio))
  })
  test('o projeto inicial e os outros blocos entram', () => {
    expect(blockRevisionFingerprint({ ...studio, initialProject: { name: 'c' } })).not.toBe(
      blockRevisionFingerprint(studio),
    )
    expect(blockRevisionFingerprint({ kind: 'video', solutionProject: 1 })).not.toBe(
      blockRevisionFingerprint({ kind: 'video' }),
    )
  })
})

describe('retired global solutions have no normal writer path', () => {
  test('global solutions require explicit conversion regardless of their size', () => {
    const base = {
      kind: 'studio' as const,
      initialProject: { formatVersion: 2, name: 'a', files: {} },
    }
    expect(() =>
      assertBlockCoherent({
        ...base,
        solutionProject: { formatVersion: 2, name: 'Uma solução', files: {} },
      }),
    ).toThrow('Converta')
  })
})
