import { describe, expect, test } from 'bun:test'
import { boxMesh } from './mesh'
import {
  type MeshPick,
  mergeMeshSelection,
  pickVertices,
  pruneMeshSelection,
  selectedEdges,
  selectedFaces,
  selectionCenter,
  selectionNormal,
  selectionVertices,
} from './meshSelection'

const mesh = boxMesh([0, 0, 0], [2, 2, 2])

describe('seleção explícita da malha', () => {
  test('cada elemento expõe somente os vértices que afeta', () => {
    expect(pickVertices(mesh, { kind: 'vertex', key: 'v_000' })).toEqual(['v_000'])
    expect(pickVertices(mesh, { kind: 'vertex', key: 'v_zzz' })).toEqual([])
    expect(pickVertices(mesh, { kind: 'edge', keys: ['v_000', 'v_001'] })).toEqual([
      'v_000',
      'v_001',
    ])
    expect(pickVertices(mesh, { kind: 'face', key: 'f_pz' })).toEqual([
      'v_011',
      'v_001',
      'v_101',
      'v_111',
    ])
  })

  test('sem "somar" vira o toque; com "somar" acrescenta e o segundo toque tira', () => {
    const a: MeshPick = { kind: 'vertex', key: 'v_000' }
    const b: MeshPick = { kind: 'vertex', key: 'v_111' }
    expect(mergeMeshSelection([a], b, false)).toEqual([b])
    expect(mergeMeshSelection([a], b, true)).toEqual([a, b])
    expect(mergeMeshSelection([a, b], b, true)).toEqual([a])
    expect(mergeMeshSelection([a], null, false)).toEqual([])
    expect(mergeMeshSelection([a], null, true)).toEqual([a])
    // Aresta invertida é o mesmo elemento.
    const edge: MeshPick = { kind: 'edge', keys: ['v_000', 'v_001'] }
    expect(mergeMeshSelection([edge], { kind: 'edge', keys: ['v_001', 'v_000'] }, true)).toEqual([])
  })

  test('duas faces opostas continuam exatamente duas, mesmo cobrindo os oito vértices', () => {
    const selection: MeshPick[] = [
      { kind: 'face', key: 'f_py' },
      { kind: 'face', key: 'f_ny' },
    ]
    expect(selectionVertices(mesh, selection)).toHaveLength(8)
    expect(selectedFaces(mesh, selection)).toEqual(['f_py', 'f_ny'])
    expect(selectedEdges(mesh, selection)).toEqual([])
  })

  test('centro e normal usam os elementos explícitos', () => {
    const top: MeshPick[] = [{ kind: 'face', key: 'f_py' }]
    expect(selectionCenter(mesh, top)).toEqual([1, 2, 1])
    expect(selectionNormal(mesh, top)).toEqual([0, 1, 0])
    expect(selectionCenter(mesh, [])).toBeNull()
    const corner = selectionNormal(mesh, [{ kind: 'vertex', key: 'v_111' }])
    expect(corner?.every((n) => n > 0)).toBe(true)
  })

  test('pruneMeshSelection tira elementos que já não existem e canoniza arestas', () => {
    expect(
      pruneMeshSelection(mesh, [
        { kind: 'vertex', key: 'v_sumiu' },
        { kind: 'edge', keys: ['v_001', 'v_000'] },
        { kind: 'face', key: 'f_py' },
      ]),
    ).toEqual([
      { kind: 'edge', keys: ['v_000', 'v_001'] },
      { kind: 'face', key: 'f_py' },
    ])
  })
})
