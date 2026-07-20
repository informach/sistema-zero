import { describe, expect, it } from 'bun:test'
import { generateCSS } from '#generators'
import { cssDeclarationEntries } from '#ir'
import { parseCSS } from '../css'

describe('CSS — declarações ordenadas e sem perda', () => {
  it('preserva propriedades repetidas como blocos editáveis, na ordem original', () => {
    const css = '.caixa {\n  display: flex;\n  display: grid;\n}'
    const [entry] = parseCSS(css)
    if (!entry || 'type' in entry) throw new Error('a regra deveria continuar estruturada')

    expect(cssDeclarationEntries(entry.declarations)).toEqual([
      { property: 'display', value: 'flex' },
      { property: 'display', value: 'grid' },
    ])
    expect(generateCSS([entry]).trim()).toBe(css)
  })

  it('preserva fallbacks repetidos dentro de keyframes', () => {
    const css =
      '@keyframes aparecer {\n  0% {\n    display: flex;\n    display: grid;\n  }\n  100% {\n    opacity: 1;\n  }\n}'
    const [entry] = parseCSS(css)
    if (!entry || !('type' in entry) || entry.type !== 'keyframes') {
      throw new Error('o keyframe deveria continuar estruturado')
    }

    expect(cssDeclarationEntries(entry.steps[0]?.declarations ?? [])).toEqual([
      { property: 'display', value: 'flex' },
      { property: 'display', value: 'grid' },
    ])
    expect(generateCSS([entry]).trim()).toBe(css)
  })

  it('preserva o keyframe inteiro quando não consegue consumir todo o corpo', () => {
    const css = '@keyframes aparecer { 0% { opacity: 0; } isto-nao-pode-sumir }'
    const [entry] = parseCSS(css)
    if (!entry) throw new Error('o CSS deveria ser preservado')

    expect(entry).toEqual({ type: 'rawCSS', code: css, advanced: true })
    expect(generateCSS([entry]).trim()).toBe(css)
  })

  it('preserva a regra inteira quando há comentário de declaração não representável', () => {
    const css = '.caixa { /* explicação */ color: red; }'
    const [entry] = parseCSS(css)
    if (!entry) throw new Error('o CSS deveria ser preservado')

    expect(entry).toEqual({ type: 'rawCSS', code: css, advanced: true })
    expect(generateCSS([entry]).trim()).toBe(css)
  })
})
