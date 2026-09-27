import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createPart, type MoldaMesh } from '../core/model'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { boxMesh } from './mesh'
import { deleteMeshSelection, moveMeshVertices } from './meshOps'
import { faceSkinSize } from './shapes'

function meshModel(mesh?: MoldaMesh, extra: Parameters<typeof makeModel>[0] = {}) {
  const part = createPart({
    id: 'm',
    name: 'malha',
    shape: 'mesh',
    from: [0, 0, 0],
    to: [2, 2, 2],
    color: 2,
    ...(mesh ? { mesh } : {}),
  })
  return makeModel({ parts: [part], ...extra })
}

describe('mover vértices', () => {
  test('o delta encaixa na grade, a caixa da peça acompanha e a pele é re-amostrada', () => {
    const model = meshModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, () => 3)
    const top = ['v_010', 'v_011', 'v_111', 'v_110']
    const moved = moveMeshVertices(model, 'm', top, [0.4, 1.4, 0], 1)
    const next = moved.parts[0]
    expect(next?.mesh?.vertices.v_111).toEqual([2, 3, 2])
    expect(next?.to).toEqual([2, 3, 2])
    expect(next?.from).toEqual([0, 0, 0])
    // A face de cima manteve a pele (mesmo tamanho); a lateral cresceu e foi re-amostrada.
    expect(next?.faces.f_py).toBe(part.faces.f_py)
    expect(faceSkinSize(next ?? part, 'f_px', model.texelsPerUnit)?.height).toBe(12)
  })

  test('delta que arredonda a zero, fora da grade ou acima do lado máximo: o MESMO modelo', () => {
    const model = meshModel()
    expect(moveMeshVertices(model, 'm', ['v_111'], [0.2, 0, 0], 1)).toBe(model)
    expect(moveMeshVertices(model, 'm', ['v_000'], [0, -1, 0], 1)).toBe(model)
    expect(moveMeshVertices(model, 'm', ['v_111'], [MOLDA_LIMITS.maxPartSize, 0, 0], 1)).toBe(model)
    expect(moveMeshVertices(model, 'm', ['v_zzz'], [1, 0, 0], 1)).toBe(model)
    expect(moveMeshVertices(model, 'nao-existe', ['v_111'], [1, 0, 0], 1)).toBe(model)
  })

  test('meio bloco vale com o encaixe de 0,5', () => {
    const model = meshModel(undefined, { snap: 0.5 })
    const moved = moveMeshVertices(model, 'm', ['v_111'], [0.4, 0, 0], 0.5)
    expect(moved.parts[0]?.mesh?.vertices.v_111).toEqual([2.5, 2, 2])
  })

  test('o gêmeo acompanha (espelho ligado)', () => {
    const model = meshModel(boxMesh([1, 0, 0], [3, 2, 2]), { mirrorX: true })
    const moved = moveMeshVertices(model, 'm', ['v_111'], [1, 0, 0], 1)
    const twin = moved.parts.find((p) => p.mirrorOf === 'm')
    expect(twin?.mesh?.vertices.v_111).toEqual([-4, 2, 2])
  })

  test('peça trancada ou escondida recusa movimento na operação pura', () => {
    const locked = meshModel()
    if (!locked.parts[0]) throw new Error('sem peça')
    locked.parts[0].locked = true
    const hidden = meshModel()
    if (!hidden.parts[0]) throw new Error('sem peça')
    hidden.parts[0].hidden = true

    expect(moveMeshVertices(locked, 'm', ['v_111'], [1, 0, 0], 1)).toBe(locked)
    expect(moveMeshVertices(hidden, 'm', ['v_111'], [1, 0, 0], 1)).toBe(hidden)
  })
})

describe('apagar a seleção', () => {
  test('Pontos: o vértice e toda face que o usa somem; a pele da face que sumiu também', () => {
    const model = meshModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, () => 3)
    const result = deleteMeshSelection(model, 'm', [{ kind: 'vertex', key: 'v_111' }])
    if (result.kind !== 'updated') throw new Error(result.kind)
    const next = result.model.parts[0]
    expect(Object.keys(next?.mesh?.faces ?? {}).sort()).toEqual(['f_nx', 'f_ny', 'f_nz'])
    expect(next?.mesh?.vertices.v_111).toBeUndefined()
    expect(next?.faces.f_py).toBeUndefined()
  })

  test('Faces: só a face inteira selecionada sai; os vértices ficam se outra face os usa', () => {
    const model = meshModel()
    const result = deleteMeshSelection(model, 'm', [{ kind: 'face', key: 'f_py' }])
    if (result.kind !== 'updated') throw new Error(result.kind)
    const next = result.model.parts[0]
    expect(Object.keys(next?.mesh?.faces ?? {})).toHaveLength(5)
    expect(next?.mesh?.vertices.v_111).toBeDefined()
  })

  test('Arestas: as faces que contêm a aresta saem', () => {
    const model = meshModel()
    const result = deleteMeshSelection(model, 'm', [{ kind: 'edge', keys: ['v_110', 'v_111'] }])
    if (result.kind !== 'updated') throw new Error(result.kind)
    expect(Object.keys(result.model.parts[0]?.mesh?.faces ?? {}).sort()).toEqual([
      'f_nx',
      'f_ny',
      'f_nz',
      'f_pz',
    ])
  })

  test('sem face nenhuma sobrando: `empty` (a peça é apagada por quem chama); nada escolhido: `unchanged`', () => {
    const model = meshModel()
    const all = Object.keys(model.parts[0]?.mesh?.vertices ?? {}).map((key) => ({
      kind: 'vertex' as const,
      key,
    }))
    expect(deleteMeshSelection(model, 'm', all)).toEqual({ kind: 'empty' })
    expect(deleteMeshSelection(model, 'm', [])).toEqual({ kind: 'unchanged' })
  })

  test('duas faces opostas removem somente essas duas', () => {
    const model = meshModel()
    const result = deleteMeshSelection(model, 'm', [
      { kind: 'face', key: 'f_py' },
      { kind: 'face', key: 'f_ny' },
    ])
    if (result.kind !== 'updated') throw new Error(result.kind)
    expect(Object.keys(result.model.parts[0]?.mesh?.faces ?? {}).sort()).toEqual([
      'f_nx',
      'f_nz',
      'f_px',
      'f_pz',
    ])
  })

  test('apagar aresta de construção não apaga faces e uma malha só de arestas sobrevive', () => {
    const mesh: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0], v_c: [4, 0, 0] },
      faces: {},
      looseEdges: [
        ['v_a', 'v_b'],
        ['v_b', 'v_c'],
      ],
    }
    const model = meshModel(mesh)
    const result = deleteMeshSelection(model, 'm', [{ kind: 'edge', keys: ['v_a', 'v_b'] }])
    if (result.kind !== 'updated') throw new Error(result.kind)
    expect(result.model.parts[0]?.mesh).toEqual({
      vertices: { v_b: [2, 0, 0], v_c: [4, 0, 0] },
      faces: {},
      looseEdges: [['v_b', 'v_c']],
    })
  })

  test('peça trancada ou escondida recusa apagar na operação pura', () => {
    for (const flag of ['locked', 'hidden'] as const) {
      const model = meshModel()
      const part = model.parts[0]
      if (!part) throw new Error('sem peça')
      part[flag] = true
      expect(deleteMeshSelection(model, 'm', [{ kind: 'face', key: 'f_py' }])).toEqual({
        kind: 'unchanged',
      })
    }
  })
})
