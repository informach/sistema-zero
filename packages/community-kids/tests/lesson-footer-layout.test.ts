import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readStylesheet } from '../../ui/scripts/read-stylesheet.mjs'

const source = (relativePath: string) =>
  relativePath.endsWith('.css')
    ? readStylesheet(resolve(import.meta.dir, '..', relativePath))
    : readFileSync(resolve(import.meta.dir, '..', relativePath), 'utf8')

describe('rodapé da aula entre os menus abertos', () => {
  test('Kids usa a mesma largura do menu e recua somente no desktop', () => {
    const css = source('src/app/globals.css')
    const sidebar = source('src/components/kids/app-sidebar.tsx')
    const fallback = source('../member-shell/src/components/creator/focus-mode.tsx')
    const layout = source('src/app/(app)/layout.tsx')

    expect(layout).toContain('kids-shell-row')
    expect(sidebar).toContain('w-(--kids-menu-width)')
    expect(fallback).toContain('w-(--kids-menu-width)')
    expect(css).toContain('--kids-menu-width: 16.75rem')
    expect(css).toContain(
      '.kids-shell-row:has(aside.kids-menu:not([aria-hidden="true"])) .sz-lesson-nav-immersive',
    )
    expect(css).toContain('left: var(--kids-menu-width)')
  })

  test('a lista Kids ocupa a borda direita e acompanha o rodapé sem cobrir a aula', () => {
    const kidsCss = source('src/app/globals.css')
    const kidsPlayer = source(
      'src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
    )

    expect(kidsPlayer).toContain('id="kids-lesson-outline"')
    expect(kidsPlayer).toContain('inert={outlineCollapsed}')
    expect(kidsPlayer).toContain('translate-x-full')
    expect(kidsPlayer).toContain('transition-transform duration-300')
    expect(kidsPlayer).toContain('w-(--lesson-outline-width)')
    expect(kidsCss).toContain('--lesson-outline-width: min(20rem, 90vw)')
    const outline = source('../member-shell/src/components/lesson-ui/outline.tsx')
    expect(kidsPlayer).toContain('<LessonOutlineContent')
    expect(outline).toContain('lg:max-h-none lg:min-h-0 lg:flex-1')
    expect(outline).toContain('lg:rounded-none lg:border-0')
    expect(kidsPlayer).toContain('transition-opacity duration-300 motion-reduce:transition-none')
    expect(kidsPlayer).not.toContain("outlineCollapsed && 'hidden'")
    expect(kidsCss).toContain('transition: padding-right 0.3s ease-in-out')
    expect(kidsCss).toContain('padding-right: calc(2rem + var(--lesson-outline-width))')
    expect(kidsCss).toContain(
      '.kids-aula:has(#kids-lesson-outline:not([aria-hidden="true"])) .sz-lesson-nav-immersive',
    )
    expect(kidsCss).toContain('right: var(--lesson-outline-width)')
  })

  test('a lista Adulto acompanha o rodapé e conserva a leitura da aula', () => {
    const adultCss = source('../community/src/app/globals.generated.css')
    const adultPlayer = source(
      '../community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
    )
    const adultOutline = source('../community/src/components/community/lesson-outline-content.tsx')

    expect(adultPlayer).toContain('id="kids-lesson-outline"')
    expect(adultPlayer).toContain('inert={!outlineOpen}')
    expect(adultPlayer).toContain('translate-x-full')
    expect(adultPlayer).toContain('transition-transform duration-300')
    expect(adultPlayer).toContain('w-(--lesson-outline-width)')
    expect(adultPlayer).toContain('<EdgePanelHandle')
    expect(adultPlayer).toContain('openOffset="var(--lesson-outline-width)"')
    expect(adultCss).toContain('--lesson-outline-width: min(20rem, 90vw)')
    expect(adultPlayer).toContain('<LessonOutlineContent')
    expect(adultOutline).toContain('SharedOutline')
    const sharedOutline = source('../member-shell/src/components/lesson-ui/outline.tsx')
    expect(sharedOutline).toContain('overflow-y-auto')
    expect(sharedOutline).toContain('lg:max-h-none lg:min-h-0 lg:flex-1')
    expect(sharedOutline).toContain('lg:rounded-none lg:border-0')
    expect(adultPlayer).toContain('transition-opacity duration-300 motion-reduce:transition-none')
    expect(adultPlayer).not.toContain("!outlineOpen && 'hidden'")
    expect(adultCss).toContain(':where(body:has(.sz-lesson-ui)) .kids-aula')
    expect(adultCss).toContain('max-width: none')
    expect(adultCss).toContain('padding-right: calc(2rem + var(--lesson-outline-width))')
    expect(adultCss).toContain(
      '.kids-aula:has(#kids-lesson-outline:not([aria-hidden="true"])) .sz-lesson-nav-immersive',
    )
    expect(adultCss).toContain('right: var(--lesson-outline-width)')
  })
})

describe('o rodapé fixo diz à página quanto ele mede (30/09/2026)', () => {
  // ⚠️ Com a faixa "o que falta para seguir" o rodapé passou de ~69px para ~125px (duas linhas ou o
  // "+N" aberto, mais): uma reserva fixa deixava o fim do último cartão para sempre sob ele.
  test('o member-shell publica `--sz-lesson-nav-height` e os dois apps reservam a partir dela', () => {
    const shell = source('../member-shell/src/components/lesson-sections.tsx')
    const kidsCss = source('src/app/globals.css')
    const adultCss = source('../community/src/app/globals.generated.css')
    expect(shell).toMatch(/raiz\.style\.setProperty\(\s*'--sz-lesson-nav-height'/)
    expect(shell).toContain('new ResizeObserver(publicar)')
    expect(shell).toContain("raiz.style.removeProperty('--sz-lesson-nav-height')")
    expect(kidsCss).toContain('.kids-aula:has(.sz-lesson-nav-immersive) {')
    // O biome quebra o `calc` em linhas: comparar sem os espaços.
    expect(kidsCss.replace(/\s+/g, ' ')).toContain(
      'var(--sz-lesson-nav-height, 7rem) + var(--sz-lesson-tabs-height, calc(3.5rem + env(safe-area-inset-bottom))) + 1.5rem',
    )
    expect(kidsCss).toContain('padding-bottom: calc(var(--sz-lesson-nav-height, 7rem) + 1.5rem);')
    expect(adultCss).toContain('padding-bottom: calc(var(--sz-lesson-nav-height, 7rem) + 1.5rem);')
    // A regra do kids fica FORA de camada (é o que a deixa vencer o `pb-40 md:pb-32` do `<main>`):
    // toda `@layer x {` aberta antes dela já fechou.
    const antes = kidsCss.slice(0, kidsCss.indexOf('.kids-aula:has(.sz-lesson-nav-immersive) {'))
    let profundidade = 0
    let dentroDeLayer = 0
    for (const linha of antes.split('\n')) {
      if (/^@layer [a-z]+ \{/.test(linha)) dentroDeLayer = profundidade + 1
      for (const ch of linha) {
        if (ch === '{') profundidade++
        if (ch === '}') {
          profundidade--
          if (dentroDeLayer && profundidade < dentroDeLayer) dentroDeLayer = 0
        }
      }
    }
    expect(dentroDeLayer).toBe(0)
  })
})
