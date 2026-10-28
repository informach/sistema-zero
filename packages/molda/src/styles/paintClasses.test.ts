import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * As receitas que a aba Pintar usa precisam existir no stylesheet: o review de 27/10/2026 achou a
 * grade da "Cor da peça" sem estilo depois que a barra de cores trocou de receita.
 */
test('as classes da aba Pintar têm receita no molda.css', () => {
  const css = readFileSync(resolve(import.meta.dir, 'molda.css'), 'utf8')
  for (const name of [
    'mld-paint-swatches',
    'mld-paint-swatch',
    'mld-color-bar',
    'mld-color-swatch',
    'mld-color-more-panel',
    'mld-tile-dot',
    'mld-width-dot',
    'mld-toast-dock',
  ]) {
    expect(css, name).toMatch(new RegExp(`.${name}(?![w-])`))
  }
  expect(css).not.toContain('.mld-tile-key')
})
