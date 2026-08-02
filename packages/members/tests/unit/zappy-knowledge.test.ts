import { describe, expect, test } from 'bun:test'
import { ZAPPY_SOURCE_CONTENT_MAX_BYTES } from '@sistemazero/core/zappy'
import {
  normalizeZappyText,
  richTextToText,
  vttToText,
  ZappyKnowledgeService,
} from '../../src/application/zappy/zappy-knowledge.service'
import type {
  ZappyKnowledgeRepository,
  ZappyKnowledgeSourceInput,
} from '../../src/domain/ports/zappy-knowledge-repository.port'
import {
  coursesMissingStudentNotebook,
  lessonsMissingVideoTranscript,
} from '../../src/domain/zappy/zappy-knowledge-report'

function repository(overrides: Partial<ZappyKnowledgeRepository> = {}): ZappyKnowledgeRepository {
  return {
    blockAuthorityForSource: async () => ({
      blockId: 'block-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      blockRevision: 'revision-1',
    }),
    upsert: async () => ({ id: 'source-1', changed: true }),
    deleteByRef: async () => undefined,
    search: async () => [],
    listPublishedKidsBlocks: async () => [],
    reconcilePublishedBlockSources: async () => 0,
    report: async () => ({
      publishedKidsLessons: 0,
      readySources: 0,
      errorSources: 0,
      pendingSources: 0,
      lessonsWithVideoWithoutTranscript: [],
      coursesWithoutStudentNotebook: [],
      failedSources: [],
    }),
    ...overrides,
  }
}

describe('normalização de fontes do Zappy', () => {
  test('VTT perde timestamps/cues e preserva somente a fala', () => {
    expect(
      vttToText(`WEBVTT

NOTE este comentário inteiro não é fala
nem esta continuação

1
00:00:01.000 --> 00:00:03.000
Olá, <b>criador</b>!

00:00:04.000 --> 00:00:05.000
Vamos usar blocos.`),
    ).toBe('Olá, criador! Vamos usar blocos.')
  })

  test('texto rico não indexa scripts, links ou imagens', () => {
    const text = richTextToText(
      '<p>Use o <strong>bloco</strong>.</p><script>roubo()</script> [Ajuda](https://fora.test) ![](data:x)',
    )
    expect(text).toContain('Use o bloco')
    expect(text).toContain('Ajuda')
    expect(text).not.toContain('roubo')
    expect(text).not.toContain('fora.test')
    expect(text).not.toContain('data:x')
  })

  test('termos são normalizados sem acentos para a busca', () => {
    expect(normalizeZappyText('  Colisão do HERÓI! ')).toBe('colisao do heroi')
  })
})

describe('relatório de saúde do Zappy', () => {
  test('marca aula quando apenas um de seus vídeos tem transcrição pronta', () => {
    const lesson = {
      courseId: 'course-1',
      courseTitle: 'Curso',
      lessonId: 'lesson-1',
      lessonTitle: 'Aula com dois vídeos',
    }
    const blocks = [
      { blockId: 'video-ready', lessonId: lesson.lessonId, content: { kind: 'video' } },
      { blockId: 'video-missing', lessonId: lesson.lessonId, content: { kind: 'video' } },
    ]

    expect(lessonsMissingVideoTranscript([lesson], blocks, new Set(['block:video-ready']))).toEqual(
      [lesson],
    )
    expect(
      lessonsMissingVideoTranscript(
        [lesson],
        blocks,
        new Set(['block:video-ready', 'block:video-missing']),
      ),
    ).toEqual([])
  })

  test('caderno marcado conta como presente mesmo quando sua extração falhou', () => {
    const courses = [{ courseId: 'course-1', courseTitle: 'Curso com caderno' }]
    const blocks = [
      {
        blockId: 'ebook-1',
        courseId: 'course-1',
        lessonId: 'lesson-1',
        content: { kind: 'ebook', zappyStudentNotebook: true },
      },
    ]

    expect(coursesMissingStudentNotebook(courses, blocks)).toEqual([])
  })
})

