import { describe, expect, it } from 'bun:test'
import { HTML_ELEMENT_CATALOG } from '../../html/catalog'
import { resolveBlockLevel } from '../blockLevels'
import { HTML_BLOCKS } from '../blocks/html'

describe('blocos HTML — contrato pedagógico infantil', () => {
  it('todos os blocos explicam sua função', () => {
    for (const block of HTML_BLOCKS) {
      expect(block.tooltip).toBeString()
      expect(block.tooltip?.trim().length).toBeGreaterThan(0)
    }
  })

  it('não repete nomes de tags no texto visível dos blocos', () => {
    for (const block of HTML_BLOCKS) {
      const visibleText = [block.message0, block.message1, block.message2].filter(Boolean).join(' ')
      expect(visibleText).not.toMatch(/<\/?[a-z][^>]*>/i)
    }
  })

  it('novos elementos não nascem com ids repetidos', () => {
    const idFields = HTML_BLOCKS.flatMap((block) =>
      [block.args0, block.args1, block.args2]
        .flatMap((args) => (Array.isArray(args) ? args : []))
        .filter(
          (arg): arg is { type: string; name: string; text?: string } =>
            Boolean(arg) && typeof arg === 'object' && (arg as { name?: string }).name === 'ID',
        ),
    )
    expect(idFields.length).toBeGreaterThan(0)
    for (const field of idFields) expect(field.text).toBe('')
  })

  it('botões novos são ações comuns, não envios acidentais de formulário', () => {
    const button = HTML_BLOCKS.find((block) => block.type === 'sz_html_button')
    const typeField = button?.args0?.find(
      (arg) =>
        Boolean(arg) && typeof arg === 'object' && (arg as { name?: string }).name === 'TYPE',
    ) as { options?: Array<[string, string]> } | undefined
    expect(typeField?.options?.[0]?.[1]).toBe('button')
  })

  it('o catálogo central cobre exatamente os blocos desta categoria', () => {
    const catalogTypes = HTML_ELEMENT_CATALOG.filter(
      (entry) => entry.blockType.startsWith('sz_html_') && entry.blockType !== 'sz_html_svg',
    ).map((entry) => entry.blockType)
    catalogTypes.push('sz_html_text', 'sz_html_comment')
    expect(catalogTypes.sort()).toEqual(HTML_BLOCKS.map((block) => block.type).sort())
  })

  it('o degrau pedagógico de cada elemento vem do catálogo central', () => {
    for (const element of HTML_ELEMENT_CATALOG) {
      expect(resolveBlockLevel(element.blockType)).toBe(element.level)
    }
  })
})
