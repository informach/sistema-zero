import { describe, expect, test } from 'bun:test'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderInline, renderMarkdown } from '../src/lib/markdown'

/** Narrowing de elemento React com props tipadas p/ os asserts. */
function el(node: ReactNode): ReactElement<{
  children?: ReactNode
  href?: string
  rel?: string
  src?: string
  alt?: string
}> {
  if (!isValidElement(node)) throw new Error(`esperava um elemento React, veio: ${String(node)}`)
  return node as ReactElement<{
    children?: ReactNode
    href?: string
    rel?: string
    src?: string
    alt?: string
  }>
}

/** Texto plano de uma árvore (suficiente p/ os asserts estruturais). */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf(el(node).props.children)
  return ''
}

describe('renderMarkdown (blocos)', () => {
  test('headings 1-3 viram h1/h2/h3', () => {
    const out = renderMarkdown('# Um\n## Dois\n### Três')
    expect(out.map((n) => el(n).type)).toEqual(['h1', 'h2', 'h3'])
    expect(textOf(out[0] ?? null)).toBe('Um')
  })

  test('listas com marcador e numeradas', () => {
    const out = renderMarkdown('- a\n- b\n\n1. um\n2. dois')
    expect(el(out[0]).type).toBe('ul')
    expect(el(out[1]).type).toBe('ol')
    expect(textOf(out[0] ?? null)).toBe('ab')
    expect(textOf(out[1] ?? null)).toBe('umdois')
  })

  test('citação e parágrafo', () => {
    const out = renderMarkdown('> citado\n\ntexto solto')
    expect(el(out[0]).type).toBe('blockquote')
    expect(el(out[1]).type).toBe('p')
  })

  test('código fenced preserva o conteúdo LITERAL (sem inline/HTML)', () => {
    const out = renderMarkdown('```\n<script>alert(1)</script>\n**não-negrito**\n```')
    const pre = el(out[0])
    expect(pre.type).toBe('pre')
    expect(textOf(pre)).toBe('<script>alert(1)</script>\n**não-negrito**')
  })

  test('fence sem fechamento não engole o documento (flush no fim)', () => {
    const out = renderMarkdown('```\ncódigo aberto')
    expect(el(out[0]).type).toBe('pre')
    expect(textOf(out[0] ?? null)).toBe('código aberto')
  })

  test('HTML cru vira TEXTO (React escapa — nunca dangerouslySetInnerHTML)', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)>')
    const p = el(out[0])
    expect(p.type).toBe('p')
    // O conteúdo é uma string filha — não um elemento img.
    expect(textOf(p)).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('renderInline (tokens)', () => {
  test('negrito, itálico e código', () => {
    const out = renderInline('**b** *i* _i2_ `c`')
    const tags = out.filter((n) => isValidElement(n)).map((n) => el(n).type)
    expect(tags).toEqual(['strong', 'em', 'em', 'code'])
  })

  test('link http(s) vira âncora com rel seguro', () => {
    const out = renderInline('[site](https://exemplo.com/x)')
    const a = el(out[0])
    expect(a.type).toBe('a')
    expect(a.props.href).toBe('https://exemplo.com/x')
    expect(a.props.rel).toBe('noopener noreferrer')
  })

  test('plainLinks: link http(s) vira só o TEXTO (sem <a> — p/ dentro de <button>)', () => {
    const out = renderInline('veja [site](https://exemplo.com/x) aqui', { plainLinks: true })
    expect(out.every((n) => !isValidElement(n) || el(n).type !== 'a')).toBe(true)
    expect(textOf(out)).toBe('veja site aqui')
  })

  test('link javascript: NÃO é linkificado (fica texto plano)', () => {
    const out = renderInline('[x](javascript:alert(1))')
    expect(out.every((n) => !isValidElement(n) || el(n).type !== 'a')).toBe(true)
    expect(textOf(out)).toBe('[x](javascript:alert(1))')
  })

  test('link data: também fica texto plano', () => {
    const out = renderInline('[x](data:text/html,<b>oi</b>)')
    expect(out.every((n) => !isValidElement(n) || el(n).type !== 'a')).toBe(true)
  })

  test('imagem https vira <img> com src e alt', () => {
    const out = renderInline('![um gato](https://cdn.exemplo.com/gato.webp)')
    const img = el(out[0])
    expect(img.type).toBe('img')
    expect(img.props.src).toBe('https://cdn.exemplo.com/gato.webp')
    expect(img.props.alt).toBe('um gato')
  })

  test('imagem com alt vazio é permitida', () => {
    const out = renderInline('![](https://cdn.exemplo.com/x.webp)')
    const img = el(out[0])
    expect(img.type).toBe('img')
    expect(img.props.alt).toBe('')
  })

  test('imagem inline convive com texto e negrito', () => {
    const out = renderInline('veja ![g](https://x.com/g.png) e **fim**')
    const tags = out.filter((n) => isValidElement(n)).map((n) => el(n).type)
    expect(tags).toEqual(['img', 'strong'])
  })

  test('imagem javascript: NÃO vira <img> (fica texto plano)', () => {
    const out = renderInline('![x](javascript:alert(1))')
    expect(out.every((n) => !isValidElement(n) || el(n).type !== 'img')).toBe(true)
    expect(textOf(out)).toBe('![x](javascript:alert(1))')
  })

  test('imagem data: também fica texto plano', () => {
    const out = renderInline('![x](data:image/svg+xml,<svg onload=alert(1)/>)')
    expect(out.every((n) => !isValidElement(n) || el(n).type !== 'img')).toBe(true)
  })
})
