import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (relativePath: string) =>
  readFileSync(resolve(import.meta.dir, '..', relativePath), 'utf8')

describe('rodapé da aula entre os menus abertos', () => {
  test('Kids usa a mesma largura do menu e recua somente no desktop', () => {
    const css = source('src/app/globals.css')
    const sidebar = source('src/components/kids/app-sidebar.tsx')
    const fallback = source('src/components/kids/focus-mode.tsx')
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
    expect(kidsPlayer).toContain('lg:w-(--lesson-outline-width)')
    expect(kidsPlayer).toContain('lg:max-h-none lg:min-h-0 lg:flex-1')
    expect(kidsPlayer).toContain('lg:rounded-none lg:border-0')
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
    const adultCss = source('../community/src/app/globals.css')
    const adultPlayer = source(
      '../community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
    )

    expect(adultPlayer).toContain('id="adult-lesson-outline"')
    expect(adultPlayer).toContain('inert={!outlineOpen}')
    expect(adultPlayer).toContain('translate-x-full')
    expect(adultPlayer).toContain('transition-transform duration-300')
    expect(adultPlayer).toContain('lg:w-(--lesson-outline-width)')
    expect(adultPlayer).toContain('lg:max-h-none lg:min-h-0 lg:flex-1')
    expect(adultPlayer).toContain('lg:rounded-none lg:border-0 lg:shadow-none')
    expect(adultPlayer).toContain('transition-opacity duration-300 motion-reduce:transition-none')
    expect(adultPlayer).not.toContain("!outlineOpen && 'hidden'")
    expect(adultCss).toContain('.sz-app:has(.sz-aula-adulto) > main')
    expect(adultCss).toContain('max-width: none')
    expect(adultCss).toContain('padding-right: calc(1.5rem + var(--lesson-outline-width))')
    expect(adultCss).toContain(
      '.sz-aula-adulto:has(#adult-lesson-outline:not([aria-hidden="true"])) .sz-lesson-nav-immersive',
    )
    expect(adultCss).toContain('right: var(--lesson-outline-width)')
  })
})
