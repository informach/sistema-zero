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

  it('avisa quando o for do rótulo não aponta para um controle existente', () => {
    const issues = collectHTMLAccessibilityIssues([
      {
        type: 'element',
        tag: 'label',
        text: 'E-mail',
        attrs: { for: 'campo-ausente' },
        __id: 'label-orphan',
      },
    ])

    expect(issues.map((issue) => issue.blockId)).toContain('label-orphan')
    expect(issues.map((issue) => issue.message).join(' ')).toContain('campo-ausente')
  })

  it('considera somente o primeiro controle aninhado como associado ao rótulo', () => {
    const issues = collectHTMLAccessibilityIssues([
      {
        type: 'element',
        tag: 'label',
        text: 'Dados',
        children: [
          { type: 'element', tag: 'input', id: 'primeiro', __id: 'primeiro' },
          { type: 'element', tag: 'input', id: 'segundo', __id: 'segundo' },
        ],
      },
    ])
    const ids = issues.map((issue) => issue.blockId)

    expect(ids).not.toContain('primeiro')
    expect(ids).toContain('segundo')
  })

  it('não associa ao rótulo um controle aninhado diferente do atributo for', () => {
    const issues = collectHTMLAccessibilityIssues([
      {
        type: 'element',
        tag: 'label',
        text: 'Nome',
        attrs: { for: 'nome' },
        children: [{ type: 'element', tag: 'input', id: 'apelido', __id: 'apelido' }],
      },
      { type: 'element', tag: 'input', id: 'nome', __id: 'nome' },
    ])
    const ids = issues.map((issue) => issue.blockId)

    expect(ids).not.toContain('nome')
    expect(ids).toContain('apelido')
  })

  it('avisa quando a hierarquia de títulos pula níveis', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'h1', text: 'Jogo', __id: 'title' },
      { type: 'element', tag: 'h3', text: 'Regras', __id: 'skipped-heading' },
    ])

    expect(issues.map((issue) => issue.blockId)).toContain('skipped-heading')
  })

  it('aceita títulos consecutivos e tipos de input sem diferenciar capitalização', () => {
    expect(
      messages([
        { type: 'element', tag: 'h1', text: 'Jogo' },
        { type: 'element', tag: 'h2', text: 'Regras' },
        { type: 'element', tag: 'h3', text: 'Pontuação' },
        { type: 'element', tag: 'input', attrs: { type: 'SUBMIT', value: 'Enviar' } },
      ]),
    ).toEqual([])
  })

  it('trata hidden com espaços como tipo inválido e mantém o campo rotulável', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'input', attrs: { type: ' hidden ' }, __id: 'invalid-hidden' },
      { type: 'element', tag: 'input', attrs: { type: 'HIDDEN' }, __id: 'hidden' },
    ])
    const ids = issues.map((issue) => issue.blockId)

    expect(ids).toContain('invalid-hidden')
    expect(ids).not.toContain('hidden')
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

  it('não aceita descrição genérica que apenas repete que o conteúdo é uma imagem', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'img', attrs: { src: 'foto.png', alt: 'imagem' }, __id: 'generic' },
      {
        type: 'element',
        tag: 'img',
        attrs: { src: 'foto.png', alt: 'Foto da turma no pátio', width: '640', height: '360' },
        __id: 'meaningful',
      },
    ])

    expect(issues.map((issue) => issue.blockId)).toContain('generic')
    expect(issues.map((issue) => issue.blockId)).not.toContain('meaningful')
  })

  it('orienta dimensões de imagem ausentes, incompletas ou inválidas', () => {
    const issues = collectHTMLAccessibilityIssues([
      { type: 'element', tag: 'img', attrs: { src: 'a.png', alt: 'A' }, __id: 'missing' },
      {
        type: 'element',
        tag: 'img',
        attrs: { src: 'b.png', alt: 'B', width: '640' },
        __id: 'unpaired',
      },
      {
        type: 'element',
        tag: 'img',
        attrs: { src: 'c.png', alt: 'C', width: 'grande', height: '-1' },
        __id: 'invalid',
      },
      {
        type: 'element',
        tag: 'img',
        attrs: { src: 'd.png', alt: 'D', width: '640', height: '360' },
        __id: 'valid',
      },
    ])
    const ids = issues.map((issue) => issue.blockId)

    expect(ids).toEqual(expect.arrayContaining(['missing', 'unpaired', 'invalid']))
    expect(ids).not.toContain('valid')
  })

  it('orienta autocomplete inválido e aceita listas de tokens completas', () => {
    const issues = collectHTMLAccessibilityIssues([
      {
        type: 'element',
        tag: 'input',
        attrs: { 'aria-label': 'Apelido', autocomplete: 'banana' },
        __id: 'invalid-input',
      },
      {
        type: 'element',
        tag: 'input',
        attrs: { 'aria-label': 'Nome', autocomplete: 'home name' },
        __id: 'invalid-contact-hint',
      },
      {
        type: 'element',
        tag: 'textarea',
        attrs: { 'aria-label': 'Endereço', autocomplete: 'section-blue shipping street-address' },
        __id: 'valid-textarea',
      },
      {
        type: 'element',
        tag: 'input',
        attrs: { 'aria-label': 'Senha', autocomplete: 'CURRENT-PASSWORD WEBAUTHN' },
        __id: 'valid-webauthn',
      },
    ])
    const ids = issues.map((issue) => issue.blockId)

    expect(ids).toContain('invalid-input')
    expect(ids).toContain('invalid-contact-hint')
    expect(ids).not.toContain('valid-textarea')
    expect(ids).not.toContain('valid-webauthn')
  })

  it('avisa quando SVG não oferece um nome acessível significativo', () => {
    const issues = collectHTMLAccessibilityIssues([
      {
        type: 'element',
        tag: 'svg',
        __id: 'svg-sem-titulo',
        children: [{ type: 'element', tag: 'circle', attrs: { r: '20' } }],
      },
      {
        type: 'element',
        tag: 'svg',
        __id: 'svg-titulo-vazio',
        children: [{ type: 'element', tag: 'title', text: '   ' }],
      },
    ])

    expect(issues.map((issue) => issue.blockId)).toEqual(
      expect.arrayContaining(['svg-sem-titulo', 'svg-titulo-vazio']),
    )
  })

  it('aceita SVG nomeado por title, aria-label ou aria-labelledby', () => {
    expect(
      messages([
        {
          type: 'element',
          tag: 'svg',
          children: [{ type: 'element', tag: 'title', text: 'Planeta roxo' }],
        },
        { type: 'element', tag: 'svg', attrs: { 'aria-label': 'Mapa do jogo' } },
        { type: 'element', tag: 'span', id: 'nome-vetor', text: 'Placar circular' },
        {
          type: 'element',
          tag: 'svg',
          attrs: { 'aria-labelledby': 'nome-vetor' },
        },
      ]),
    ).toEqual([])
  })

  it('aceita SVG explicitamente decorativo', () => {
    expect(
      messages([
        { type: 'element', tag: 'svg', attrs: { 'aria-hidden': 'true' } },
        { type: 'element', tag: 'svg', attrs: { role: 'presentation' } },
        { type: 'element', tag: 'svg', attrs: { role: 'none' } },
      ]),
    ).toEqual([])
  })
})
