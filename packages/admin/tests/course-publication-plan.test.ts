import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { planCoursePublicationMedia as planCanonicalPublicationMedia } from '../src/lib/course-publication-plan'

const planCoursePublicationMedia = (
  documents: Parameters<typeof planCanonicalPublicationMedia>[0],
) => planCanonicalPublicationMedia(documents, 'a'.repeat(64))

const document = (
  blocks: LessonDraftDocument['blocks'],
  attachments: LessonDraftDocument['attachments'] = [],
): LessonDraftDocument => ({
  title: 'Aula',
  slug: 'aula',
  estimatedMinutes: null,
  blocks,
  attachments,
  sections: [],
  plannedVideos: [],
})
describe('preparação de mídia do curso', () => {
  test('a mesma gravação tem preparação idêntica quando a frase visível muda', () => {
    const plan = (text: string) =>
      planCoursePublicationMedia([
        document([
          {
            id: randomUUID(),
            content: {
              kind: 'dialogue',
              text,
              zappySpeech: { sourceText: text, speechText: 'Clique no botão xis.' },
            },
          },
        ]),
      ]).tasks.find((task) => task.input.kind === 'voice')
    expect(plan('Clique no botão X.')).toEqual(plan('Clique no xis.'))
  })
  test('deduplica falas entre aulas e mantém as vinculações dos dois blocos', () => {
    const first = randomUUID(),
      second = randomUUID()
    const before = [
      document([{ id: first, content: { kind: 'dialogue', text: 'Clique no botão X.' } }]),
      document([{ id: second, content: { kind: 'dialogue', text: 'Clique no botão X.' } }]),
    ]
    const frozen = structuredClone(before)
    const plan = planCoursePublicationMedia(before)
    expect(plan.tasks.filter((task) => task.input.kind === 'voice')).toHaveLength(1)
    expect(plan.voices[first]).toEqual(plan.voices[second])
    expect(plan.tasks.filter((task) => task.input.kind === 'knowledge')).toHaveLength(2)
    expect(planCoursePublicationMedia(before)).toEqual(plan)
    expect(before).toEqual(frozen)
  })
  test('prepara a transcrição existente, PDF autorizado e texto, sem indexar gabarito', () => {
    const video = randomUUID(),
      notebook = randomUUID()
    const plan = planCoursePublicationMedia([
      document(
        [
          {
            id: video,
            content: {
              kind: 'video',
              provider: 'vimeo',
              src: 'https://player.vimeo.com/video/1234?h=abc',
              captions: [{ lang: 'pt', url: 'https://cdn.test/a.vtt' }],
            },
          },
          {
            id: randomUUID(),
            content: { kind: 'studio', teacherSolution: { secret: 'nao indexar' } },
          },
          { id: randomUUID(), content: { kind: 'rich_text', markdown: '**Texto da aula**' } },
        ],
        [
          {
            id: notebook,
            label: 'Passo a passo',
            url: 'r2priv:materiais/curso.pdf',
            fileType: 'application/pdf',
            sizeBytes: 100,
            zappyStudentNotebook: true,
          },
          {
            id: randomUUID(),
            label: 'Outro PDF',
            url: 'r2priv:materiais/outro.pdf',
            fileType: 'application/pdf',
            sizeBytes: 100,
          },
        ],
      ),
    ])
    expect(plan.tasks.map((task) => task.input)).toContainEqual({ kind: 'video', videoId: '1234' })
    expect(plan.tasks.map((task) => task.input)).toContainEqual({
      kind: 'knowledge',
      sourceRef: `block:${video}`,
      sourceType: 'video-vtt',
      extraction: { kind: 'stable-vtt', location: 'https://cdn.test/a.vtt' },
    })
    expect(plan.tasks.filter((task) => task.input.kind === 'knowledge')).toHaveLength(3)
    expect(JSON.stringify(plan)).not.toContain('nao indexar')
    expect(JSON.stringify(plan)).not.toContain('outro.pdf')
  })
  test('usa Vimeo quando não há legenda estável e recusa vídeo sem identidade', () => {
    const video = (src: string) =>
      document([{ id: randomUUID(), content: { kind: 'video', provider: 'vimeo', src } }])
    const plan = planCoursePublicationMedia([video('https://player.vimeo.com/video/1234')])
    expect(
      plan.tasks.some(
        (task) => task.input.kind === 'knowledge' && task.input.extraction.kind === 'vimeo',
      ),
    ).toBe(true)
    expect(() => planCoursePublicationMedia([video('https://outro.test/filme')])).toThrow(
      'identidade',
    )
  })
})
