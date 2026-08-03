import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  zappyMetricsPeriod,
  zappyReservationReclaimable,
} from '../../src/infrastructure/persistence/drizzle/zappy.repository'
import {
  effectiveZappyKnowledgeStatus,
  zappyKnowledgeSourceUnchanged,
} from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'

describe('DrizzleZappyRepository', () => {
  test('codifica os dois limites da janela de métricas como timestamp', () => {
    const from = new Date('2026-08-01T03:00:00.000Z')
    const to = new Date('2026-09-01T03:00:00.000Z')
    const query = new PgDialect().sqlToQuery(zappyMetricsPeriod(from, to))

    expect(query.params).toEqual([
      'assistant',
      '2026-08-01T03:00:00.000Z',
      '2026-09-01T03:00:00.000Z',
    ])
    expect(query.typings).toEqual(['none', 'timestamp', 'timestamp'])
  })

  test('só recupera reserva sem lease ou com lease vencido', () => {
    const now = new Date('2026-08-02T12:00:00Z')

    expect(zappyReservationReclaimable(null, now)).toBe(true)
    expect(zappyReservationReclaimable(new Date('2026-08-02T11:59:59Z'), now)).toBe(true)
    expect(zappyReservationReclaimable(new Date('2026-08-02T12:00:01Z'), now)).toBe(false)
  })
})

describe('DrizzleZappyKnowledgeRepository', () => {
  const input = {
    courseId: 'course-1',
    lessonId: 'lesson-1',
    blockId: 'block-1',
    blockRevision: 'revision-new',
    sourceType: 'rich-text' as const,
    sourceRef: 'block:block-1',
    contentHash: 'same-content',
    status: 'ready' as const,
    error: null,
    chunks: [],
    now: new Date('2026-08-02T12:00:00Z'),
  }

  test('não trata revisão autoritativa nova como no-op só porque o texto é igual', () => {
    expect(
      zappyKnowledgeSourceUnchanged(
        {
          id: 'source-1',
          courseId: input.courseId,
          lessonId: input.lessonId,
          blockId: input.blockId,
          blockRevision: 'revision-old',
          contentHash: input.contentHash,
          status: input.status,
          error: input.error,
        },
        input,
      ),
    ).toBe(false)
  })

  test('mantém no-op somente quando conteúdo, status e autoridade são idênticos', () => {
    expect(
      zappyKnowledgeSourceUnchanged(
        {
          id: 'source-1',
          courseId: input.courseId,
          lessonId: input.lessonId,
          blockId: input.blockId,
          blockRevision: input.blockRevision,
          contentHash: input.contentHash,
          status: input.status,
          error: input.error,
        },
        input,
      ),
    ).toBe(true)
  })

  test('fonte invalidada pela migração aparece como pendente no relatório', () => {
    expect(
      effectiveZappyKnowledgeStatus({
        status: 'pending',
        blockRevision: null,
        authoritativeBlockRevision: 'revision-current',
      }),
    ).toBe('pending')
  })

  test('fonte de revisão antiga nunca conta como pronta no relatório', () => {
    expect(
      effectiveZappyKnowledgeStatus({
        status: 'ready',
        blockRevision: 'revision-old',
        authoritativeBlockRevision: 'revision-current',
      }),
    ).toBe('pending')
  })
})
