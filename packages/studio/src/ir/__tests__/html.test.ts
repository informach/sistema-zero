import { describe, expect, it } from 'bun:test'
import { HTMLNodeSchema } from '../schema'

describe('HTMLNodeSchema — modelo de conteúdo', () => {
  it('aceita conteúdo de texto dentro de um parágrafo', () => {
    const result = HTMLNodeSchema.safeParse({
      type: 'element',
      tag: 'p',
      children: [{ type: 'element', tag: 'strong', text: 'Importante' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita conteúdo estrutural dentro de um parágrafo', () => {
    const result = HTMLNodeSchema.safeParse({
      type: 'element',
      tag: 'p',
      children: [{ type: 'element', tag: 'div' }],
    })
    expect(result.success).toBe(false)
  })

  it('aceita itens e rejeita parágrafos como filhos diretos de uma lista', () => {
    expect(
      HTMLNodeSchema.safeParse({
        type: 'element',
        tag: 'ul',
        children: [{ type: 'element', tag: 'li', text: 'Item' }],
      }).success,
    ).toBe(true)
    expect(
      HTMLNodeSchema.safeParse({
        type: 'element',
        tag: 'ul',
        children: [{ type: 'element', tag: 'p', text: 'Item' }],
      }).success,
    ).toBe(false)
  })

  it('permite conteúdo de fluxo dentro de um item de lista', () => {
    const result = HTMLNodeSchema.safeParse({
      type: 'element',
      tag: 'li',
      children: [{ type: 'element', tag: 'p', text: 'Detalhes' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita formulário dentro de outro formulário', () => {
    const result = HTMLNodeSchema.safeParse({
      type: 'element',
      tag: 'form',
      children: [
        {
          type: 'element',
          tag: 'div',
          children: [{ type: 'element', tag: 'form' }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
