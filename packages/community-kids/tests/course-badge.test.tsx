import { describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { CatalogCourseCard } from '../src/components/kids/catalog-course-card'
import { CourseCard } from '../src/components/kids/course-card'
import { courseBadge } from '../src/lib/course-badge'
import type { CatalogCourseView, MyCourseView } from '../src/lib/types'

/**
 * O selo de estado do card — a outra metade do contador "N de M aventuras prontas".
 *
 * ⚠️⚠️ O caso que este arquivo existe para travar é o BÔNUS: ele NÃO deve o Mural, e um
 * selo "Publique no Mural" ali inventaria uma dívida inexistente — a mesma mentira que a
 * régua mista foi feita para matar.
 */

const PRONTO = { completed: true, showcased: true }
const SO_CONCLUIDO = { completed: true, showcased: false }

function catalogCourse(over: Partial<CatalogCourseView>): CatalogCourseView {
  return {
    courseSlug: 'curso',
    title: 'Curso',
    subtitle: null,
    coverImageUrl: null,
    salesPageUrl: null,
    hasAccess: true,
    level: 'iniciante',
    track: '2d',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as CatalogCourseView
}

function myCourse(over: Partial<MyCourseView>): MyCourseView {
  return {
    courseSlug: 'curso',
    title: 'Curso',
    subtitle: null,
    coverImageUrl: null,
    access: { status: 'active', expiresAt: null },
    progress: { completedLessons: 8, totalLessons: 8, percent: 100 },
    continueLessonId: null,
    ...over,
  } as MyCourseView
}

describe('courseBadge (a régua, pura)', () => {
  test('posição: nada → concluída → pronta', () => {
    expect(courseBadge({ careerSlot: 1 })).toBeNull()
    expect(courseBadge({ careerSlot: 1, milestones: SO_CONCLUIDO })).toBe('publicar')
    expect(courseBadge({ careerSlot: 1, milestones: PRONTO })).toBe('pronta')
  })

  test('🚨 bônus nunca pede o Mural: concluir já é estar pronto', () => {
    expect(courseBadge({ careerSlot: null, milestones: SO_CONCLUIDO })).toBe('pronta')
    expect(courseBadge({ careerSlot: null })).toBeNull()
  })

  test('publicou sem concluir (estado torto do ledger) não vira selo', () => {
    // Não existe na prática, mas "showcased sem completed" não pode virar "pronta".
    expect(courseBadge({ careerSlot: 1, milestones: { completed: false, showcased: true } })).toBe(
      null,
    )
  })
})

describe('selo no card da trilha', () => {
  test('curso de posição concluído sem publicar mostra o que falta', () => {
    render(
      <CatalogCourseCard
        course={catalogCourse({ careerSlot: 2, milestones: SO_CONCLUIDO })}
        salesUrl={null}
      />,
    )
    expect(screen.getByText('Publique no Mural')).toBeTruthy()
  })

  test('🚨 curso BÔNUS concluído mostra "Pronta!", NUNCA o pedido de Mural', () => {
    render(
      <CatalogCourseCard
        course={catalogCourse({ careerSlot: null, milestones: SO_CONCLUIDO })}
        salesUrl={null}
      />,
    )
    expect(screen.getByText('Pronta!')).toBeTruthy()
    expect(screen.queryByText('Publique no Mural')).toBeNull()
  })

  test('curso intocado (e members antigo, sem o campo) não ganha selo algum', () => {
    const { container } = render(
      <CatalogCourseCard course={catalogCourse({ careerSlot: 1 })} salesUrl={null} />,
    )
    expect(container.textContent).not.toContain('Pronta!')
    expect(container.textContent).not.toContain('Publique no Mural')
  })
})

describe('selo no card da home', () => {
  test('mostra só o pendente: "pronta" já é dito pela barra em 100% e pelo CTA', () => {
    const { rerender, container } = render(
      <CourseCard course={myCourse({ careerSlot: 2, milestones: SO_CONCLUIDO })} />,
    )
    expect(screen.getByText('Publique no Mural')).toBeTruthy()

    rerender(<CourseCard course={myCourse({ careerSlot: 2, milestones: PRONTO })} />)
    expect(container.textContent).not.toContain('Pronta!')
    expect(container.textContent).toContain('Revisar curso')
  })
})
