import { describe, expect, it } from 'bun:test'
import { toLessonDetailView } from '../../src/application/mappers/views'
import type { LessonWithContent } from '../../src/domain/course/course'
import type { MaterialItem } from '../../src/domain/course/lesson-block'

/**
 * A projeção do bloco de MATERIAIS para o aluno.
 *
 * ⚠️⚠️ O item de arquivo guarda só o `attachmentId`. Quem preenche rótulo, tipo e tamanho é ESTA
 * projeção, lendo `lesson.attachments` — e é aqui que a garantia mora: a localização real
 * (`r2priv:<key>`, ou o link externo) **nunca** entra no que vai ao navegador. O download é pela
 * rota autenticada de anexo, a mesma que aplica a marca d'água por aluno.
 */
const anexo = (id: string, label: string, url: string) => ({
  id,
  lessonId: 'aula',
  label,
  url,
  fileType: 'application/json',
  sizeBytes: 2048,
  zappyStudentNotebook: false,
  sortOrder: 0,
})

function aula(
  items: MaterialItem[],
  attachments = [anexo('a1', 'Assets do Pinta', 'r2priv:x/y.json')],
) {
  return {
    id: 'aula',
    moduleId: 'm',
    courseId: 'c',
    slug: 'aula-1',
    title: 'Aula 1',
    sortOrder: 0,
    estimatedMinutes: null,
    isPublished: true,
    attachments,
    blocks: [
      {
        id: 'b1',
        lessonId: 'aula',
        kind: 'materials' as const,
        sortOrder: 0,
        contentRevision: 'r1',
        content: { kind: 'materials' as const, title: 'Arquivos do Pinta', items },
      },
    ],
  } satisfies LessonWithContent
}

const itens = (view: ReturnType<typeof toLessonDetailView>) =>
  (view.blocks[0]?.content as { items: MaterialItem[] }).items

describe('a projeção dos materiais complementares para o aluno', () => {
  it('hidrata rótulo, tipo e tamanho a partir do anexo', () => {
    const view = toLessonDetailView(
      aula([{ id: 'i1', kind: 'file', attachmentId: 'a1' }]),
      'curso',
      false,
      null,
    )
    expect(itens(view)[0]).toEqual({
      id: 'i1',
      kind: 'file',
      attachmentId: 'a1',
      label: 'Assets do Pinta',
      fileType: 'application/json',
      sizeBytes: 2048,
    })
  })

  it('⚠️⚠️ a localização real do arquivo NÃO entra na resposta do aluno', () => {
    const view = toLessonDetailView(
      aula([{ id: 'i1', kind: 'file', attachmentId: 'a1' }]),
      'curso',
      false,
      null,
    )
    expect(JSON.stringify(view)).not.toContain('r2priv:')
    // E o mesmo vale para anexo EXTERNO, cuja URL também é do admin e não do aluno.
    const externo = toLessonDetailView(
      aula(
        [{ id: 'i1', kind: 'file', attachmentId: 'a9' }],
        [anexo('a9', 'Planilha', 'https://interno.exemplo.com/secreto.xlsx')],
      ),
      'curso',
      false,
      null,
    )
    expect(JSON.stringify(externo)).not.toContain('secreto.xlsx')
  })

  it('o rótulo que a autora escreveu VENCE o nome do arquivo', () => {
    const view = toLessonDetailView(
      aula([{ id: 'i1', kind: 'file', attachmentId: 'a1', label: 'Baixe isto primeiro' }]),
      'curso',
      false,
      null,
    )
    expect(itens(view)[0]).toMatchObject({ label: 'Baixe isto primeiro' })
  })

  it('⚠️ item cujo anexo foi apagado SOME, em vez de virar linha morta', () => {
    // A autora apagou o arquivo da lista de anexos e esqueceu o item. Desenhar a linha daria à
    // criança um botão que não baixa nada; o `inspect` do rascunho avisa a autora antes de publicar.
    const view = toLessonDetailView(
      aula([
        { id: 'i1', kind: 'file', attachmentId: 'sumiu' },
        { id: 'i2', kind: 'text', markdown: 'oi' },
      ]),
      'curso',
      false,
      null,
    )
    expect(itens(view).map((i) => i.id)).toEqual(['i2'])
  })

  it('os itens que não são arquivo atravessam intactos, na ordem da autora', () => {
    const originais: MaterialItem[] = [
      { id: 'i1', kind: 'link', url: 'https://exemplo.com', label: 'Paleta' },
      { id: 'i2', kind: 'video', url: 'https://vimeo.com/1' },
      { id: 'i3', kind: 'image', url: 'https://cdn.exemplo.com/a.png', alt: 'tela' },
    ]
    const view = toLessonDetailView(aula(originais), 'curso', false, null)
    expect(itens(view)).toEqual(originais)
  })
})
