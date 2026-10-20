/**
 * O CSS da oferta da Comunidade só fala por TOKENS (30/09/2026): nenhuma cor própria nas receitas
 * (`src/styles/kids-oferta.css`) nem no layout (`src/styles/comunidade-oferta.css`). A paleta muda na fonte canônica
 * (`packages/ui/src/tokens`) e chega aqui sozinha. O que este teste trava é o que já apodreceu
 * noutros consumidores: hexadecimal solto, `color-mix` fora do `oklab` (em `oklch` um cinza vira
 * rosa), `!important`, e receitas fora do namespace.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')
const receitas = readFileSync(join(SRC, 'styles', 'kids-oferta.css'), 'utf8')
// A oferta do Desafio é a página que hoje veste o layout `.cdc` (as páginas da Comunidade têm o seu).
const body = readFileSync(
  join(SRC, 'components', 'funnel', 'oferta', 'DesafioOfertaBody.astro'),
  'utf8',
)
// O layout saiu do <style> do body para um arquivo próprio (01/10/2026): continua prefixado por `.cdc`.
const layoutCss = readFileSync(join(SRC, 'styles', 'comunidade-oferta.css'), 'utf8')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
/**
 * As páginas e o resultado de 20/10/2026, cada um com o seu prefixo: a mesma regra de tokens.
 * `resultado-conversa.css` e `quiz-spin.css` também desenham o tema adulto, pelos tokens `--cda-*`
 * do theme-arcade.
 */
const novos = {
  'comunidade-917.css': '.c917',
  'comunidade-menor9.css': '.cm9',
  'resultado-conversa.css': '.rc',
  'quiz-spin.css': '.qz',
  // A página adulta (arcade): as cores moram só nos tokens `--cda-*` do theme-arcade.css.
  'comunidade-adulto.css': '.cda',
  // As continuidades (20/10/2026) vestem o layout das páginas irmãs, com o mesmo prefixo.
  'comunidade-continuar.css': '.c917',
  'comunidade-adulto-continuar.css': '.cda',
} as const
const novosCss = Object.fromEntries(
  Object.keys(novos).map((nome) => [nome, readFileSync(join(SRC, 'styles', nome), 'utf8')]),
) as Record<keyof typeof novos, string>

describe('Comunidade: o CSS da oferta só fala por tokens', () => {
  test('nenhuma cor própria: sem hexadecimal, rgb(), hsl() ou oklch()', () => {
    for (const css of [receitas, layoutCss, ...Object.values(novosCss)].map(semComentarios)) {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(css).not.toMatch(/\b(rgba?|hsla?|oklch|oklab)\(/)
    }
  })

  test('color-mix sempre em oklab, e nunca !important', () => {
    for (const css of [receitas, layoutCss, ...Object.values(novosCss)].map(semComentarios)) {
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
      expect(sel).toMatch(/^\.theme-kids\b/)
    }
    for (const sel of seletores(layoutCss)) {
      for (const parte of sel.split(',')) expect(parte.trim()).toMatch(/^\.cdc\b/)
    }
    // O layout só fala pelos aliases `--kof-*`: nenhum token da plataforma cru.
    expect(semComentarios(layoutCss)).not.toContain('var(--sz-')
    // Os blocos de `@media` só agrupam regras já prefixadas: nenhum seletor nu dentro deles.
    expect(layoutCss).not.toMatch(/@media[^{]*\{\s*[a-z]/)
    for (const [nome, prefixo] of Object.entries(novos)) {
      const css = novosCss[nome as keyof typeof novos]
      // Os passos de um @keyframes (`0%`, `to`) não são seletores; o nome dele leva o prefixo.
      for (const sel of seletores(css))
        for (const parte of sel.split(','))
          if (!/^(from|to|[\d.]+%)$/.test(parte.trim()))
            expect([nome, parte.trim().startsWith(prefixo)]).toEqual([nome, true])
      for (const [, animacao] of css.matchAll(/@keyframes\s+([\w-]+)/g))
        expect([nome, animacao?.startsWith(prefixo.slice(1))]).toEqual([nome, true])
      expect([nome, semComentarios(css).includes('var(--sz-')]).toEqual([nome, false])
      expect([nome, /@media[^{]*\{\s*[a-z]/.test(css)]).toEqual([nome, false])
      expect([nome, css.includes('overflow-x: hidden')]).toEqual([nome, false])
    }
  })

  test('o body importa as receitas e o layout carrega a Baloo 800 (os títulos são 800)', () => {
    expect(body).toContain("import '../../../styles/kids-oferta.css'")
    expect(body).toContain("import '../../../styles/comunidade-oferta.css'")
    expect(body).not.toContain('<style')
    // A comparação de acessos é desenhada no layout (par de cartas, por token), sem CSS próprio.
    const comparacao = readFileSync(
      join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeComparacao.astro'),
      'utf8',
    )
    expect(comparacao).not.toContain('<style')
    expect(comparacao).toContain('role="table"')
    expect(layoutCss).toContain('.cdc .comparacao-par')
    expect(readFileSync(join(SRC, 'layouts', 'BaseLayout.astro'), 'utf8')).toContain(
      "import '@fontsource/baloo-2/latin-800.css'",
    )
    expect(receitas).toMatch(/\.theme-kids \.kof-display \{[^}]*font-weight: 800/)
  })

  test('menos movimento para o botão e o topo sticky sem scroll container', () => {
    // O reveal ao rolar saiu com a continuidade antiga (a única página que ligava `kof-js`).
    expect(receitas).not.toContain('kof-reveal')
    expect(receitas).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.theme-kids \.kof-btn,[^}]*transition: none/,
    )
    // `overflow-x: clip`, nunca `hidden`: o topo é sticky e `hidden` criaria um scroll container.
    expect(layoutCss).toContain('overflow-x: clip')
    expect(layoutCss).not.toContain('overflow-x: hidden')
  })
})
