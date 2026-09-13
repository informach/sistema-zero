import { describe, expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'
import { createEmptyProject } from '@sistemazero/studio'
import {
  buildContent,
  EMPTY_BLOCK,
} from '../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client'
import {
  appendLessonSection,
  copyLessonContent,
  duplicateLessonSection,
  sectionCompletionCandidates,
  sectionCompletionSummary,
  suggestedCompletion,
} from '../src/lib/lesson-authoring'
import type { LessonBlockContent } from '../src/lib/types'

function fixture(): LessonDraftDocument<LessonBlockContent> {
  return {
    title: 'Aula',
    slug: 'aula',
    estimatedMinutes: null,
    attachments: [],
    supportBlockIds: [],
    plannedVideos: [{ blockId: 'video', instructions: 'Explique o salto', videoId: '123456789' }],
    blocks: [
      {
        id: 'video',
        content: {
          kind: 'video',
          provider: 'vimeo',
          src: 'https://player.vimeo.com/video/123456789',
          posterUrl: 'https://example.test/cover.png',
        },
      },
      {
        id: 'project',
        content: {
          kind: 'studio',
          purpose: 'experiment',
          initialProject: createEmptyProject('seed', 'Dino'),
          chain: 'dino',
          allowBlocks: ['sz_g2d_setup_stage'],
          allowedModes: ['blocks'],
        },
      },
    ],
    sections: [
      {
        ...defaultLessonSection('first', 'Primeira parte', ['video']),
        workspaceBlockId: 'project',
        completion: {
          version: 1,
          blockIds: [],
          projectChecks: [
            {
              id: 'objective',
              label: 'Prepare o palco',
              rule: { type: 'usesBlock', blockType: 'sz_g2d_setup_stage', count: 1 },
            },
          ],
        },
      },
      {
        ...defaultLessonSection('next', 'Outra parte', ['project']),
        completion: { version: 1, blockIds: [] },
      },
    ],
  }
}
describe('lesson authoring integrity', () => {
  test('moving a project to a new delivery keeps every saved draft structurally complete', () => {
    let document = fixture()
    const project = document.blocks.find((b) => b.id === 'project')!
    const section = {
      ...defaultLessonSection('delivery', 'Entregue seu jogo', []),
      intent: 'delivery' as const,
    }
    const orientation = {
      id: 'orientation',
      content: { kind: 'dialogue' as const, text: 'Envie seu jogo!', pose: 'speaking' as const },
    }
    const changes = appendLessonSection(document, section, [orientation, project])
    for (const change of changes) {
      document = applyLessonDraftChange(document, change)
      const assigned = [
        ...document.sections.flatMap((s) => s.blockIds),
        ...document.supportBlockIds,
      ]
      expect(new Set(assigned).size).toBe(assigned.length)
      expect([...assigned].sort()).toEqual(document.blocks.map((b) => b.id).sort())
    }
    expect(document.sections.at(-1)?.blockIds).toEqual(['orientation', 'project'])
    expect(document.sections[0]?.workspaceBlockId).toBe('project')
    expect(document.sections[1]?.blockIds).toEqual([])
    expect(document.plannedVideos).toEqual(fixture().plannedVideos)
  })
  test('section copy refuses to partially create a copy beyond the document limit', () => {
    const document = fixture()
    document.blocks.push(
      ...Array.from({ length: 198 }, (_, i) => ({
        id: `extra-${i}`,
        content: { kind: 'dialogue' as const, text: 'Olá', pose: 'speaking' as const },
      })),
    )
    const before = JSON.stringify(document)
    expect(() => duplicateLessonSection(document, 'first', 'independent')).toThrow('200 conteúdos')
    expect(JSON.stringify(document)).toBe(before)
  })
  test('duplicate section can keep one shared workspace with independent content and objectives', () => {
    const before = fixture()
    const serialized = JSON.stringify(before)
    const copy = duplicateLessonSection(before, 'first', 'shared').reduce(
      applyLessonDraftChange<LessonBlockContent>,
      before,
    )
    const section = copy.sections[1]!
    expect(section.workspaceBlockId).toBe('project')
    expect(section.id).not.toBe('first')
    expect(section.completion?.projectChecks?.[0]?.id).not.toBe('objective')
    expect(section.completion?.projectChecks?.[0]?.rule).toEqual(
      before.sections[0]!.completion!.projectChecks![0]!.rule,
    )
    expect(copy.blocks.filter((b) => b.content.kind === 'studio')).toHaveLength(1)
    expect(copy.plannedVideos[1]).toMatchObject({
      blockId: section.blockIds[0],
      instructions: 'Explique o salto',
      videoId: '123456789',
    })
    expect(JSON.stringify(before)).toBe(serialized)
  })
  test('independent project copies reset cross-lesson chain and keep authoring configuration', () => {
    const before = fixture()
    const copy = duplicateLessonSection(before, 'first', 'independent').reduce(
      applyLessonDraftChange<LessonBlockContent>,
      before,
    )
    const section = copy.sections[1]!
    expect(section.workspaceBlockId).not.toBe('project')
    expect(section.blockIds).toContain(section.workspaceBlockId!)
    const project = copy.blocks.find((b) => b.id === section.workspaceBlockId)!.content
    expect(project).toMatchObject({
      kind: 'studio',
      purpose: 'experiment',
      allowBlocks: ['sz_g2d_setup_stage'],
      allowedModes: ['blocks'],
    })
    if (project.kind !== 'studio') throw new Error('Wrong kind')
    expect(project.chain).toBeUndefined()
    expect(project.initialProject.id).not.toBe('seed')
    expect(project.initialProject.name).toBe('Dino')
  })
  test('video-only completion is not offered when another instructional block exists', () => {
    const document = fixture()
    const section = {
      ...defaultLessonSection('only', 'Tour', ['video']),
      completion: { version: 1 as const, blockIds: [] },
    }
    expect(suggestedCompletion(document, section)?.blockIds).toEqual(['video'])
    document.blocks.push({
      id: 'zappy',
      content: { kind: 'dialogue', text: 'Vamos começar!', pose: 'speaking' },
    })
    section.blockIds.push('zappy')
    expect(sectionCompletionCandidates(document, section)[0]?.issue).toContain('apenas o vídeo')
    expect(suggestedCompletion(document, section)).toBeNull()
  })
  test('book completion and multiple goals have understandable summaries without changing their data', () => {
    const document = fixture()
    document.blocks.push({ id: 'book', content: { kind: 'ebook', url: 'r2priv:book.pdf' } })
    const material = {
      ...defaultLessonSection('material', 'Caderno', ['book']),
      intent: 'material' as const,
      completion: { version: 1 as const, blockIds: ['book'] },
    }
    expect(sectionCompletionSummary(material, document.blocks)).toBe(
      'Abrir o livro ou baixar o PDF',
    )
    expect(sectionCompletionCandidates(document, material)[0]?.issue).toBeUndefined()
    expect(sectionCompletionSummary(document.sections[0]!, document.blocks)).toContain(
      '1 objetivo em Dino',
    )
  })
  test('legacy video editing retains cover, provider and captions; explicit removal clears stale metadata', () => {
    const previous: LessonBlockContent = {
      kind: 'video',
      src: 'https://example.test/movie.mp4',
      provider: 'file',
      posterUrl: 'https://example.test/cover.jpg',
      durationSeconds: 42,
      captions: [{ lang: 'pt', url: 'https://example.test/pt.vtt' }],
    }
    const form = {
      ...EMPTY_BLOCK,
      kind: 'video' as const,
      src: previous.src,
      provider: previous.provider,
      posterUrl: previous.posterUrl!,
      durationSeconds: '42',
      captions: previous.captions!,
    }
    expect(buildContent(form, undefined, previous)).toEqual(previous)
    const removed = buildContent(
      { ...form, src: '', posterUrl: '', durationSeconds: '', captions: [] },
      undefined,
      previous,
    )
    expect(removed).toMatchObject({
      src: '',
      posterUrl: undefined,
      durationSeconds: undefined,
      captions: undefined,
    })
  })
  test('interactive copies remap answer references along with choice identities', () => {
    const content: LessonBlockContent = {
      kind: 'interactive',
      title: 'Ordem',
      instructions: 'Organize',
      hints: [],
      required: false,
      activity: {
        type: 'sequence',
        mode: 'order',
        items: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        solution: ['a', 'b'],
        targets: [],
      },
    }
    const copied = copyLessonContent(content)
    if (copied.kind !== 'interactive' || copied.activity.type !== 'sequence')
      throw new Error('Wrong kind')
    expect(copied.activity.items[0]!.id).not.toBe('a')
    expect(copied.activity.solution).toEqual(copied.activity.items.map((item) => item.id))
  })
})
