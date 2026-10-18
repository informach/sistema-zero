import { describe, expect, test } from 'bun:test'
import { assertBlockCoherent } from '../../src/application/content-admin/content-admin.service'
import { blockRevisionFingerprint } from '../../src/domain/course/block-revision'
import { MAX_STUDIO_PROJECT_CHARS } from '../../src/domain/course/lesson-block'

describe('revisão do bloco', () => {
  const studio = { kind: 'studio', initialProject: { name: 'a' } }
  test('o gabarito do Estúdio não entra na revisão', () => {
    expect(blockRevisionFingerprint({ ...studio, solutionProject: { name: 'b' } })).toBe(
      blockRevisionFingerprint(studio),
    )
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

describe('o gabarito tem o mesmo teto de tamanho do projeto inicial', () => {
  test('gabarito grande demais é recusado', () => {
    const base = { kind: 'studio', initialProject: { formatVersion: 2, name: 'a', files: {} } }
    const gabarito = (chars: number) => ({ formatVersion: 2, name: 'x'.repeat(chars), files: {} })
    expect(() =>
      assertBlockCoherent({ ...base, solutionProject: gabarito(100) } as never),
    ).not.toThrow()
    expect(() =>
      assertBlockCoherent({
        ...base,
        solutionProject: gabarito(MAX_STUDIO_PROJECT_CHARS),
      } as never),
    ).toThrow('O gabarito excede')
  })
})
