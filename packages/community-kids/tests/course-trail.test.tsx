import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { act, render, screen } from '@testing-library/react'
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

const riv = (nome: string) => `https://media.example.com/admin/module-rive/${nome}.riv`

/**
 * ⚠️ O `IntersectionObserver` do happy-dom EXISTE mas NUNCA chama o callback
 * (medido). O `TrailRive` só monta o canvas na primeira aparição, então sem este
 * falso a arte nunca entra e os testes mediriam o contrário do que a criança vê.
 * Mesma receita do `lesson-experimentation.test.tsx`; o `test-setup.ts` restaura o
 * global depois de cada teste, por isso o falso é rearmado no `beforeEach`.
 */
function observadorQueSempreVe(): void {
  globalThis.IntersectionObserver = class {
    constructor(private readonly avisar: IntersectionObserverCallback) {}
    observe() {
      this.avisar(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
}
beforeEach(observadorQueSempreVe)

/**
 * Deixa o `next/dynamic` do canvas resolver dentro do `act`. Sem isso o React
 * avisa que um `LoadableComponent` atualizou estado fora dele.
 */
const assenta = () => act(async () => {})

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

  test('não desenha bolinhas entre aulas nem antes do baú', () => {
    const { container } = render(
      <CourseTrail course={course([moduleOf('m1', [lesson('a'), lesson('b')])])} />,
    )
    expect(container.querySelector('.kids-trail-dot')).toBeNull()
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

  test('a animação enviada no Admin aparece em cada módulo, mesmo após renomeá-lo', async () => {
    const desafio = course([
      { ...moduleOf('m1', [lesson('a')]), title: 'Módulo renomeado', riveUrl: riv('nave') },
      { ...moduleOf('m2', [lesson('b')]), riveUrl: riv('asteroides') },
      { ...moduleOf('m3', [lesson('c')]), riveUrl: riv('conquista') },
    ])
    desafio.slug = 'desafio-primeiro-jogo'
    const { container } = render(<CourseTrail course={desafio} />)
    await assenta()
    expect(
      [...container.querySelectorAll('[data-trail-art] [data-src]')].map((el) =>
        el.getAttribute('data-src'),
      ),
    ).toEqual([riv('nave'), riv('asteroides'), riv('conquista')])
  })

  test('valor que não é .riv não vira arte (guarda do moduleRiveSrc)', async () => {
    // Sobra da era do SVG animado, ou qualquer coisa estranha no banco: o runtime
    // do Rive só produziria um canvas vazio, indistinguível de "ninguém subiu nada".
    for (const valor of [
      'https://media.example.com/admin/module-illustrations/nave.svg',
      'desafio-nave',
      'javascript:alert(1)',
    ]) {
      const { container, unmount } = render(
        <CourseTrail course={course([{ ...moduleOf('m1', [lesson('a')]), riveUrl: valor }])} />,
      )
      await assenta()
      expect(container.querySelector('[data-trail-art]')).toBeNull()
      unmount()
    }
  })

  test('ilustrações escolhem lado e altura pelo trecho mais livre da unidade', () => {
    const desafio = course([
      { ...moduleOf('m1', [lesson('a'), lesson('b')]), riveUrl: riv('nave') },
      { ...moduleOf('vazio', []), riveUrl: riv('nave') },
      { ...moduleOf('m2', [lesson('c'), lesson('d')]), riveUrl: riv('asteroides') },
      {
        ...moduleOf('m3', [lesson('e'), lesson('f'), lesson('g')]),
        riveUrl: riv('conquista'),
      },
    ])
    const { container } = render(<CourseTrail course={desafio} />)
    const arts = [...container.querySelectorAll<HTMLElement>('[data-trail-art]')]
    expect(arts.map((art) => art.classList.contains('kids-trail-art--left'))).toEqual([
      true,
      true,
      false,
    ])
    expect(arts.map((art) => art.classList.contains('kids-trail-art--right'))).toEqual([
      false,
      false,
      true,
    ])
    expect(arts.map((art) => art.style.top)).toEqual(['55%', '21.67%', '66.25%'])
  })

  test('módulos vazios e módulos sem animação no Admin não recebem arte', () => {
    const desafio = course([
      { ...moduleOf('vazio', []), riveUrl: riv('nave') },
      { ...moduleOf('antigo', [lesson('a')]), title: 'A nave ganha vida' },
    ])
    desafio.slug = 'desafio-primeiro-jogo'
    const { container } = render(<CourseTrail course={desafio} />)
    expect(container.querySelector('[data-trail-art]')).toBeNull()
  })
})
