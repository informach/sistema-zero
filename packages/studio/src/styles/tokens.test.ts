/**
 * Ponte de tokens (07/09/2026): o Estúdio LÊ os semânticos `--sz-tool-*` de
 * `@sistemazero/ui/tool-chrome.css` nos DOIS blocos de tema explícitos (`[data-sz-theme="dark"]`
 * e `="light"`), com o fallback de sempre por baixo; o `@theme` (escuro-default em `:root`) fica
 * INTOCADO de propósito. Lido como texto: uma folha se prova pela forma.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const css = await Bun.file(join(import.meta.dir, 'studio.css')).text()

function bloco(ancora: string): string {
  const i = css.indexOf(ancora)
  if (i < 0) throw new Error(`âncora não encontrada: ${ancora}`)
  const abre = css.indexOf('{', i)
  return css.slice(abre + 1, css.indexOf('}', abre))
}

const CHAVES = [
  '--color-sz-bg',
  '--color-sz-panel',
  '--color-sz-panel-soft',
  '--color-sz-border',
  '--color-sz-fg',
  '--color-sz-fg-soft',
  '--color-sz-accent',
]
const DERIVADOS = [
  '--color-sz-bg-soft',
  '--color-sz-border-soft',
  '--color-sz-fg-mute',
  '--color-sz-surface',
]

describe('studio.css lê os tokens compartilhados', () => {
  const escuro = bloco('[data-sz-theme="dark"] {')
  const claro = bloco('[data-sz-theme="light"] {')

  for (const chave of CHAVES) {
    it(`${chave} aponta para um --sz-tool-* no escuro e no claro`, () => {
      const re = new RegExp(`${chave}:\\s*var\\(\\s*--sz-tool-`)
      expect(escuro).toMatch(re)
      expect(claro).toMatch(re)
    })
  }

  it('os derivados são re-declarados nos DOIS blocos (senão ficam presos no tema do :root)', () => {
    for (const chave of DERIVADOS) {
      expect(escuro).toContain(`${chave}:`)
      expect(claro).toContain(`${chave}:`)
    }
  })

  it('a home não tem mais receita própria: usa as compartilhadas das ferramentas', () => {
    // A pílula 3D, o painel de sombra dura e o pulo no hover (`sz-home-*`) saíram em
    // 11/09/2026: a lista "Meus Jogos" é feita das receitas de `tool-chrome.css`. O comentário
    // que conta a história fica; nenhuma REGRA pode voltar.
    const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(semComentarios).not.toMatch(/\.sz-home-|--sz-home-/)
  })

  it('o @theme (escuro-default em :root) NÃO aponta para --sz-tool-*', () => {
    expect(bloco('@theme {')).not.toContain('--sz-tool-')
  })

  it('color-mix sempre em oklab (em oklch o matiz gira e dá rosa)', () => {
    expect(css).not.toMatch(/color-mix\(in oklch/)
  })
})
