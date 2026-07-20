import { describe, expect, it } from 'bun:test'
import type { HTMLNode } from '#ir'
import { collectHTMLAccessibilityIssues } from './accessibility'

function messages(nodes: HTMLNode[]): string[] {
  return collectHTMLAccessibilityIssues(nodes).map((issue) => issue.message)
}

describe('acessibilidade do HTML guiado', () => {
  it('avisa sobre botão, link e rótulo sem texto significativo', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'button', text: '   ', __id: 'button-empty' },
      { type: 'element', tag: 'a', attrs: { href: '#' }, __id: 'link-empty' },
      { type: 'element', tag: 'label', attrs: { for: 'name' }, __id: 'label-empty' },
      { type: 'element', tag: 'input', id: 'name', attrs: { type: 'text' }, __id: 'input' },
    ])

    expect(issues.map((issue) => issue.blockId)).toEqual(
      expect.arrayContaining(['button-empty', 'link-empty', 'label-empty', 'input']),
    )
  })

  it('não aceita aria-labelledby inexistente ou apontando para texto vazio', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'span', id: 'empty-name', text: ' ' },
      {
        type: 'element',
        tag: 'input',
        attrs: { type: 'text', 'aria-labelledby': 'missing empty-name' },
        __id: 'field',
      },
    ])

    expect(issues.map((issue) => issue.blockId)).toContain('field')
  })

  it('aceita texto visível, aria-label e aria-labelledby com texto real', () => {
    expect(
      messages([
        { type: 'element', tag: 'button', text: 'Jogar' },
        {
          type: 'element',
          tag: 'a',
          attrs: { href: '#' },
          children: [{ type: 'text', text: 'Ajuda' }],
        },
        { type: 'element', tag: 'span', id: 'search-name', text: 'Buscar' },
        {
          type: 'element',
          tag: 'input',
          attrs: { type: 'search', 'aria-labelledby': 'search-name' },
        },
        { type: 'element', tag: 'textarea', attrs: { 'aria-label': 'Mensagem' } },
      ]),
    ).toEqual([])
  })

  it('avisa quando Canvas não oferece fallback textual', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'canvas', id: 'game', __id: 'canvas-empty' },
    ])
    expect(issues.map((issue) => issue.blockId)).toContain('canvas-empty')
  })

  it('aceita Canvas com fallback textual significativo', () => {
    expect(
      messages([
        {
          type: 'canvas',
          id: 'game',
          children: [{ type: 'text', text: 'Jogo de desviar dos obstáculos' }],
        },
      ]),
    ).toEqual([])
  })
})
