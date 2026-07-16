import { describe, expect, it } from 'bun:test'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

/**
 * `import * as THREE from 'three'` — a linha de import da biblioteca. É o bloco
 * RAIZ da categoria Canvas 3D (a criança põe primeiro) e é o que dispara o
 * importmap automático do preview. Sem o nó dedicado, o import caía em rawJS.
 */

function collectRaw(statements: unknown[]): string[] {
  const raws: string[] = []
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const r = node as Record<string, unknown>
    if (r.type === 'rawJS') raws.push(String(r.code ?? ''))
    for (const v of Object.values(r)) visit(v)
  }
  visit(statements)
  return raws
}

describe('importStar — import * as NS from "mod"', () => {
  it('parseia como nó dedicado (0 raw) e regenera igual', () => {
    const src = 'import * as THREE from "three";'
    const ir = parseJS(src)
    expect(collectRaw(ir)).toEqual([])
    expect(ir.some((s) => s.type === 'importStar')).toBe(true)
    const code = generateJS({ statements: ir })
    expect(code.trim()).toBe("import * as THREE from 'three';")
    // fixpoint textual
    expect(generateJS({ statements: parseJS(code) })).toBe(code)
  })

  it('fica NO TOPO mesmo se vier depois de outro statement (import hoisting)', () => {
    const src = ['const x = 1;', 'import * as THREE from "three";'].join('\n')
    const code = generateJS({ statements: parseJS(src) })
    expect(code.indexOf("import * as THREE from 'three';")).toBeLessThan(
      code.indexOf('const x = 1;'),
    )
  })

  it('outras formas de import continuam rawJS (só o namespace-star é dedicado)', () => {
    expect(collectRaw(parseJS('import { Scene } from "three";')).length).toBe(1)
    expect(collectRaw(parseJS('import Foo from "bar";')).length).toBe(1)
  })
})
