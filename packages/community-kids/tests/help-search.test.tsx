import { afterEach, describe, expect, it } from 'bun:test'
import type { HelpCollectionView, HelpTutorialEntry } from '@sistemazero/core/help'
import { buildHelpSearchText } from '@sistemazero/core/help'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HelpSearch } from '../src/components/kids/help/help-search'

afterEach(cleanup)

const collections: HelpCollectionView[] = [
  {
    id: 'c-estudio',
    slug: 'estudio',
    title: 'Estúdio',
    description: '',
    icon: 'blocks',
    tone: 'estudio',
    position: 0,
    status: 'active',
    publishedCount: 1,
  },
  {
    id: 'c-pinta',
    slug: 'pinta',
    title: 'Pinta',
    description: '',
    icon: 'palette',
    tone: 'pinta',
    position: 1,
    status: 'active',
    publishedCount: 1,
  },
]

function entry(partial: Partial<HelpTutorialEntry> & { title: string }): HelpTutorialEntry {
  const doc = {
    title: partial.title,
    summary: partial.summary ?? 'Resumo.',
    keywords: partial.keywords ?? [],
    steps: [{ id: 'a', title: 'Passo', body: 'Toque no botão.' }],
  }
  return {
    id: partial.id ?? partial.title,
    slug: partial.slug ?? 'slug',
    collectionId: partial.collectionId ?? 'c-estudio',
    collectionSlug: partial.collectionSlug ?? 'estudio',
    title: doc.title,
    summary: doc.summary,
    keywords: doc.keywords,
    toolRef: null,
    searchText: buildHelpSearchText(doc),
    position: 0,
    updatedAt: '2026-09-26T00:00:00.000Z',
  }
}

const tutorials = [
  entry({
    id: '1',
    slug: 'estudio-pre-visualizacao',
    title: 'Como ver meu jogo na Pré-visualização',
    summary: 'Onde o jogo aparece enquanto você monta os blocos.',
    keywords: ['prévia', 'ver o jogo', 'olhinho'],
  }),
  entry({
    id: '2',
    slug: 'pinta-camada',
    collectionId: 'c-pinta',
    collectionSlug: 'pinta',
    title: 'Como usar uma camada',
    summary: 'Camadas separam partes do desenho.',
    keywords: ['camadas', 'esconder'],
  }),
]

/**
 * Critério de aceite da dona: uma busca como "pré-visualização" leva ao TUTORIAL exato, não à
 * coleção. E a régua é a da criança: sem acento, palavra do dia a dia ("prévia").
 */
describe('HelpSearch', () => {
  it('"pre visualizacao" e "prévia" abrem o link do tutorial exato', () => {
    render(<HelpSearch tutorials={tutorials} collections={collections} />)
    const campo = screen.getByLabelText('O que você quer fazer?')
    expect(screen.queryByRole('link')).toBeNull()

    fireEvent.change(campo, { target: { value: 'pre visualizacao' } })
    const link = screen.getByRole('link', { name: /Como ver meu jogo na Pré-visualização/ })
    expect(link.getAttribute('href')).toBe('/como-fazer/estudio-pre-visualizacao')
    expect(screen.getByText('1 tutorial encontrado')).toBeTruthy()
    // O resultado diz a coleção, para a criança saber onde está.
    expect(link.textContent).toContain('Estúdio')

    fireEvent.change(campo, { target: { value: 'prévia' } })
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/como-fazer/estudio-pre-visualizacao',
    )
  })

  it('sem resultado avisa e não lista nada; menos de 2 letras não busca', () => {
    render(<HelpSearch tutorials={tutorials} collections={collections} />)
    const campo = screen.getByLabelText('O que você quer fazer?')
    fireEvent.change(campo, { target: { value: 'foguete' } })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/Nada com essas palavras/)).toBeTruthy()
    fireEvent.change(campo, { target: { value: 'c' } })
    expect(screen.getByText(/Escreva uma palavra/)).toBeTruthy()
  })

  it('a seta para baixo leva o foco ao primeiro resultado (teclado)', () => {
    render(<HelpSearch tutorials={tutorials} collections={collections} />)
    const campo = screen.getByLabelText('O que você quer fazer?')
    fireEvent.change(campo, { target: { value: 'camada' } })
    fireEvent.keyDown(campo, { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('href')).toBe('/como-fazer/pinta-camada')
  })
})
