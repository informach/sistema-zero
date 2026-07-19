import { describe, expect, it } from 'bun:test'
import { assignStableIdsToIR } from '../ids'
import type { SZIR } from '../schema'

describe('assignStableIdsToIR', () => {
  it('atribui ids previsíveis sem sobrescrever ids existentes', () => {
    const ir: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Olá' }],
      css: [{ __id: 'css_manual', selector: 'body', declarations: { color: '#fff' } }],
      js: [
        {
          type: 'repeat',
          times: { type: 'num', value: 2 },
          body: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
        },
      ],
      extensions: [],
    }

    const result = assignStableIdsToIR(ir, 'bridge')

    expect(result.html[0]?.__id).toBe('bridge_html_0')
    expect(result.css[0]?.__id).toBe('css_manual')
    expect(result.behavior.start[0]?.__id).toBe('bridge_start_0')
    const repeat = result.behavior.start[0]
    expect(repeat?.type).toBe('repeat')
    if (repeat?.type === 'repeat') {
      expect(repeat.times.__id).toBe('bridge_start_0_times')
      expect(repeat.body[0]?.__id).toBe('bridge_start_0_body_0')
    }
  })

  it('atribui ids a statements aninhados em função, classe e forEach (níveis profundos)', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'funcDecl',
          name: 'frame',
          params: [],
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: { type: 'colorAlpha', hex: '#000000', alpha: 0.1 },
            },
            {
              type: 'forEach',
              arrayExpr: { type: 'var', name: 'itens' },
              itemName: 'item',
              body: [
                {
                  type: 'memberCall',
                  object: { type: 'var', name: 'item' },
                  method: 'desenhar',
                  args: [],
                },
              ],
            },
          ],
        },
        {
          type: 'classDecl',
          name: 'Player',
          ctorBody: [{ type: 'setThisProp', name: 'x', value: { type: 'num', value: 0 } }],
          methods: [
            {
              name: 'desenhar',
              params: [],
              body: [
                {
                  type: 'canvasArc',
                  ctxVar: 'ctx',
                  x: { type: 'thisProp', name: 'x' },
                  y: { type: 'num', value: 1 },
                  r: { type: 'num', value: 2 },
                },
              ],
            },
          ],
        },
      ],
      extensions: [],
    }

    const result = assignStableIdsToIR(ir, 'b')
    const func = result.behavior.start[0]
    const cls = result.behavior.start[1]
    // Corpo da função (nível 2) e do forEach (nível 3) têm __id.
    if (func?.type === 'funcDecl') {
      expect(func.body[0]?.__id).toBe('b_start_0_body_0')
      const fe = func.body[1]
      if (fe?.type === 'forEach') {
        expect(fe.body[0]?.__id).toBe('b_start_0_body_1_body_0')
      }
    }
    // Construtor e corpo de método da classe (nível 3) têm __id.
    if (cls?.type === 'classDecl') {
      expect(cls.ctorBody[0]?.__id).toBe('b_start_1_ctorBody_0')
      expect(cls.methods[0]?.body[0]?.__id).toBe('b_start_1_methods_0_body_0')
    }
  })

  it('atribui __id de fallback às regras dentro de uma @media', () => {
    const ir: SZIR = {
      html: [],
      css: [
        {
          type: 'mediaQuery',
          feature: 'max-width',
          px: 600,
          rules: [
            { selector: '.box', declarations: { width: '100%' } },
            { type: 'rawCSS', code: '.raw { color: red }', advanced: true },
          ],
        },
      ],
      js: [],
      extensions: [],
    }

    const result = assignStableIdsToIR(ir, 'm')
    const media = result.css[0]
    expect(media?.__id).toBe('m_css_0')
    if (media && 'type' in media && media.type === 'mediaQuery') {
      expect(media.rules[0]?.__id).toBe('m_css_0_rules_0')
      expect(media.rules[1]?.__id).toBe('m_css_0_rules_1')
    }
  })

  it('preserva __id já existente em regra dentro de @media', () => {
    const ir: SZIR = {
      html: [],
      css: [
        {
          type: 'mediaQuery',
          feature: 'min-width',
          px: 800,
          rules: [{ selector: '.col', declarations: { display: 'flex' }, __id: 'css_manual' }],
        },
      ],
      js: [],
      extensions: [],
    }

    const result = assignStableIdsToIR(ir, 'm')
    const media = result.css[0]
    if (media && 'type' in media && media.type === 'mediaQuery') {
      expect(media.rules[0]?.__id).toBe('css_manual')
    }
  })
})
