import { describe, expect, mock, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
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
mock.module('next/image', () => ({
  default: (props: { src: string; alt: string; width: number; height: number }) =>
    createElement('img', {
      src: props.src,
      alt: props.alt,
      width: props.width,
      height: props.height,
    }),
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
    // Sem o recado, a criança veria o cabeçalho do curso e um vão mudo.
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

  test('a escolha feita no Admin ilustra cada módulo, mesmo após renomeá-lo', () => {
    const desafio = course([
      { ...moduleOf('m1', [lesson('a')]), title: 'Módulo renomeado', illustration: 'desafio-nave' },
      { ...moduleOf('m2', [lesson('b')]), illustration: 'desafio-asteroides' },
      { ...moduleOf('m3', [lesson('c')]), illustration: 'desafio-conquista' },
    ])
    desafio.slug = 'desafio-primeiro-jogo'
    const { container } = render(<CourseTrail course={desafio} />)
    const illustrations = [...container.querySelectorAll('[data-trail-art] img')]
    expect(illustrations.map((element) => element.getAttribute('src'))).toEqual([
      '/trilha/desafio-nave.svg',
      '/trilha/desafio-asteroides.svg',
      '/trilha/desafio-conquista.svg',
    ])
    expect(illustrations.every((element) => element.getAttribute('alt') === '')).toBe(true)
    expect(
      illustrations.every((element) =>
        existsSync(
          resolve(import.meta.dir, '../public', element.getAttribute('src')?.slice(1) ?? ''),
        ),
      ),
    ).toBe(true)
  })

  test('SVG enviado ao R2 aparece na trilha sem entrar no catálogo de artes de exemplo', () => {
    const url = 'https://media.example.com/admin/module-illustrations/nave.svg'
    const { container } = render(
      <CourseTrail course={course([{ ...moduleOf('m1', [lesson('a')]), illustration: url }])} />,
    )
    expect(container.querySelector('[data-trail-art] img')?.getAttribute('src')).toBe(url)
  })

  test('ilustrações revezam de lado e descem até o trecho mais livre da unidade', () => {
    const desafio = course([
      { ...moduleOf('m1', [lesson('a'), lesson('b')]), illustration: 'desafio-nave' },
      { ...moduleOf('vazio', []), illustration: 'desafio-nave' },
      { ...moduleOf('m2', [lesson('c'), lesson('d')]), illustration: 'desafio-asteroides' },
      {
        ...moduleOf('m3', [lesson('e'), lesson('f'), lesson('g')]),
        illustration: 'desafio-conquista',
      },
    ])
    const { container } = render(<CourseTrail course={desafio} />)
    const arts = [...container.querySelectorAll<HTMLElement>('[data-trail-art]')]
    expect(arts.map((art) => art.classList.contains('kids-trail-art--left'))).toEqual([
      true,
      false,
      true,
    ])
    expect(arts.map((art) => art.classList.contains('kids-trail-art--right'))).toEqual([
      false,
      true,
      false,
    ])
    expect(arts.map((art) => art.style.top)).toEqual(['55%', '55%', '66.25%'])
  })

  test('módulos vazios e módulos sem escolha no Admin não recebem ilustrações', () => {
    const desafio = course([
      { ...moduleOf('vazio', []), illustration: 'desafio-nave' },
      { ...moduleOf('antigo', [lesson('a')]), title: 'A nave ganha vida' },
    ])
    desafio.slug = 'desafio-primeiro-jogo'
    const { container } = render(<CourseTrail course={desafio} />)
    expect(container.querySelector('[data-trail-art]')).toBeNull()
  })
})
