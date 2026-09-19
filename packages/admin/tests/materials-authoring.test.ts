import { describe, expect, test } from 'bun:test'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import {
  EMPTY_MATERIALS,
  validateMaterials,
} from '../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/materials-builder'
import { lessonEditorialWarnings } from '../src/components/editor/lesson-editorial-warnings'
import { lessonContentLabel, sectionCompletionCandidates } from '../src/lib/lesson-authoring'
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
    // O card "Materiais da aula" no pé da página não existe mais: um anexo fora de um bloco é um
    // arquivo íntegro no R2 e invisível na aula. A autora publica pelo percurso e pode nunca abrir
    // a aba de Anexos, então o aviso precisa estar TAMBÉM no painel de publicação.
    const sozinho = lessonEditorialWarnings(doc([], [anexo('a1', 'dino.pinta.json')]))
    expect(sozinho.some((w) => w.includes('dino.pinta.json') && w.includes('não o vê'))).toBe(true)

    const colocado = lessonEditorialWarnings(doc([{ id: 'i1', kind: 'file', attachmentId: 'a1' }]))
    expect(colocado.some((w) => w.includes('bloco de materiais'))).toBe(false)
  })

  test('com vários arquivos soltos o aviso conta, em vez de listar todos', () => {
    const avisos = lessonEditorialWarnings(
      doc([], [anexo('a1', 'um'), anexo('a2', 'dois'), anexo('a3', 'três')]),
    )
    expect(avisos.some((w) => w.startsWith('3 arquivos'))).toBe(true)
  })

  test('⚠️ materiais NÃO podem virar critério de conclusão da seção', () => {
    // Complementar é o que está fora do percurso obrigatório. Se ele entrasse na lista de
    // critérios, a seção fecharia sozinha (o bloco não produz requisito nenhum) e a autora acharia
    // que tinha exigido alguma coisa.
    const d = doc([{ id: 'i1', kind: 'file', attachmentId: 'a1' }])
    expect(sectionCompletionCandidates(d, d.sections[0]!)).toEqual([])
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
