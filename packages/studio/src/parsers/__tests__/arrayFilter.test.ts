import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '#blockly'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

function collectRaw(statements: unknown[]): string[] {
  const raws: string[] = []
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>
    if (record.type === 'rawJS') raws.push(String(record.code ?? ''))
    for (const value of Object.values(record)) visit(value)
  }
  visit(statements)
  return raws
}

function roundtrip(src: string): { code: string; raws: string[] } {
  const ir = parseJS(src)
  const raws = collectRaw(ir)
  const code = generateJS({ statements: ir })
  const code2 = generateJS({ statements: parseJS(code) })
  expect(code2).toBe(code)
  return { code, raws }
}

describe('arrayFilter — .filter(arrow) vira bloco (lista = SOQUETE)', () => {
  it('filter sobre variável simples (0 rawJS, fixpoint)', () => {
    const { code, raws } = roundtrip(
      'let numeros = [1, 2, 3];\nlet pares = numeros.filter(n => n % 2 === 0);',
    )
    expect(raws).toEqual([])
    expect(code).toContain('.filter((n) =>')
  })

  it('filter sobre MEMBRO — o padrão do Space Invaders (this.enemies)', () => {
    const src = [
      'class Wave {',
      '  render() {',
      '    this.enemies = this.enemies.filter(object => !object.markedForDeletion);',
      '  }',
      '}',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain(
      'this.enemies = this.enemies.filter((object) => !object.markedForDeletion);',
    )
  })

  it('arrow com corpo em BLOCO segue raw (só corpo-expressão vira bloco)', () => {
    const ir = parseJS('let xs = [1];\nlet ys = xs.filter(x => { return x > 0; });')
    expect(collectRaw(ir).length).toBe(1)
  })

  it('IR→blocos emite sz_val_array_filter com ARRAY e COND em soquetes', () => {
    const ir = parseJS('class W { limpar() { this.itens = this.itens.filter(i => !i.morto); } }')
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: ir, extensions: [] })
    const json = JSON.stringify(state)
    expect(json).toContain('"sz_val_array_filter"')
    expect(json).not.toContain('"sz_adv_raw_js"')
  })
})
