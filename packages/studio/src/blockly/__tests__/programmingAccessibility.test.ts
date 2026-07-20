import { describe, expect, it } from 'bun:test'
import { PROGRAMMING_VISIBLE_DEFINITIONS } from '../programmingContract'
import { buildCoreToolbox, type ToolboxCategory, type ToolboxCustomCategory } from '../toolbox'

const BLOCK_FOREGROUND = '#ffffff'

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  if (channels?.length !== 3) throw new Error(`Cor hexadecimal inválida: ${hex}`)
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

describe('acessibilidade da categoria Programação', () => {
  it('mantém contraste AA entre o texto branco e todos os blocos visíveis', () => {
    expect(PROGRAMMING_VISIBLE_DEFINITIONS).toHaveLength(149)
    for (const definition of PROGRAMMING_VISIBLE_DEFINITIONS) {
      if (typeof definition.colour !== 'string') {
        throw new Error(`${definition.type} não possui cor hexadecimal`)
      }
      expect(
        contrast(BLOCK_FOREGROUND, definition.colour),
        `${definition.type} (${definition.colour})`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('marca o guarda-chuva e todas as subcategorias com o rótulo de alto contraste', () => {
    const programming = buildCoreToolbox([]).contents.find(
      (entry): entry is ToolboxCategory =>
        entry.kind === 'category' && entry.name === 'Programação',
    )
    expect(programming?.cssconfig?.label).toBe('sz-toolbox-programming-label')
    for (const category of programming?.contents ?? []) {
      if (category.kind !== 'category') continue
      expect(
        (category as ToolboxCategory | ToolboxCustomCategory).cssconfig?.label,
        category.name,
      ).toBe('sz-toolbox-programming-label')
    }
  })

  it('preserva um indicador de foco visível para navegação por teclado', async () => {
    const css = await Bun.file(new URL('../../styles/studio.css', import.meta.url)).text()
    const search = await Bun.file(new URL('../searchCategory.ts', import.meta.url)).text()
    expect(css).toContain('.blocklyToolboxCategoryContainer:focus-visible')
    expect(css).toContain('.blocklyToolboxCategoryContainer.blocklyActiveFocus')
    expect(css).toContain('.sz-blockly-search-field:focus-visible')
    expect(css).toContain('outline: 3px solid var(--color-sz-focus)')
    expect(css).not.toMatch(/blocklyToolboxCategoryContainer:focus[^-][^{]*\{[^}]*outline:\s*none/s)
    expect(search).toContain("field.classList.add('sz-blockly-search-field')")
    expect(search).not.toContain("outline: 'none'")
  })

  it('configura a busca como um controle nomeado e adequado para pesquisa', async () => {
    const search = await Bun.file(new URL('../searchCategory.ts', import.meta.url)).text()
    expect(search).toContain("field.type = 'search'")
    expect(search).toContain("field.name = 'block-search'")
    expect(search).toContain("field.autocomplete = 'off'")
    expect(search).toContain('field.spellcheck = false')
    expect(search).toContain("field.setAttribute('aria-label', 'Pesquisar blocos')")
    expect(search).toContain("field.placeholder = 'Pesquisar blocos…'")
    expect(search).not.toContain("field.placeholder = 'Pesquisar blocos...'")
  })

  it('remove deslocamento e transição da toolbox quando o movimento é reduzido', async () => {
    const css = await Bun.file(new URL('../../styles/studio.css', import.meta.url)).text()
    const reducedMotion = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotion).toMatch(/\.blocklyToolboxCategory\s*\{[^}]*transition:\s*none/s)
    expect(reducedMotion).toMatch(
      /\.blocklyToolboxCategory:not\(\.blocklyToolboxSelected\):hover\s*\{[^}]*transform:\s*none/s,
    )
  })
})
