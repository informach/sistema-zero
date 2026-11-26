import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useLessonTabsHeight } from '@sistemazero/member-shell/lib/use-lesson-tabs-height'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { readStylesheet } from '../../ui/scripts/read-stylesheet.mjs'

// A barra de abas lê a rota (`usePathname`): fora do roteador do Next ela vem `null`. A mesma receita
// dos outros mocks de `next/navigation` do pacote (o módulo real espalhado, só a rota trocada).
const nav = await import('next/navigation')
mock.module('next/navigation', () => ({ ...nav, usePathname: () => '/cursos/x/aulas/y' }))
const { ParentShell } = await import('../src/app/pais/_components/parent-shell')
const { MobileTabbar } = await import('../src/components/kids/mobile-nav')

/**
 * O rodapé fixo da aula (`.sz-lesson-nav-immersive`) fica com o `bottom` na altura da barra de abas
 * do celular (`--sz-lesson-tabs-height`). Relato de 25/11/2026: no celular ele FLUTUAVA. A aula dos
 * cursos para pais não tem barra de abas e não dizia isso, então o tema usava a reserva de 3.5rem e
 * o rodapé ficava 56px acima do pé da tela, com a aula passando por baixo; e a barra do Kids mede
 * ~65px, não 56, então lá o rodapé entrava 9px por baixo dela.
 */

const PROP = '--sz-lesson-tabs-height'
const originalResizeObserver = globalThis.ResizeObserver
const originalFetch = globalThis.fetch
let observadores: { callback: ResizeObserverCallback; alvos: Element[]; desligado: boolean }[] = []

beforeEach(() => {
  observadores = []
  globalThis.ResizeObserver = class {
    private registro: (typeof observadores)[number]
    constructor(callback: ResizeObserverCallback) {
      this.registro = { callback, alvos: [], desligado: false }
      observadores.push(this.registro)
    }
    observe(alvo: Element) {
      this.registro.alvos.push(alvo)
    }
    unobserve() {}
    disconnect() {
      this.registro.desligado = true
    }
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
  globalThis.fetch = originalFetch
  document.documentElement.style.removeProperty(PROP)
})

function medir(elemento: Element, altura: () => number) {
  elemento.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 390,
      bottom: altura(),
      width: 390,
      height: altura(),
    }) as DOMRect
}

function avisarMudanca() {
  for (const o of observadores) if (!o.desligado) o.callback([], o as unknown as ResizeObserver)
}

describe('useLessonTabsHeight', () => {
  function Barra({ altura }: { altura: () => number }) {
    const ref = useRef<HTMLElement>(null)
    useLessonTabsHeight(ref)
    return (
      <nav
        ref={(no) => {
          if (no) medir(no, altura)
          ref.current = no
        }}
      />
    )
  }

  test('publica a altura medida da barra no <html>, acompanha a mudança e limpa ao sair', () => {
    let altura = 64.32
    const { unmount } = render(<Barra altura={() => altura} />)
    expect(document.documentElement.style.getPropertyValue(PROP)).toBe('65px')

    altura = 90
    avisarMudanca()
    expect(document.documentElement.style.getPropertyValue(PROP)).toBe('90px')

    unmount()
    expect(document.documentElement.style.getPropertyValue(PROP)).toBe('')
    expect(observadores.every((o) => o.desligado)).toBe(true)
  })
})

describe('a barra de abas do Kids', () => {
  test('publica a própria altura (o rodapé da aula fica logo acima dela)', () => {
    const original = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const altura = this.getAttribute('aria-label') === 'Navegação principal' ? 65.3 : 0
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: altura,
        width: 0,
        height: altura,
      } as DOMRect
    }
    try {
      render(<MobileTabbar />)
      expect(document.documentElement.style.getPropertyValue(PROP)).toBe('66px')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original
    }
  })
})

describe('a aula dos cursos para pais', () => {
  test('sem barra de abas, declara 0px e o rodapé vai ao pé da tela', () => {
    globalThis.fetch = Object.assign(
      mock(async () => Response.json({}, { status: 503 })),
      { preconnect: () => {} },
    ) as typeof fetch
    const { container } = render(
      <ParentShell active="cursos" variant="lesson">
        <p>aula</p>
      </ParentShell>,
    )
    const main = container.querySelector('main.kids-aula') as HTMLElement | null
    expect(main === null).toBe(false)
    expect(main?.style.getPropertyValue(PROP)).toBe('0px')
    expect(container.querySelector('nav[aria-label="Seções da área dos pais"]') === null).toBe(true)
  })

  test('nas outras páginas dos pais a barra de baixo continua e nada é declarado', () => {
    globalThis.fetch = Object.assign(
      mock(async () => Response.json({}, { status: 503 })),
      { preconnect: () => {} },
    ) as typeof fetch
    const { container } = render(
      <ParentShell active="inicio">
        <p>início</p>
      </ParentShell>,
    )
    const main = container.querySelector('main') as HTMLElement | null
    expect(main?.style.getPropertyValue(PROP)).toBe('')
    expect(container.querySelector('nav[aria-label="Seções da área dos pais"]') === null).toBe(
      false,
    )
  })
})

describe('o tema da aula lê a barra pela medida, nunca por um número cravado', () => {
  const tema = readStylesheet(
    resolve(import.meta.dir, '../../ui/src/styles/creator-theme.css'),
  ).replace(/\s+/g, ' ')
  const reserva = 'var(--sz-lesson-tabs-height, calc(3.5rem + env(safe-area-inset-bottom)))'

  test('o rodapé e a barra da chamada somam a mesma medida das abas', () => {
    expect(tema).toContain(`.sz-lesson-sections .sz-lesson-nav-immersive { position: fixed;`)
    expect(tema).toContain(`bottom: calc(${reserva});`)
    expect(tema).toContain(
      `.kids-aula .sz-live-controls { bottom: calc( var(--sz-lesson-nav-height, 0px) + ${reserva} + 0.5rem ); }`,
    )
    // O `3.5rem` só aparece como RESERVA dentro do `var(...)`, nunca somado solto.
    expect(/\+ 3\.5rem \+/.test(tema)).toBe(false)
  })

  test('a comunidade adulta usa a saída gerada do mesmo tema', () => {
    const adulto = readFileSync(
      resolve(import.meta.dir, '../../community/src/app/globals.generated.css'),
      'utf8',
    ).replace(/\s+/g, ' ')
    expect(adulto).toContain(
      `.kids-aula .sz-live-controls { bottom: calc( var(--sz-lesson-nav-height, 0px) + ${reserva} + 0.5rem ); }`,
    )
  })
})
