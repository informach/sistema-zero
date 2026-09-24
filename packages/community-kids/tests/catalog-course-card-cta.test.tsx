import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { CatalogCourseCard } from '../src/components/kids/catalog-course-card'
import type { CatalogCourseView } from '../src/lib/types'

function course(over: Partial<CatalogCourseView> = {}): CatalogCourseView {
  return {
    courseSlug: 'cade-todo-mundo',
    title: 'Cadê Todo Mundo?',
    subtitle: null,
    coverImageUrl: null,
    salesPageUrl: null,
    hasAccess: false,
    level: 'iniciante',
    track: '2d',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as CatalogCourseView
}

describe('CTA do cartão de curso', () => {
  test('acesso ativo vai para o curso', () => {
    render(<CatalogCourseCard course={course({ hasAccess: true })} salesUrl={null} />)
    expect(screen.getByRole('link', { name: /Cadê Todo Mundo/ }).getAttribute('href')).toBe(
      '/cursos/cade-todo-mundo',
    )
    expect(screen.getByText('Acessar curso')).toBeTruthy()
  })

  test('curso sem matrícula aponta ao responsável em uma página externa', () => {
    render(<CatalogCourseCard course={course()} salesUrl="https://example.com/oferta" />)
    const link = screen.getByRole('link', { name: /Cadê Todo Mundo/ })
    expect(link.getAttribute('href')).toBe('https://example.com/oferta')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.getByText('Mostrar ao responsável')).toBeTruthy()
    expect(link.getAttribute('aria-label')).toContain('nova aba')
  })

  test('sem página externa não promete acesso clicável', () => {
    const { container } = render(<CatalogCourseCard course={course()} salesUrl={null} />)
    expect(container.querySelector('a')).toBeNull()
    expect(screen.getByText('Ainda não disponível')).toBeTruthy()
  })

  test('bloqueio de jornada preserva o destino interno', () => {
    render(
      <CatalogCourseCard
        course={course({
          hasAccess: true,
          careerLock: {
            locked: true,
            reason: 'foundation-first',
            foundationCourseSlug: 'primeiros-passos',
          },
        })}
        salesUrl="https://example.com/oferta"
        foundationTitle="Primeiros passos"
      />,
    )
    expect(screen.getByRole('link', { name: /Cadê Todo Mundo/ }).getAttribute('href')).toBe(
      '/cursos/primeiros-passos',
    )
    expect(screen.queryByText('Mostrar ao responsável')).toBeNull()
  })
})
