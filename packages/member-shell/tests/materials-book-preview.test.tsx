import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MaterialsBookPreview } from '../src/components/ebook/materials-book-preview'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '../src/components/lesson-player-context'
import type { MaterialsBlock } from '../src/lib/types'

const player: LessonPlayerContextValue = {
  lessonId: '11111111-1111-4111-8111-111111111111',
  courseSlug: 'cade-todo-mundo',
  viewerId: 'child-a',
  viewerWatermark: null,
  initialPositionSeconds: null,
}

function show(content: MaterialsBlock) {
  return renderToStaticMarkup(
    <LessonPlayerProvider value={player}>
      <MaterialsBookPreview content={content} />
    </LessonPlayerProvider>,
  )
}

describe('prévia do caderno no material da aula', () => {
  test('um PDF no mesmo bloco disponibiliza os dois modos de leitura', () => {
    const html = show({
      kind: 'materials',
      title: 'Caderno do Aluno',
      bookPreview: true,
      items: [
        {
          id: 'outro',
          kind: 'file',
          attachmentId: 'x',
          label: 'imagem.png',
          fileType: 'image/png',
        },
        {
          id: 'pdf',
          kind: 'file',
          attachmentId: 'pdf-id',
          label: 'caderno.pdf',
          fileType: 'application/pdf',
        },
      ],
    })
    expect(html).toContain('Livro 3D')
    expect(html).toContain('Ler por páginas')
    expect(html).not.toContain('Vincule um PDF')
    expect(html).not.toContain('r2priv:')
  })

  test('sem PDF orienta a criança sem mostrar um livro vazio', () => {
    const html = show({ kind: 'materials', bookPreview: true, items: [] })
    expect(html).toContain('O caderno ainda não está disponível nesta aula')
    expect(html).not.toContain('Ler por páginas')
  })

  test('sem PDF na prévia de autoria pede vínculo do arquivo', () => {
    const html = renderToStaticMarkup(
      <MaterialsBookPreview content={{ kind: 'materials', bookPreview: true, items: [] }} />,
    )
    expect(html).toContain('Vincule um PDF a este bloco de materiais')
  })
})
