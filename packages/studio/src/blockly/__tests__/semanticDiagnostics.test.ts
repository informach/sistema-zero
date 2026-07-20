import { describe, expect, it } from 'bun:test'
import type * as Blockly from 'blockly/core'
import type { JSStatement } from '#ir'
import { applySemanticDiagnostics } from '../semanticDiagnostics'

function warningWorkspace(blockId: string) {
  const warnings: Array<string | null> = []
  const block = {
    setWarningText(text: string | null) {
      warnings.push(text)
    },
  }
  const workspace = {
    getAllBlocks: () => [block],
    getBlockById: (id: string) => (id === blockId ? block : null),
  } as unknown as Blockly.Workspace
  return { workspace, warnings }
}

function warningWorkspaceFor(blockIds: string[]) {
  const warnings = new Map<string, Array<string | null>>()
  const blocks = new Map(
    blockIds.map((id) => [
      id,
      {
        setWarningText(text: string | null) {
          const current = warnings.get(id) ?? []
          current.push(text)
          warnings.set(id, current)
        },
      },
    ]),
  )
  const workspace = {
    getAllBlocks: () => [...blocks.values()],
    getBlockById: (id: string) => blocks.get(id) ?? null,
  } as unknown as Blockly.Workspace
  return { workspace, warnings }
}

