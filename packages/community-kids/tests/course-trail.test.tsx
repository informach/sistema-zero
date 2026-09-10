import { describe, expect, mock, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import type { CourseDetailView, LessonOutlineView, ModuleOutlineView } from '../src/lib/types'

// O baú virou ilha `'use client'` com `useRouter` (ele abre com um clique e
// re-sincroniza o XP do topo). Sem o router montado, renderizar a trilha quebra.
//
// ⚠️ Espalhe o módulo inteiro e NÃO restaure no fim: bun:test não isola module
// mocks por arquivo, e devolver o módulo real no `afterAll` derruba os arquivos
// que rodam depois (medido: 19 quedas). Os outros mocks de `next/navigation` do
// pacote seguem a mesma receita.
const nav = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...nav,
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}))

const { CourseTrail } = await import('../src/components/kids/course-trail')

function lesson(id: string): LessonOutlineView {
  return {
    id,
    slug: id,
    title: `Aula ${id}`,
    sortOrder: 0,
    estimatedMinutes: null,
    completed: false,
    locked: false,
  }
}

function moduleOf(id: string, lessons: LessonOutlineView[]): ModuleOutlineView {
  return {
    id,
    title: `Modulo ${id}`,
    summary: null,
    sortOrder: 0,
    lessons,
    // O estado do baú vem do SERVIDOR desde 09/2026 (a criança abre com um
    // clique). Aqui a fixture só precisa dizer que ele existe.
    chest: {
      unlocked: lessons.length > 0 && lessons.every((l) => l.completed),
      claimed: false,
      xp: 25,
      coins: 15,
    },
  }
}

function course(modules: ModuleOutlineView[]): CourseDetailView {
  const all = modules.flatMap((m) => m.lessons)
  return {
    slug: 'curso-teste',
    title: 'Curso Teste',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    access: { accessType: 'course', expiresAt: null },
    progress: {
      completedLessons: 0,
      totalLessons: all.length,
      percent: 0,
      lastCompletedAt: null,
    },
    continueLessonId: null,
    myRating: null,
    salesPageUrl: null,
    modules,
  }
}

describe('CourseTrail', () => {
  test('curso sem NENHUMA aula publicada mostra recado, não uma área em branco', () => {
    // Antes de esconder os módulos vazios, os banners deles preenchiam a página.
    // Sem o recado, a criança veria capa, barra de progresso e um vão mudo.
    render(<CourseTrail course={course([moduleOf('m1', []), moduleOf('m2', [])])} />)
    expect(screen.getByText(/As aulas estão sendo preparadas/)).toBeTruthy()
    expect(screen.queryByText(/Unidade 1/)).toBeNull()
    // E o título do módulo em preparo não vaza junto com o recado.
    expect(screen.queryByText(/Modulo m1/)).toBeNull()
  })

  test('com aula publicada desenha a trilha e NÃO o recado', () => {
    render(<CourseTrail course={course([moduleOf('m1', [lesson('a')])])} />)
    expect(screen.getByText(/Unidade 1/)).toBeTruthy()
    expect(screen.getByText('Modulo m1')).toBeTruthy()
    expect(screen.queryByText(/As aulas estão sendo preparadas/)).toBeNull()
  })

  test('módulo vazio no meio some, e a numeração das unidades continua seguida', () => {
    render(
      <CourseTrail
        course={course([
          moduleOf('m1', [lesson('a')]),
          moduleOf('em-preparo', []),
          moduleOf('m3', [lesson('b')]),
        ])}
      />,
    )
    expect(screen.getByText(/Unidade 1/)).toBeTruthy()
    expect(screen.getByText(/Unidade 2/)).toBeTruthy()
    expect(screen.queryByText(/Unidade 3/)).toBeNull()
    expect(screen.queryByText(/Modulo em-preparo/)).toBeNull()
  })
})
