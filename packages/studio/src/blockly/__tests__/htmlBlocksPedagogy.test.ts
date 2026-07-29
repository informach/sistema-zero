import { describe, expect, it } from 'bun:test'
import { HTML_ELEMENT_CATALOG } from '../../html/catalog'
import { resolveBlockLevel } from '../blockLevels'
import { HTML_BLOCKS } from '../blocks/html'

function messagesOf(block: (typeof HTML_BLOCKS)[number]): string[] {
  return [
    block.message0,
    block.message1,
    block.message2,
    block.message3,
    block.message4,
    block.message5,
  ].filter((message): message is string => typeof message === 'string')
}

function argsOf(block: (typeof HTML_BLOCKS)[number]): unknown[] {
  return [block.args0, block.args1, block.args2, block.args3, block.args4, block.args5].flatMap(
    (args) => (Array.isArray(args) ? args : []),
  )
}

describe('blocos HTML — contrato pedagógico infantil', () => {
  it('todos os blocos explicam sua função', () => {
    for (const block of HTML_BLOCKS) {
      expect(block.tooltip).toBeString()
      expect(block.tooltip?.trim().length).toBeGreaterThan(0)
    }
  })

  it('não repete nomes de tags no texto visível dos blocos', () => {
    for (const block of HTML_BLOCKS) {
      const visibleText = messagesOf(block).join(' ')
      expect(visibleText).not.toMatch(/<\/?[a-z][^>]*>/i)
    }
  })

  it('novos elementos não nascem com ids repetidos', () => {
    const idFields = HTML_BLOCKS.flatMap((block) =>
      argsOf(block).filter(
        (arg): arg is { type: string; name: string; text?: string } =>
          Boolean(arg) && typeof arg === 'object' && (arg as { name?: string }).name === 'ID',
      ),
    )
    expect(idFields.length).toBeGreaterThan(0)
    for (const field of idFields) expect(field.text).toBe('')
  })

  it('botões novos são ações comuns, não envios acidentais de formulário', () => {
    const button = HTML_BLOCKS.find((block) => block.type === 'sz_html_button')
    const typeField = (button ? argsOf(button) : []).find(
      (arg) =>
        Boolean(arg) && typeof arg === 'object' && (arg as { name?: string }).name === 'TYPE',
    ) as { options?: Array<[string, string]> } | undefined
    expect(typeField?.options?.[0]?.[1]).toBe('button')
  })

  it('a imagem inicial pede uma descrição real e reserva a proporção do exemplo', () => {
    const image = HTML_BLOCKS.find((block) => block.type === 'sz_html_image')
    expect(image).toBeDefined()
    if (!image) return
    const fields = new Map(
      argsOf(image)
        .filter(
          (arg): arg is { name: string; text?: string } =>
            Boolean(arg) &&
            typeof arg === 'object' &&
            typeof (arg as { name?: unknown }).name === 'string',
        )
        .map((field) => [field.name, field]),
    )

    expect(fields.get('ALT')?.text).toBe('')
    expect(fields.get('WIDTH')?.text).toBe('600')
    expect(fields.get('HEIGHT')?.text).toBe('400')
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
