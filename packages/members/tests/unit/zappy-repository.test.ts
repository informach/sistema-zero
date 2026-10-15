import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  serializeZappyResponse,
  toResponse,
  zappyMetricsPeriod,
  zappyReservationReclaimable,
} from '../../src/infrastructure/persistence/drizzle/zappy.repository'
import {
  effectiveZappyKnowledgeStatus,
  zappyKnowledgeSourceUnchanged,
} from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'

describe('DrizzleZappyRepository', () => {
  test('roundtrip do JSON preserva intenção e refs verificadas, sem expor rejeição interna', () => {
    const hash = `sha256-${'a'.repeat(43)}=`
    const refs = [
      {
        path: 'src/main.ts',
        startLine: 300,
        endLine: 302,
        sourceHash: hash,
        contextDigest: hash,
        excerptId: 'excerpt-main',
      },
      { path: 'src/config.ts', sourceHash: hash, contextDigest: hash, excerptId: 'excerpt-config' },
    ]
    const response = {
      id: 'answer',
      kind: 'pro' as const,
      intent: 'investigate' as const,
      scope: 'error' as const,
      text: 'Confira a condição.',
      blockReferences: [],
      fileReferences: refs,
      sourceRevision: 123,
      createdAt: '2026-10-15T12:00:00.000Z',
    }
    const stored = serializeZappyResponse(response, 'internal audit detail')
    const restored = toResponse({
      id: response.id,
      response: JSON.parse(JSON.stringify(stored)),
      createdAt: new Date(response.createdAt),
    })
    expect(restored).toEqual(response)
    expect(JSON.stringify(restored)).not.toContain('internal audit detail')
    expect(serializeZappyResponse({ ...response, kind: 'classic' }).intent).toBeUndefined()
    expect(serializeZappyResponse({ ...response, kind: 'classic' }).fileReferences).toBeUndefined()
  })

  test('histórico rejeita paths externos, par de linhas incompleto e hashes corrompidos', () => {
    const value = toResponse({
      id: 'answer',
      createdAt: new Date(),
      response: {
        kind: 'pro',
        text: 'Confira.',
        scope: 'concept',
        intent: 'build',
        fileReferences: [
          { path: '../outside.ts' },
          { path: 'src/main.ts', startLine: 2 },
          { path: 'src/main.ts', sourceHash: 'forged' },
          { path: 'src/main.ts' },
        ],
      },
    })
    expect(value?.fileReferences).toEqual([{ path: 'src/main.ts' }])
    expect(value?.intent).toBeUndefined()
  })
  test('preserva o modo do histórico e mantém respostas antigas legíveis', () => {
    const row = {
      id: 'answer',
      createdAt: new Date('2026-10-15T12:00:00Z'),
      response: { text: 'Abra o arquivo.', scope: 'concept', kind: 'pro', blockReferences: [] },
    }
    expect(toResponse(row)?.kind).toBe('pro')
    expect(
      toResponse({ ...row, response: { text: 'Conversa antiga.', scope: 'concept' } })?.kind,
    ).toBeUndefined()
    expect(
      toResponse({ ...row, response: { ...row.response, kind: 'forged' } })?.kind,
    ).toBeUndefined()
  })
  test('histórico Pro preserva referências e revisão, descartando faixas corrompidas', () => {
    const reference = { path: 'src/main.ts', startLine: 2, endLine: 4 }
    const value = toResponse({
      id: 'answer',
      createdAt: new Date(),
      response: {
        kind: 'pro',
        text: 'Veja este trecho.',
        scope: 'concept',
        sourceRevision: 123,
        fileReferences: [reference, null, { ...reference, endLine: 0 }],
      },
    })
    expect(value?.fileReferences).toEqual([reference])
    expect(value?.sourceRevision).toBe(123)
  })
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
