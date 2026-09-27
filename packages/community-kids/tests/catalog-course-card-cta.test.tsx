import { describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { render } from '@testing-library/react'
import { CatalogCourseCard } from '../src/components/kids/catalog-course-card'
import type { CatalogCourseView } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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
    const { getByRole, getByText } = render(
      <CatalogCourseCard course={course({ hasAccess: true })} salesUrl={null} />,
    )
    expect(getByRole('link', { name: /Cadê Todo Mundo/ }).getAttribute('href')).toBe(
      '/cursos/cade-todo-mundo',
    )
    expect(getByText('Acessar curso')).toBeTruthy()
  })

  test('curso sem matrícula aponta ao responsável em uma página externa', () => {
    const { getByRole, getByText } = render(
      <CatalogCourseCard
        course={course({ journeyRole: 'extra', careerSlot: null })}
        salesUrl="https://example.com/oferta"
        layout="linha"
      />,
    )
    const link = getByRole('link', { name: /Cadê Todo Mundo/ })
    expect(link.getAttribute('href')).toBe('https://example.com/oferta')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(getByText('Mostrar ao responsável')).toBeTruthy()
    expect(link.getAttribute('aria-label')).toContain('nova aba')
    expect(getByText('Curso extra')).toBeTruthy()
  })

  test('sem página externa não promete acesso clicável', () => {
    const { container, getByText } = render(<CatalogCourseCard course={course()} salesUrl={null} />)
    expect(container.querySelector('a')).toBeNull()
    expect(getByText('Ainda não disponível')).toBeTruthy()
  })

  test('bloqueio de jornada preserva o destino interno', () => {
    const { getByRole, queryByText } = render(
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
    expect(getByRole('link', { name: /Cadê Todo Mundo/ }).getAttribute('href')).toBe(
      '/cursos/primeiros-passos',
    )
    expect(queryByText('Mostrar ao responsável')).toBeNull()
  })
})
