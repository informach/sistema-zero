import { describe, expect, it } from 'bun:test'
import type { CSSEntry, CSSRule } from '#ir'
import { buildCssSourceMapFromText, findIdAtLine, reverseSourceMap } from '../sourceMap.js'

describe('buildCssSourceMapFromText — realce do CSS pelas linhas do texto exibido', () => {
  it('seletor multilinha: cada bloco realça SUA linha (margin != width)', () => {
    // 1 html,
    // 2 body {
    // 3   width: 100%;
    // 4   margin: 0;
    // 5   padding: 0;
    // 6 }
    const displayed = 'html,\nbody {\n  width: 100%;\n  margin: 0;\n  padding: 0;\n}'
    // IR como o round-trip produz: width % vira bloco tipado (CSSRule só width,
    // __id), o resto vira "Regra CSS" genérica (CSSRule com __declIds por prop).
    const widthRule: CSSRule = {
      selector: 'html, body',
      declarations: { width: '100%' },
      __id: 'wId',
    }
    const genericRule: CSSRule = {
      selector: 'html, body',
      declarations: { margin: '0', padding: '0' },
      __id: 'gId',
      __declIds: { margin: 'mId', padding: 'pId' },
    }

    const map = buildCssSourceMapFromText(displayed, [widthRule, genericRule])

    expect(map.wId).toMatchObject({ file: 'style.css', startLine: 3, endLine: 3 })
    expect(map.mId).toMatchObject({ startLine: 4, endLine: 4 })
    expect(map.pId).toMatchObject({ startLine: 5, endLine: 5 })
    // a regra-pai cobre a faixa das SUAS declarações (margin..padding)
    expect(map.gId).toMatchObject({ startLine: 4, endLine: 5 })
    // o ponto do bug: o bloco margin NÃO cai na linha do width
    expect(map.mId?.startLine).not.toBe(3)
  })

  it('direção inversa: cursor na linha resolve o bloco mais específico', () => {
    const displayed = 'html,\nbody {\n  width: 100%;\n  margin: 0;\n}'
    const widthRule: CSSRule = {
      selector: 'html, body',
      declarations: { width: '100%' },
      __id: 'wId',
    }
    const genericRule: CSSRule = {
      selector: 'html, body',
      declarations: { margin: '0' },
      __id: 'gId',
      __declIds: { margin: 'mId' },
    }
    const rev = reverseSourceMap(buildCssSourceMapFromText(displayed, [widthRule, genericRule]))
    expect(findIdAtLine(rev, 'style.css', 4)).toBe('mId')
    expect(findIdAtLine(rev, 'style.css', 3)).toBe('wId')
  })

  it('declaração ausente do texto → id não entra no mapa (sem realce errado)', () => {
    const displayed = '.box {\n  color: red;\n}'
    const rule: CSSRule = {
      selector: '.box',
      declarations: { color: 'red', width: '10px' },
      __id: 'rId',
      __declIds: { color: 'cId', width: 'wId' },
    }
    const map = buildCssSourceMapFromText(displayed, [rule])
    expect(map.cId).toMatchObject({ startLine: 2, endLine: 2 })
    expect(map.wId).toBeUndefined()
  })

  it('seletor duplicado: ocorrências consumidas em ordem documental', () => {
    const displayed = '.card {\n  color: red;\n}\n.card {\n  color: blue;\n}'
    const r1: CSSRule = {
      selector: '.card',
      declarations: { color: 'red' },
      __id: 'a',
      __declIds: { color: 'ca' },
    }
    const r2: CSSRule = {
      selector: '.card',
      declarations: { color: 'blue' },
      __id: 'b',
      __declIds: { color: 'cb' },
    }
    const map = buildCssSourceMapFromText(displayed, [r1, r2])
    expect(map.ca).toMatchObject({ startLine: 2, endLine: 2 })
    expect(map.cb).toMatchObject({ startLine: 5, endLine: 5 })
  })

  it('@media e rawCSS são ignorados (chamador mantém o canônico)', () => {
    const displayed = '@media (max-width: 600px) {\n  .a { color: red; }\n}'
    const media: CSSEntry = { type: 'mediaQuery', feature: 'max-width', px: 600, rules: [] }
    const raw: CSSEntry = {
      type: 'rawCSS',
      code: '@keyframes x { from {} to {} }',
      advanced: true,
    }
    expect(Object.keys(buildCssSourceMapFromText(displayed, [media, raw]))).toEqual([])
  })

  it('css exibido vazio → mapa vazio', () => {
    expect(buildCssSourceMapFromText('', [])).toEqual({})
  })
})
