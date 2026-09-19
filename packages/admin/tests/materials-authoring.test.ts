import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  type LessonDraftDocument,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import {
  EMPTY_MATERIALS,
  validateMaterials,
} from '../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/materials-builder'
import { lessonEditorialWarnings } from '../src/components/editor/lesson-editorial-warnings'
import {
  lessonContentLabel,
  sectionCompletionCandidates,
  sectionCompletionSummary,
  suggestedCompletion,
} from '../src/lib/lesson-authoring'
import type { LessonBlockContent, MaterialItem } from '../src/lib/types'

const anexo = (id: string, label: string) => ({
  id,
  label,
  url: `r2priv:aulas/${id}.json`,
  fileType: 'application/json',
  sizeBytes: 1024,
})

function doc(
  items: MaterialItem[],
  attachments = [anexo('a1', 'dino.pinta.json')],
): LessonDraftDocument<LessonBlockContent> {
  const bloco = {
    id: 'b-mat',
    content: { kind: 'materials' as const, title: 'Arquivos do Pinta', items },
  }
  return {
    title: 'Aula',
    slug: 'aula',
    estimatedMinutes: null,
    attachments,
    plannedVideos: [],
    blocks: [bloco],
    sections: [defaultLessonSection('s1', 'Parte 1', [bloco.id])],
  }
}

describe('autoria dos materiais complementares', () => {
  test('⚠️⚠️ arquivo que subiu e não foi COLOCADO em bloco nenhum é avisado antes de publicar', () => {
    // A biblioteca aceita arquivos para diferentes usos. Só os totalmente sem uso recebem aviso.
    const sozinho = lessonEditorialWarnings(doc([], [anexo('a1', 'dino.pinta.json')]))
    expect(
      sozinho.some((w) => w.includes('dino.pinta.json') && w.includes('ainda não foi usado')),
    ).toBe(true)

    const colocado = lessonEditorialWarnings(doc([{ id: 'i1', kind: 'file', attachmentId: 'a1' }]))
    expect(colocado.some((w) => w.includes('ainda não foi usado'))).toBe(false)
  })

  test('com vários arquivos soltos o aviso conta, em vez de listar todos', () => {
    const avisos = lessonEditorialWarnings(
      doc([], [anexo('a1', 'um'), anexo('a2', 'dois'), anexo('a3', 'três')]),
    )
    expect(avisos.some((w) => w.startsWith('3 arquivos ainda não'))).toBe(true)
  })

  test('arquivos do bloco podem ser marcados individualmente como obrigatórios', () => {
    const d = doc([{ id: 'i1', kind: 'file', attachmentId: 'a1' }])
    expect(sectionCompletionCandidates(d, d.sections[0]!)).toEqual([
      {
        id: 'b-mat',
        label: 'Arquivos do Pinta',
        model: 'Baixar arquivos selecionados',
        files: [{ id: 'i1', label: 'dino.pinta.json' }],
        issue: undefined,
      },
    ])
    d.sections[0]!.completion = {
      version: 1,
      blockIds: ['b-mat'],
      materialItems: [{ blockId: 'b-mat', itemIds: ['i1'] }],
    }
    expect(sectionCompletionSummary(d.sections[0]!, d.blocks, d.attachments)).toBe(
      'Baixar dino.pinta.json',
    )
  })

  test('vídeo e arquivo aparecem juntos, mas o download nunca é exigido automaticamente', () => {
    const d = doc([{ id: 'i1', kind: 'file', attachmentId: 'a1' }])
    d.blocks.unshift({
      id: 'b-video',
      content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
    })
    d.sections[0]!.blockIds.unshift('b-video')
    const candidates = sectionCompletionCandidates(d, d.sections[0]!)
    expect(candidates.map((candidate) => candidate.model)).toEqual([
      'Assistir a 90% do vídeo',
      'Baixar arquivos selecionados',
    ])
    expect(candidates.every((candidate) => !candidate.issue)).toBe(true)
    expect(suggestedCompletion(d, d.sections[0]!)).toBeNull()
  })
  test('Material do curso aceita vídeo e arquivos como dois critérios explícitos', () => {
    const d = doc([
      { id: 'i-caderno', kind: 'file', attachmentId: 'a1', label: 'Caderno do aluno' },
    ])
    d.blocks.unshift({
      id: 'b-video',
      content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
    })
    const section = d.sections[0]!
    section.intent = 'material'
    section.blockIds.unshift('b-video')
    section.completion = {
      version: 1,
      blockIds: ['b-video', 'b-mat'],
      materialItems: [{ blockId: 'b-mat', itemIds: ['i-caderno'] }],
    }
    expect(sectionCompletionIssues(d.sections, d.blocks)).toEqual([])
    expect(sectionCompletionCandidates(d, section).every((candidate) => !candidate.issue)).toBe(
      true,
    )
    expect(sectionCompletionSummary(section, d.blocks)).toBe(
      'Assistir a 90% do vídeo + Baixar Caderno do aluno',
    )
  })

  test('o rótulo na lista do percurso é o nome do bloco, ou a contagem', () => {
    const item: MaterialItem = { id: 'i1', kind: 'file', attachmentId: 'a1' }
    expect(
      lessonContentLabel({
        id: 'b',
        content: { kind: 'materials', title: 'Arquivos do Pinta', items: [item] },
      }),
    ).toBe('Arquivos do Pinta')
    expect(lessonContentLabel({ id: 'b', content: { kind: 'materials', items: [item] } })).toBe(
      '1 material',
    )
    expect(
      lessonContentLabel({
        id: 'b',
        content: { kind: 'materials', items: [item, { id: 'i2', kind: 'text', markdown: 'oi' }] },
      }),
    ).toBe('2 materiais')
  })

  test('a validação do formulário espelha o que o servidor exige', () => {
    expect(validateMaterials(EMPTY_MATERIALS)).toBe('Adicione ao menos um material.')
    expect(
      validateMaterials({ title: '', items: [{ id: 'i1', kind: 'file', attachmentId: '' }] }),
    ).toBe('Envie o arquivo de cada item.')
    // ⚠️ Só https: um link http numa página https é conteúdo misto, e a imagem nem carregaria.
    expect(
      validateMaterials({
        title: '',
        items: [{ id: 'i1', kind: 'link', url: 'http://x.com', label: 'X' }],
      }),
    ).toContain('https://')
    expect(
      validateMaterials({
        title: '',
        items: [{ id: 'i1', kind: 'link', url: 'https://x.com', label: 'X' }],
      }),
    ).toBeNull()
  })
})
