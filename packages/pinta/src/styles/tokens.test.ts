/**
 * Ponte de tokens (07/09/2026): os tokens-chave do Pinta LEEM os semânticos `--sz-tool-*` de
 * `@sistemazero/ui/tool-chrome.css` (um valor só para Pinta, Estúdio e Pensa) no claro E no
 * escuro, com o fallback de sempre por baixo. Lido como texto: uma folha se prova pela forma.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const css = await Bun.file(join(import.meta.dir, 'pinta.css')).text()

const CHAVES = [
  '--color-pin-bg',
  '--color-pin-surface',
  '--color-pin-border',
  '--color-pin-text',
  '--color-pin-muted',
  '--color-pin-text-soft',
  '--color-pin-accent',
  '--color-pin-accent-fg',
  '--pin-gradient',
  '--pin-cta',
]

describe('pinta.css lê os tokens compartilhados', () => {
  for (const chave of CHAVES) {
    it(`${chave} aponta para um --sz-tool-* no claro e no escuro`, () => {
      // `\s*` depois de `var(`: o biome quebra os valores longos em várias linhas.
      const usos = [...css.matchAll(new RegExp(`${chave}:\\s*var\\(\\s*(--sz-tool-[\\w-]+)`, 'g'))]
      expect(usos.length).toBe(2)
    })
  }

  it('color-mix sempre em oklab (em oklch o matiz gira e dá rosa)', () => {
    expect(css).not.toMatch(/color-mix\(in oklch/)
  })
})