describe('ZappyKnowledgeService', () => {
  test('PDF sem texto selecionável fica visível como erro', async () => {
    let saved: ZappyKnowledgeSourceInput | null = null
    const service = new ZappyKnowledgeService(
      repository({
        upsert: async (input) => {
          saved = input
          return { id: 'source-1', changed: true }
        },
      }),
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )
    const result = await service.sync({
      lessonId: 'lesson-1',
      sourceType: 'student-notebook',
      sourceRef: 'block:pdf-1',
      expectedBlockRevision: 'revision-1',
      content: '   ',
    })
    expect(result.status).toBe('empty')
    const captured = saved as ZappyKnowledgeSourceInput | null
    expect(captured?.error).toContain('sem texto selecionável')
    expect(captured?.chunks).toEqual([])
  })

  test('recusa fonte que cabe em chars, mas excede o orçamento UTF-8', async () => {
    const service = new ZappyKnowledgeService(
      repository(),
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )
    const multibyte = 'ç'.repeat(Math.floor(ZAPPY_SOURCE_CONTENT_MAX_BYTES / 2) + 1)

    await expect(
      service.sync({
        lessonId: 'lesson-1',
        sourceType: 'student-notebook',
        sourceRef: 'block:pdf-1',
        expectedBlockRevision: 'revision-1',
        content: multibyte,
      }),
    ).rejects.toThrow(/tamanho máximo/i)
  })

  test('busca envia ao repositório apenas aulas compradas, publicadas e liberadas', async () => {
    let allowedLessonIds: string[] = []
    const service = new ZappyKnowledgeService(
      repository({
        search: async (lessonIds) => {
          allowedLessonIds = lessonIds
          return []
        },
      }),
      {
        execute: async () => [
          { courseSlug: 'liberado', careerLock: { locked: false } },
          { courseSlug: 'curso-travado', careerLock: { locked: true } },
        ],
      } as never,
      {
        execute: async () => ({
          modules: [
            {
              lessons: [
                { id: 'lesson-open', locked: false },
                { id: 'lesson-locked', locked: true },
              ],
            },
          ],
        }),
      } as never,
      () => new Date(),
    )
    await service.search({
      userId: 'profile-1',
      accountId: 'account-1',
      privileged: false,
      query: 'Como faço colisão?',
    })
    expect(allowedLessonIds).toEqual(['lesson-open'])
  })

  test('vincula a fonte à revisão autoritativa do bloco', async () => {
    let saved: (ZappyKnowledgeSourceInput & { blockId?: string; blockRevision?: string }) | null =
      null
    const repo = repository({
      upsert: async (input) => {
        saved = input
        return { id: 'source-1', changed: true }
      },
    }) as ZappyKnowledgeRepository & {
      blockAuthorityForSource(sourceRef: string): Promise<{
        blockId: string
        courseId: string
        lessonId: string
        blockRevision: string
      } | null>
    }
    repo.blockAuthorityForSource = async () => ({
      blockId: 'block-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      blockRevision: 'revision-1',
    })
    const service = new ZappyKnowledgeService(
      repo,
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )

    await service.sync({
      lessonId: 'lesson-1',
      sourceType: 'rich-text',
      sourceRef: 'block:block-1',
      expectedBlockRevision: 'revision-1',
      content: 'Conteúdo atual',
    })

    const captured = saved as
      | (ZappyKnowledgeSourceInput & {
          blockId?: string
          blockRevision?: string
        })
      | null
    expect(captured?.blockId).toBe('block-1')
    expect(captured?.blockRevision).toBe('revision-1')
  })

  test('recusa extração iniciada em uma revisão anterior do bloco', async () => {
    let saved = false
    const service = new ZappyKnowledgeService(
      repository({
        blockAuthorityForSource: async () => ({
          blockId: 'block-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          blockRevision: 'revision-new',
        }),
        upsert: async () => {
          saved = true
          return { id: 'source-1', changed: true }
        },
      }),
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )

    await expect(
      service.sync({
        lessonId: 'lesson-1',
        sourceType: 'video-vtt',
        sourceRef: 'block:block-1',
        expectedBlockRevision: 'revision-old',
        content: 'Conteúdo extraído antes da edição',
      }),
    ).rejects.toThrow(/revisão/i)
    expect(saved).toBe(false)
  })

  test('backfill delega a reconciliação para o estado autoritativo do banco', async () => {
    let reconciled = 0
    const repo = repository({
      listPublishedKidsBlocks: async () => [
        {
          blockId: 'rich-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          blockRevision: 'revision-1',
          kind: 'rich_text',
          content: { kind: 'rich_text', html: '<p>Atual</p>' },
        },
        {
          blockId: 'quiz-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          blockRevision: 'revision-quiz-1',
          kind: 'quiz',
          content: { kind: 'quiz', questions: [] },
        },
      ],
    }) as ZappyKnowledgeRepository & {
      reconcilePublishedBlockSources(): Promise<number>
    }
    repo.reconcilePublishedBlockSources = async () => {
      reconciled += 1
      return 2
    }
    const service = new ZappyKnowledgeService(
      repo,
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )

    const result = await service.backfill()

    expect(reconciled).toBe(1)
    expect(result.deleted).toBe(2)
  })

  test('agenda recuperação Vimeo mesmo quando o bloco não persistiu captions', async () => {
    const service = new ZappyKnowledgeService(
      repository({
        listPublishedKidsBlocks: async () => [
          {
            blockId: 'video-1',
            courseId: 'course-1',
            lessonId: 'lesson-1',
            blockRevision: 'revision-video-1',
            kind: 'video',
            content: {
              kind: 'video',
              provider: 'vimeo',
              src: 'https://player.vimeo.com/video/123456789?h=private',
            },
          },
        ],
      }),
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )

    const result = await service.backfill()

    expect(result.pending).toEqual([
      expect.objectContaining({
        sourceRef: 'block:video-1',
        expectedBlockRevision: 'revision-video-1',
        extraction: { kind: 'vimeo', videoId: '123456789' },
      }),
    ])
  })

  test('backfill processa somente um lote e devolve cursor retomável', async () => {
    const listed: Array<{ after?: string; limit?: number }> = []
    const service = new ZappyKnowledgeService(
      repository({
        listPublishedKidsBlocks: async (input) => {
          listed.push(input ?? {})
          return [
            {
              blockId: 'block-1',
              courseId: 'course-1',
              lessonId: 'lesson-1',
              blockRevision: 'revision-1',
              kind: 'video',
              content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/1' },
            },
            {
              blockId: 'block-2',
              courseId: 'course-1',
              lessonId: 'lesson-1',
              blockRevision: 'revision-2',
              kind: 'video',
              content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/2' },
            },
          ]
        },
      }),
      {} as never,
      {} as never,
      () => new Date('2026-08-02T12:00:00Z'),
    )

    const result = await service.backfill({ cursor: 'block-before', limit: 1 })

    expect(listed).toEqual([{ after: 'block-before', limit: 2 }])
    expect(result.pending).toHaveLength(1)
    expect(result.nextCursor).toBe('block-1')
    expect(result.done).toBe(false)
    expect(result.deleted).toBe(0)
  })
})
