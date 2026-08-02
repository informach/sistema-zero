import { describe, expect, test } from 'bun:test'
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
import { lessonsMissingVideoTranscript } from '../../src/domain/zappy/zappy-knowledge-report'

function repository(overrides: Partial<ZappyKnowledgeRepository> = {}): ZappyKnowledgeRepository {
  return {
    courseIdForLesson: async () => 'course-1',
    upsert: async () => ({ id: 'source-1', changed: true }),
    deleteByRef: async () => undefined,
    search: async () => [],
    listPublishedKidsBlocks: async () => [],
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
      content: '   ',
    })
    expect(result.status).toBe('empty')
    const captured = saved as ZappyKnowledgeSourceInput | null
    expect(captured?.error).toContain('sem texto selecionável')
    expect(captured?.chunks).toEqual([])
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
})
