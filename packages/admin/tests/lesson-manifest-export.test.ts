import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isLearningManifest,
  type LessonDraftDocument,
  type LessonSection,
} from '@sistemazero/core/learning'
import { createEmptyProject } from '@sistemazero/studio'
import { buildLessonManifest, ManifestExportError } from '../src/lib/lesson-manifest-export'
import type { LessonBlockContent } from '../src/lib/types'

const id = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`

function document(
  blocks: LessonDraftDocument<LessonBlockContent>['blocks'],
  sections: LessonSection[] = [
    {
      id: id(99),
      title: 'Entrega',
      objective: 'Concluir a aula',
      intent: 'closing',
      blockIds: blocks.map((block) => block.id),
      workspaceBlockId: null,
      externalTool: null,
      pendingMedia: [],
      completion: { version: 1, blockIds: [] },
    },
  ],
): LessonDraftDocument<LessonBlockContent> {
  return {
    title: 'Aula do Dino',
    slug: 'aula-01',
    estimatedMinutes: 20,
    attachments: [],
    plannedVideos: [],
    blocks,
    sections,
  }
}

describe('buildLessonManifest', () => {
  test('exports configured Studio, Pinta, materials and certificate as portable content', () => {
    const project = createEmptyProject('dino', 'Corre, Dino!')
    project.createdAt = 0
    project.updatedAt = 0
    project.installedExtensions = [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }]
    const blocks: LessonDraftDocument<LessonBlockContent>['blocks'] = [
      { id: id(1), content: { kind: 'studio', initialProject: project, chain: 'corre-dino' } },
      {
        id: id(2),
        content: {
          kind: 'pinta',
          initialAsset: null,
          purpose: 'submission',
          gallery: { minItems: 1, maxItems: 1 },
        },
      },
      {
        id: id(3),
        content: {
          kind: 'materials',
          title: 'Arquivos',
          items: [
            { id: 'pdf', kind: 'file', attachmentId: id(50), label: 'Caderno' },
            { id: 'site', kind: 'link', url: 'https://example.com', label: 'Site' },
          ],
        },
      },
      { id: id(4), content: { kind: 'certificate', coursePhrase: 'Concluiu o desafio' } },
    ]
    const result = buildLessonManifest(document(blocks), 'corre-dino')
    expect(isLearningManifest(result.manifest)).toBe(true)
    expect(result.manifest.version).toBe(5)
    expect(result.manifest.blocks.map((block) => 'content' in block && block.content.kind)).toEqual(
      ['studio', 'pinta', 'materials', 'certificate'],
    )
    const materials = result.manifest.blocks.find(
      (block) => 'content' in block && block.content.kind === 'materials',
    )
    expect(materials && 'content' in materials ? materials.content : null).toEqual({
      kind: 'materials',
      title: 'Arquivos',
      items: [{ id: 'site', kind: 'link', url: 'https://example.com', label: 'Site' }],
    })
    expect(result.avisos.join(' ')).toContain('enviados novamente')
  })

  test('keeps block keys stable across reorder and repeat exports', () => {
    const first = { id: id(1), content: { kind: 'rich_text' as const, markdown: 'Primeiro' } }
    const second = { id: id(2), content: { kind: 'rich_text' as const, markdown: 'Segundo' } }
    const a = buildLessonManifest(document([first, second]), 'corre-dino').manifest
    const b = buildLessonManifest(document([second, first]), 'corre-dino').manifest
    expect(a.blocks.map((block) => block.key).sort()).toEqual(
      b.blocks.map((block) => block.key).sort(),
    )
    expect(buildLessonManifest(document([first, second]), 'corre-dino').manifest).toEqual(a)
  })

  test('requires completion criteria and refuses unsupported media explicitly', () => {
    const text = { id: id(1), content: { kind: 'rich_text' as const, markdown: 'Olá' } }
    const draft = document([text])
    if (!draft.sections[0]) throw new Error('Seção ausente')
    delete draft.sections[0].completion
    expect(() => buildLessonManifest(draft, 'corre-dino')).toThrow(ManifestExportError)
    const media = document([
      { id: id(2), content: { kind: 'image', url: 'https://example.com/a.png' } },
    ])
    expect(() => buildLessonManifest(media, 'corre-dino')).toThrow('mídia')
  })

  test('exports the current lesson manifest content through the admin document', () => {
    const source: unknown = JSON.parse(
      readFileSync(
        join(
          import.meta.dir,
          '../../../docs/aulas-interativas/aulas/corre-dino-aula-01.manifesto.json',
        ),
        'utf8',
      ),
    )
    if (!isLearningManifest(source)) throw new Error('Manifesto fonte inválido')
    const blocks: LessonDraftDocument<LessonBlockContent>['blocks'] = source.blocks.map(
      (block, n) =>
        'content' in block
          ? { id: id(n + 1), content: block.content as LessonBlockContent }
          : { id: id(n + 1), content: { kind: 'video', provider: 'vimeo', src: '' } },
    )
    const keyToId = new Map(source.blocks.map((block, n) => [block.key, id(n + 1)]))
    const sections: LessonSection[] = source.sections.map((section, n) => ({
      ...section,
      id: id(n + 100),
      blockIds: section.blockKeys.map((key) => keyToId.get(key) ?? ''),
      workspaceBlockId: section.workspaceKey ? (keyToId.get(section.workspaceKey) ?? null) : null,
      completion: section.completion
        ? {
            ...section.completion,
            blockIds: section.completion.blockIds.map((key) => keyToId.get(key) ?? ''),
          }
        : undefined,
    }))
    const draft = document(blocks, sections)
    draft.plannedVideos = source.blocks.flatMap((block, n) =>
      'plannedVideo' in block
        ? [{ blockId: id(n + 1), instructions: block.plannedVideo, videoId: null }]
        : [],
    )
    const exported = buildLessonManifest(draft, source.courseSlug).manifest
    expect(isLearningManifest(exported)).toBe(true)
    expect(exported.blocks.filter((block) => 'content' in block).length).toBe(
      source.blocks.filter((block) => 'content' in block).length,
    )
    expect(exported.sections.length).toBe(source.sections.length)
  })
})
