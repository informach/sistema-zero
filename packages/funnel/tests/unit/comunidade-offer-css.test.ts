/**
 * O CSS da oferta da Comunidade só fala por TOKENS (30/09/2026): nenhuma cor própria nas receitas
 * (`src/styles/kids-oferta.css`) nem no layout do body. A paleta muda na fonte canônica
 * (`packages/ui/src/tokens`) e chega aqui sozinha. O que este teste trava é o que já apodreceu
 * noutros consumidores: hexadecimal solto, `color-mix` fora do `oklab` (em `oklch` um cinza vira
 * rosa), `!important`, e receitas fora do namespace.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')
const receitas = readFileSync(join(SRC, 'styles', 'kids-oferta.css'), 'utf8')
const body = readFileSync(
  join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro'),
  'utf8',
)
const layoutCss = body.slice(
  body.indexOf('<style is:global>') + '<style is:global>'.length,
  body.indexOf('</style>'),
)
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('Comunidade: o CSS da oferta só fala por tokens', () => {
  test('nenhuma cor própria: sem hexadecimal, rgb(), hsl() ou oklch()', () => {
    for (const css of [semComentarios(receitas), semComentarios(layoutCss)]) {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(css).not.toMatch(/\b(rgba?|hsla?|oklch|oklab)\(/)
    }
  })

  test('color-mix sempre em oklab, e nunca !important', () => {
    for (const css of [semComentarios(receitas), semComentarios(layoutCss)]) {
      for (const [mix] of css.matchAll(/color-mix\([^)]*\)/g)) expect(mix).toContain('in oklab')
      expect(css).not.toContain('!important')
    }
  })

  test('as receitas só declaram aliases --kof-* a partir de --sz-community-*', () => {
    const inicio = receitas.indexOf('.theme-kids {')
    expect(inicio).toBeGreaterThan(-1)
    const bloco = receitas.slice(inicio, receitas.indexOf('\n}', inicio) + 2)
    const aliases = [...bloco.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)]
    expect(aliases.length).toBeGreaterThan(30)
    for (const [, nome, valor] of aliases) {
      expect(nome).toMatch(/^--kof-/)
      // Cor vem SEMPRE de um token; só fonte, raio, sombra, altura e o mix em oklab ficam de fora.
      if (!/^(--kof-(display|corpo|raio-[\w-]+|sombra-heroi|mobar-altura))$/.test(nome ?? ''))
        expect(valor).toMatch(/var\(--sz-community-[\w-]+\)|color-mix\(in oklab/)
    }
    // As variáveis do 3D (`--k3d-*`) moram DENTRO de cada peça clicável, nunca no wrapper.
    expect(bloco).not.toContain('--k3d-')
  })

  test('namespaces: receitas em .theme-kids/.kof-*, layout em .cdc', () => {
    const seletores = (css: string) =>
      [...semComentarios(css).matchAll(/^\s*([^@{}\s][^{}]*)\{/gm)].map((m) => (m[1] ?? '').trim())
    for (const sel of seletores(receitas)) {
      expect(sel).toMatch(/^(html\.kof-js )?\.theme-kids\b/)
    }
    for (const sel of seletores(layoutCss)) {
      for (const parte of sel.split(',')) expect(parte.trim()).toMatch(/^\.cdc\b/)
    }
    // O layout só fala pelos aliases `--kof-*`: nenhum token da plataforma cru.
    expect(semComentarios(layoutCss)).not.toContain('var(--sz-')
    // Os blocos de `@media` só agrupam regras já prefixadas: nenhum seletor nu dentro deles.
    expect(layoutCss).not.toMatch(/@media[^{]*\{\s*[a-z]/)
  })

  test('o body importa as receitas e o layout carrega a Baloo 800 (os títulos são 800)', () => {
    expect(body).toContain("import '../../../styles/kids-oferta.css'")
    expect(readFileSync(join(SRC, 'layouts', 'BaseLayout.astro'), 'utf8')).toContain(
      "import '@fontsource/baloo-2/latin-800.css'",
    )
    expect(receitas).toMatch(/\.theme-kids \.kof-display \{[^}]*font-weight: 800/)
  })

  test('o reveal e a barra fixa degradam sem JS e com menos movimento', () => {
    expect(receitas).toContain('html.kof-js .theme-kids .kof-reveal {')
    expect(receitas).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*html\.kof-js \.theme-kids \.kof-reveal \{[^}]*opacity: 1/,
    )
    expect(body).toContain("document.documentElement.classList.add('kof-js')")
    expect(body).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')")
    // `overflow-x: clip`, nunca `hidden`: o topo é sticky e `hidden` criaria um scroll container.
    expect(layoutCss).toContain('overflow-x: clip')
    expect(layoutCss).not.toContain('overflow-x: hidden')
  })
})
