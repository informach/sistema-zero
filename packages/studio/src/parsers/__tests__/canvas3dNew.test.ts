import { describe, expect, it } from 'bun:test'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

/**
 * `new THREE.X(...)` — construtor com NAMESPACE (biblioteca importada). É a peça
 * central da categoria Canvas 3D: sem isto, todo `new THREE.Scene()` cai em
 * rawJS e a Ponte não mostra o código real como bloco. O parser antigo exigia
 * callee `Identifier` (só `new Classe()`); aqui aceitamos `THREE.Classe`.
 */

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
  expect(code2).toBe(code) // fixpoint textual
  return { code, raws }
}

describe('newExpr/newInstance com namespace — new THREE.X(...)', () => {
  it('const como STATEMENT: const scene = new THREE.Scene() (0 raw, regenera igual)', () => {
    const { code, raws } = roundtrip('const scene = new THREE.Scene();')
    expect(raws).toEqual([])
    expect(code.trim()).toBe('const scene = new THREE.Scene();')
  })

  it('com argumentos: new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000)', () => {
    const { code, raws } = roundtrip('const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);')
    expect(raws).toEqual([])
    expect(code.trim()).toBe('const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);')
  })

  it('como VALOR (argumento): scene.add(new THREE.Mesh(geo, mat))', () => {
    const { code, raws } = roundtrip(
      ['const geo = new THREE.SphereGeometry(1);', 'scene.add(new THREE.Mesh(geo, mat));'].join(
        '\n',
      ),
    )
    expect(raws).toEqual([])
    expect(code).toContain('scene.add(new THREE.Mesh(geo, mat));')
  })

  it('membro do namespace como valor de argumento: new THREE.Vector3(1, 2, 3)', () => {
    const { code, raws } = roundtrip('camera.position.copy(new THREE.Vector3(1, 2, 3));')
    expect(raws).toEqual([])
    expect(code).toContain('new THREE.Vector3(1, 2, 3)')
  })

  it('classe do ALUNO (sem namespace) continua newInstance normal (regressão)', () => {
    const ir = parseJS('class Cao { }\nconst rex = new Cao();')
    expect(ir.some((s) => s.type === 'newInstance')).toBe(true)
    expect(collectRaw(ir)).toEqual([])
    // e não ganhou namespace à toa
    const inst = ir.find((s) => s.type === 'newInstance') as { namespace?: string }
    expect(inst.namespace).toBeUndefined()
  })

  it('namespace de 2 níveis não é capturado como new simples (fica raw, sem falso-positivo)', () => {
    // `new THREE.addons.X()` tem callee aninhado — fora do escopo desta fase.
    const raws = collectRaw(parseJS('const x = new THREE.addons.Foo();'))
    expect(raws.length).toBe(1)
  })
})