describe('diagnósticos semânticos nos blocos', () => {
  it('prende o nome inexistente ao bloco e impede a geração', () => {
    const { workspace, warnings } = warningWorkspace('desenho-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      js: [
        {
          type: 'g2d:onStart',
          body: [
            {
              type: 'g2d:drawSprite',
              __id: 'desenho-1',
              spriteVar: 'fantasma',
              ctxVar: 'ctx',
            },
          ],
        },
      ],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('fantasma')
  })

  it('limpa o aviso anterior quando o projeto volta a ser válido', () => {
    const { workspace, warnings } = warningWorkspace('desenho-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      js: [],
    })

    expect(valid).toBe(true)
    expect(warnings).toEqual([null])
  })

  it('avisa quando a criança esquece o # de um id HTML, sem bloquear o preview', () => {
    const { workspace, warnings } = warningWorkspace('css-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', id: 'caixa' }],
      css: [{ selector: 'caixa', declarations: { color: 'red' }, __id: 'css-1' }],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.at(-1)).toContain('#caixa')
  })

  it('avisa sobre id ou classe que ainda não existe, sem bloquear CSS avançado', () => {
    const { workspace, warnings } = warningWorkspace('css-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', id: 'caixa', attrs: { class: 'cartao' } }],
      css: [{ selector: '#fantasma', declarations: { color: 'red' }, __id: 'css-1' }],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.at(-1)).toContain('#fantasma')
  })

  it('avisa quando uma reutilização SVG aponta para um id inexistente', () => {
    const { workspace, warnings } = warningWorkspace('uso-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          children: [
            { type: 'element', tag: 'circle', id: 'bola' },
            { type: 'element', tag: 'use', attrs: { href: '#estrela' }, __id: 'uso-1' },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('#estrela')
  })

  it('avisa quando a referência SVG local esquece o #', () => {
    const { workspace, warnings } = warningWorkspace('uso-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          children: [
            { type: 'element', tag: 'circle', id: 'estrela' },
            { type: 'element', tag: 'use', attrs: { href: 'estrela' }, __id: 'uso-1' },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('#estrela')
  })

  it('orienta imagem sem descrição ou marcação decorativa sem bloquear o preview', () => {
    const { workspace, warnings } = warningWorkspace('imagem-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'img',
          attrs: { src: 'heroi.png' },
          __id: 'imagem-1',
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.at(-1)).toContain('só enfeite')
  })

  it('orienta campos HTML sem rótulo sem bloquear o preview', () => {
    const ids = ['nome-1', 'mensagem-1']
    const { workspace, warnings } = warningWorkspaceFor(ids)
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'input',
          attrs: { type: 'text', placeholder: 'Seu nome' },
          __id: 'nome-1',
        },
        {
          type: 'element',
          tag: 'textarea',
          attrs: { placeholder: 'Sua mensagem' },
          __id: 'mensagem-1',
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings.get('nome-1')?.at(-1)).toContain('Explicar o campo')
    expect(warnings.get('mensagem-1')?.at(-1)).toContain('Explicar o campo')
  })

  it('aceita campos explicados por for, aninhamento ou aria-label', () => {
    const ids = ['email-1', 'aceite-1', 'busca-1']
    const { workspace, warnings } = warningWorkspaceFor(ids)
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        { type: 'element', tag: 'label', text: 'E-mail', attrs: { for: 'email' } },
        { type: 'element', tag: 'input', id: 'email', attrs: { type: 'email' }, __id: 'email-1' },
        {
          type: 'element',
          tag: 'label',
          text: 'Aceito',
          children: [
            {
              type: 'element',
              tag: 'input',
              attrs: { type: 'checkbox' },
              __id: 'aceite-1',
            },
          ],
        },
        {
          type: 'element',
          tag: 'input',
          attrs: { type: 'search', 'aria-label': 'Buscar' },
          __id: 'busca-1',
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    for (const id of ids) expect(warnings.get(id), id).toEqual([null])
  })

  it('avisa sobre geometria SVG inválida sem apagar o desenho', () => {
    const { workspace, warnings } = warningWorkspace('forma-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          children: [
            {
              type: 'element',
              tag: 'polygon',
              attrs: { points: 'isto não são pontos' },
              __id: 'forma-1',
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('pontos')
  })

  it.each([
    '-1px',
    '-1%',
    '-0.5rem',
  ])('avisa sobre comprimento SVG negativo mesmo quando há unidade: %s', (radius) => {
    const { workspace, warnings } = warningWorkspace('forma-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          children: [
            {
              type: 'element',
              tag: 'circle',
              attrs: { r: radius },
              __id: 'forma-1',
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('r não pode ser negativo')
  })

  it('mantém expressões SVG dinâmicas fora da validação estática de sinal', () => {
    const { workspace, warnings } = warningWorkspace('forma-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          children: [
            {
              type: 'element',
              tag: 'circle',
              attrs: { r: 'var(--raio)' },
              __id: 'forma-1',
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings).toEqual([null])
  })

  it('bloqueia viewBox, caminho e transformação incompletos com exemplos acionáveis', () => {
    const ids = ['svg-1', 'path-1', 'group-1']
    const { workspace, warnings } = warningWorkspaceFor(ids)
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          attrs: { viewBox: '0 0 200' },
          __id: 'svg-1',
          children: [
            { type: 'element', tag: 'path', attrs: { d: 'M' }, __id: 'path-1' },
            {
              type: 'element',
              tag: 'g',
              attrs: { transform: 'rotate()' },
              __id: 'group-1',
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.get('svg-1')?.at(-1)).toContain('quatro números')
    expect(warnings.get('path-1')?.at(-1)).toContain('começar com M')
    expect(warnings.get('group-1')?.at(-1)).toContain('transformação')
  })

  it('aceita viewBox, transformação e caminho SVG completos', () => {
    const { workspace, warnings } = warningWorkspace('svg-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          attrs: { viewBox: '0 0 200 200', transform: 'translate(10 20) scale(2)' },
          __id: 'svg-1',
          children: [
            {
              type: 'element',
              tag: 'path',
              attrs: { d: 'M 10 10 L 30 30 C 40 40 50 50 60 60 Z' },
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings).toEqual([null])
  })

  it('bloqueia alvo incompatível e referência SVG circular', () => {
    const { workspace, warnings } = warningWorkspaceFor(['use-root', 'use-cycle'])
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'svg',
          id: 'raiz',
          children: [
            {
              type: 'element',
              tag: 'use',
              attrs: { href: '#raiz' },
              __id: 'use-root',
            },
            {
              type: 'element',
              tag: 'g',
              id: 'grupo',
              children: [
                {
                  type: 'element',
                  tag: 'use',
                  attrs: { href: '#grupo' },
                  __id: 'use-cycle',
                },
              ],
            },
          ],
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.get('use-root')?.at(-1)).toContain('aponta para <svg>')
    expect(warnings.get('use-cycle')?.at(-1)).toContain('referência circular')
  })

  it('impede o preview quando o preparo aponta para uma tela inexistente', () => {
    const { workspace, warnings } = warningWorkspace('setup-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [],
      js: [{ type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' }],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('Não achei uma tela Canvas')
  })

  it('impede uma operação Canvas cujo pincel ainda não foi preparado', () => {
    const { workspace, warnings } = warningWorkspace('rect-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [
        {
          type: 'canvasFillRect',
          ctxVar: 'ctx',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 10 },
          h: { type: 'num', value: 10 },
          __id: 'rect-1',
        },
      ],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('pincel “ctx”')
    expect(warnings.at(-1)).toContain('Preparar a tela')
  })

  it('não aceita um preparo Canvas que aparece somente depois do desenho', () => {
    const { workspace, warnings } = warningWorkspaceFor(['rect-1', 'setup-1'])
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [
        {
          type: 'canvasFillRect',
          ctxVar: 'ctx',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 10 },
          h: { type: 'num', value: 10 },
          __id: 'rect-1',
        },
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' },
      ],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.get('rect-1')?.at(-1)).toContain('ainda não foi preparado')
  })

  it('encontra pincéis ausentes dentro de expressões Canvas aninhadas', () => {
    const { workspace, warnings } = warningWorkspace('medida-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' },
        {
          type: 'var',
          kind: 'const',
          name: 'largura',
          __id: 'medida-1',
          value: {
            type: 'canvasMeasureText',
            ctxVar: 'outroPincel',
            text: { type: 'str', value: 'oi' },
          },
        },
      ],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('pincel “outroPincel”')
  })

  it('impede o preview quando o id escolhido pertence a outro elemento', () => {
    const { workspace, warnings } = warningWorkspace('setup-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', id: 'jogo', __id: 'div-1' }],
      css: [],
      js: [{ type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' }],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('pertence a <div>')
  })

  it('impede ids DOM e nomes de pincel repetidos, avisando todos os blocos', () => {
    const ids = ['canvas-1', 'canvas-2', 'setup-1', 'setup-2']
    const { workspace, warnings } = warningWorkspaceFor(ids)
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        { type: 'canvas', id: 'jogo', __id: 'canvas-1' },
        { type: 'canvas', id: 'jogo', __id: 'canvas-2' },
      ],
      css: [],
      js: [
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' },
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-2' },
      ],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.get('canvas-1')?.at(-1)).toContain('aparece 2 vezes')
    expect(warnings.get('canvas-2')?.at(-1)).toContain('aparece 2 vezes')
    expect(warnings.get('setup-1')?.at(-1)).toContain('foi preparado 2 vezes')
    expect(warnings.get('setup-2')?.at(-1)).toContain('foi preparado 2 vezes')
  })

  it('aceita um Canvas existente com id e pincel únicos', () => {
    const { workspace, warnings } = warningWorkspace('setup-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [{ type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' }],
      extensions: [],
    })

    expect(valid).toBe(true)
    expect(warnings).toEqual([null])
  })

  const negativeRadiusStatements: Array<readonly [string, JSStatement]> = [
    [
      'canvasArc',
      {
        type: 'canvasArc',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 10 },
        r: { type: 'num', value: -1 },
        __id: 'forma-1',
      },
    ],
    [
      'canvasRoundRect',
      {
        type: 'canvasRoundRect',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 10 },
        w: { type: 'num', value: 20 },
        h: { type: 'num', value: 20 },
        r: { type: 'num', value: -2 },
        __id: 'forma-1',
      },
    ],
    [
      'canvasEllipse',
      {
        type: 'canvasEllipse',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 10 },
        rx: { type: 'num', value: -3 },
        ry: { type: 'num', value: 4 },
        __id: 'forma-1',
      },
    ],
    [
      'canvasArcSlice',
      {
        type: 'canvasArcSlice',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 10 },
        r: { type: 'num', value: -5 },
        start: { type: 'num', value: 0 },
        end: { type: 'num', value: Math.PI },
        __id: 'forma-1',
      },
    ],
    [
      'canvasArcTo',
      {
        type: 'canvasArcTo',
        ctxVar: 'ctx',
        x1: { type: 'num', value: 10 },
        y1: { type: 'num', value: 10 },
        x2: { type: 'num', value: 20 },
        y2: { type: 'num', value: 20 },
        r: { type: 'num', value: -6 },
        __id: 'forma-1',
      },
    ],
  ]

  it.each(negativeRadiusStatements)('impede %s com raio literal negativo', (_name, statement) => {
    const { workspace, warnings } = warningWorkspace('forma-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [{ type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' }, statement],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('não pode ser negativo')
  })

  it('impede tamanho literal negativo no tracejado do Canvas', () => {
    const { workspace, warnings } = warningWorkspace('traco-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'canvas', id: 'jogo', __id: 'canvas-1' }],
      css: [],
      js: [
        { type: 'canvasSetup', canvasId: 'jogo', varName: 'ctx', __id: 'setup-1' },
        {
          type: 'canvasLineDash',
          ctxVar: 'ctx',
          segment: { type: 'num', value: -1 },
          __id: 'traco-1',
        },
      ],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('tracejado')
  })

  it('bloqueia declaração CSS que o gerador recusaria, no bloco da declaração', () => {
    const { workspace, warnings } = warningWorkspace('decl-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [{ type: 'element', tag: 'div', attrs: { class: 'alvo' } }],
      css: [
        {
          selector: '.alvo',
          declarations: [
            {
              property: 'color',
              value: 'red; background-image: url(https://attacker.invalid/leak)',
              __id: 'decl-1',
            },
          ],
        },
      ],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('mais de uma declaração')
  })

  it('bloqueia fechamento injetado em comentário CSS no próprio bloco', () => {
    const { workspace, warnings } = warningWorkspace('comentario-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [],
      css: [
        {
          type: 'comment',
          text: '*/ body { background: url(https://attacker.example/x); } /*',
          __id: 'comentario-1',
        },
      ],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('fechar o comentário')
  })

  it('bloqueia URL HTML perigosa no bloco do link', () => {
    const { workspace, warnings } = warningWorkspace('link-1')
    const valid = applySemanticDiagnostics(workspace, {
      html: [
        {
          type: 'element',
          tag: 'a',
          text: 'Clique',
          attrs: { href: 'javascript:alert(1)' },
          __id: 'link-1',
        },
      ],
      css: [],
      js: [],
      extensions: [],
    })

    expect(valid).toBe(false)
    expect(warnings.at(-1)).toContain('endereço não é permitido')
  })
})
