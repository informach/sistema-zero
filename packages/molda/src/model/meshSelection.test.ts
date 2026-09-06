import { describe, expect, test } from 'bun:test'
import { boxMesh } from './mesh'
import {
  mergeMeshSelection,
  pickVertices,
  pruneMeshSelection,
  selectedEdges,
  selectedFaces,
  selectionCenter,
  selectionNormal,
} from './meshSelection'

const mesh = boxMesh([0, 0, 0], [2, 2, 2])

describe('seleção da malha (vértices como lista mestra)', () => {
  test('um toque vira vértices: ponto, aresta e face', () => {
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

  test('sem "somar" a seleção vira o toque; com "somar" acrescenta, e tocar de novo tira', () => {
    expect(mergeMeshSelection(['v_000'], ['v_111'], false)).toEqual(['v_111'])
    expect(mergeMeshSelection(['v_000'], ['v_111'], true).sort()).toEqual(['v_000', 'v_111'])
    expect(mergeMeshSelection(['v_000', 'v_111'], ['v_111'], true)).toEqual(['v_000'])
    // Toque no nada: limpa sem "somar", preserva com "somar".
    expect(mergeMeshSelection(['v_000'], [], false)).toEqual([])
    expect(mergeMeshSelection(['v_000'], [], true)).toEqual(['v_000'])
  })

  test('arestas e faces DERIVAM dos vértices', () => {
    const top = ['v_010', 'v_011', 'v_111', 'v_110']
    expect(selectedFaces(mesh, top)).toEqual(['f_py'])
    expect(selectedEdges(mesh, top)).toHaveLength(4)
    expect(selectedEdges(mesh, ['v_000', 'v_111'])).toEqual([])
    expect(selectedFaces(mesh, ['v_000'])).toEqual([])
    // Duas faces vizinhas selecionadas: a aresta entre elas também.
    const twoFaces = [...top, 'v_001', 'v_101']
    expect(selectedFaces(mesh, twoFaces).sort()).toEqual(['f_py', 'f_pz'])
    expect(selectedEdges(mesh, twoFaces)).toHaveLength(7)
  })

  test('centro e normal da seleção (a alça e o seu eixo)', () => {
    const top = ['v_010', 'v_011', 'v_111', 'v_110']
    expect(selectionCenter(mesh, top)).toEqual([1, 2, 1])
    expect(selectionNormal(mesh, top)).toEqual([0, 1, 0])
    expect(selectionCenter(mesh, [])).toBeNull()
    // Um vértice só: a média das faces que o tocam (o canto aponta para fora).
    const corner = selectionNormal(mesh, ['v_111'])
    expect(corner?.every((n) => n > 0)).toBe(true)
  })

  test('pruneMeshSelection tira o que já não existe', () => {
    expect(pruneMeshSelection(mesh, ['v_000', 'v_sumiu'])).toEqual(['v_000'])
  })
})
