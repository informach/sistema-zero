import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import {
  CourseAccessExpiry,
  courseAccessExpiryCopy,
} from '../src/components/kids/course-access-expiry'
import { CourseCard } from '../src/components/kids/course-card'
import type { MyCourseView } from '../src/lib/types'

afterEach(() => setSystemTime())

function course(expiresAt: string | null): MyCourseView {
  return {
    courseSlug: 'desafio-primeiro-jogo',
    title: 'Desafio do Primeiro Jogo',
    subtitle: 'Crie seu primeiro jogo em quatro dias.',
    coverImageUrl: null,
    access: { accessType: 'course', expiresAt },
    progress: { completedLessons: 0, totalLessons: 4, percent: 0 },
    continueLessonId: null,
  }
}

describe('prazo de acesso ao curso', () => {
  test('formata a data absoluta em pt-BR no fuso do produto', () => {
    expect(
      courseAccessExpiryCopy('2026-10-16T15:00:00.000Z', new Date('2026-09-16T15:00:00.000Z')),
    ).toEqual({ absolute: 'Acesso até 16/10/2026', relative: null })
  })

  test('avisa quando faltam exatamente 7 ou 3 dias', () => {
    const now = new Date('2026-10-09T15:00:00.000Z')
    expect(courseAccessExpiryCopy('2026-10-16T15:00:00.000Z', now)?.relative).toBe('Faltam 7 dias')
    expect(
      courseAccessExpiryCopy('2026-10-12T15:00:00.000Z', new Date('2026-10-09T15:00:00.000Z'))
        ?.relative,
    ).toBe('Faltam 3 dias')
  })

  test('não mostra prazo para acesso sem data de término', () => {
    const { container } = render(<CourseAccessExpiry expiresAt={null} />)
    expect(container.childElementCount).toBe(0)
  })

  test('o card mostra a data e a urgência como texto legível em tela estreita', () => {
    setSystemTime(new Date('2026-10-09T15:00:00.000Z'))
    const { container } = render(<CourseCard course={course('2026-10-16T15:00:00.000Z')} />)

    expect(screen.getByText('Acesso até 16/10/2026')).toBeTruthy()
    expect(screen.getByText('Faltam 7 dias')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(container.textContent).not.toContain('—')
  })

  test('o card vitalício não inventa uma data de expiração', () => {
    render(<CourseCard course={course(null)} />)
    expect(screen.queryByText(/Acesso até/)).toBeNull()
    expect(screen.queryByText(/Falta/)).toBeNull()
  })
})
