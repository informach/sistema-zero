import { afterEach, describe, expect, test } from 'bun:test'
import { LessonDraftAccessService } from '../../src/application/creations/lesson-draft-access.service'
import {
  invalidateToolOwnership,
  rememberToolOwned,
  resetToolOwnershipCacheForTests,
  toolOwnershipCached,
  toolOwnershipGeneration,
} from '../../src/application/creations/tool-ownership-cache'

const BLOCK = '11111111-2222-4333-8444-555555555555'

afterEach(() => resetToolOwnershipCacheForTests())

/**
 * A revogação que chega NO MEIO de uma checagem (full review de 11/10/2026): a checagem já tinha
 * lido a matrícula ativa e, ao terminar, regravava o "pode" por mais 60 s, desfazendo a
 * invalidação que tinha acabado de rodar.
 */
describe('a invalidação vence a checagem que estava em voo', () => {
  test('rascunho da fase: a próxima reserva consulta de novo e é recusada', async () => {
    let revoked = false
    let releaseSections: () => void = () => {}
    const courses = {
      findBlockLessonId: async () => 'L1',
      findLessonWithContent: async () => ({
        id: 'L1',
        courseId: 'C1',
        isPublished: true,
        blocks: [{ id: BLOCK, kind: 'pinta', content: { kind: 'pinta' } }],
      }),
    }
    const access = {
      requireById: async () => {
        if (revoked) throw new Error('matrícula revogada')
        return { course: { id: 'C1', sequentialLock: false }, entitlement: { expiresAt: null } }
      },
    }
    const sections = {
      assertBlock: () =>
        new Promise<void>((resolve) => {
          releaseSections = resolve
        }),
    }
    const service = new LessonDraftAccessService(
      courses as never,
      access as never,
      {} as never,
      sections as never,
      () => 1_000,
    )
    const input = {
      userId: 'U',
      accountId: 'A',
      privileged: false,
      tool: 'lesson-pinta' as const,
      blockId: BLOCK,
    }
    const first = service.assert(input)
    await new Promise((resolve) => setTimeout(resolve, 5))
    // O webhook revoga a matrícula e invalida enquanto a checagem espera a seção.
    revoked = true
    invalidateToolOwnership('A')
    releaseSections()
    await first
    await expect(service.assert(input)).rejects.toThrow('matrícula revogada')
  })

  test('posse do produto: o resultado lido antes da invalidação não é guardado', () => {
    const since = toolOwnershipGeneration()
    invalidateToolOwnership('A')
    rememberToolOwned('A', 'pinta', 1_000, since)
    expect(toolOwnershipCached('A', 'pinta', 1_000)).toBe(false)
    // Sem invalidação no meio, guarda como sempre.
    rememberToolOwned('A', 'pinta', 1_000, toolOwnershipGeneration())
    expect(toolOwnershipCached('A', 'pinta', 1_000)).toBe(true)
  })
})
