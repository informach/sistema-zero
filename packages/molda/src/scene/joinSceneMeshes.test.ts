import { describe, expect, test } from 'bun:test'
import {
  addSceneLocator,
  addScenePrimitive,
  setSceneNodeFlag,
  transformSceneNodes,
} from './commands'
import { createSceneProject } from './createProject'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { sceneToJson } from './documentJson'
import { joinSceneMeshes } from './joinSceneMeshes'
import { identityMatrix } from './matrix'
import { sceneMeshVolume } from './meshSolid'
import { sceneGeometryMesh } from './parametricGeometry'
import { readSceneDocument } from './readDocument'

function cylinders(count = 2) {
  let serial = 0
  const id = () => `join-test-${++serial}`
  let document = createSceneProject({ kind: 'empty', name: 'Unir' })
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    document = addScenePrimitive(document, 'cylinder', `Cilindro ${i + 1}`, id)
    ids.push(document.nodes.at(-1)!.id)
    const move = identityMatrix()
    move[12] = i * 0.5
    document = transformSceneNodes(document, [ids[i]!], move)
  }
  return { document, ids, id }
}

function meshOf(document: MoldaSceneDocument, nodeId: string) {
  const node = document.nodes.find((part) => part.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente')
  return sceneGeometryMesh(document.geometries.find((geometry) => geometry.id === node.geometryId)!)
}

describe('unir peças', () => {
  test('dois cilindros sobrepostos viram uma peça só, sem costurar nem recortar', () => {
    const { document, ids, id } = cylinders()
    const [first, second] = ids as [string, string]
    const a = meshOf(document, first)
    const b = meshOf(document, second)
    const result = joinSceneMeshes(document, ids, id)
    const joined: SceneMeshGeometry = meshOf(result, first)

    expect(result.nodes.some((node) => node.id === second)).toBe(false)
    expect(Object.keys(joined.faces)).toHaveLength(
      Object.keys(a.faces).length + Object.keys(b.faces).length,
    )
    expect(Object.keys(joined.vertices)).toHaveLength(
      Object.keys(a.vertices).length + Object.keys(b.vertices).length,
    )
    // Not a boolean union: the overlap is counted twice, each volume stays whole.
    expect(sceneMeshVolume(joined)).toBeCloseTo(sceneMeshVolume(a) + sceneMeshVolume(b), 9)
    const moved = Object.values(b.vertices).map(([x, y, z]) => `${x + 0.5},${y},${z}`)
    const present = new Set(Object.values(joined.vertices).map((point) => point.join(',')))
    expect(moved.every((point) => present.has(point))).toBe(true)
    expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
    expect(document.nodes.some((node) => node.id === second)).toBe(true)
  })

  test('une várias peças de uma vez e mantém o material de cada uma', () => {
    const { document, ids, id } = cylinders(3)
    const materials = ids.map((nodeId) => {
      const node = document.nodes.find((part) => part.id === nodeId)
      if (node?.kind !== 'mesh') throw new Error('Peça ausente')
      return node.materialId
    })
    const result = joinSceneMeshes(document, ids, id)
    expect(result.nodes.filter((node) => node.kind === 'mesh')).toHaveLength(1)
    const used = new Set(
      Object.values(meshOf(result, ids[0]!).faces).map((face) => face.materialId ?? materials[0]),
    )
    for (const material of materials) expect(used.has(material)).toBe(true)
  })

  test('peça espelhada continua com o lado de fora para fora', () => {
    const { document, ids, id } = cylinders()
    const mirrored = identityMatrix()
    mirrored[0] = -1
    const source = transformSceneNodes(document, [ids[1]!], mirrored)
    const before = sceneMeshVolume(meshOf(source, ids[0]!)) * 2
    const result = joinSceneMeshes(source, ids, id)
    expect(sceneMeshVolume(meshOf(result, ids[0]!))).toBeCloseTo(before, 9)
  })

  test('recusa apoios e peças travadas sem mudar nada', () => {
    const { document, ids, id } = cylinders()
    const withLocator = addSceneLocator(document, 'Apoio', id)
    const locator = withLocator.nodes.at(-1)!.id
    expect(() => joinSceneMeshes(withLocator, [ids[0]!, locator], id)).toThrow('peças com forma')
    const locked = setSceneNodeFlag(document, [ids[1]!], 'locked', true)
    expect(() => joinSceneMeshes(locked, ids, id)).toThrow('Destrave')
    expect(() => joinSceneMeshes(document, [ids[0]!], id)).toThrow('duas peças')
  })
})
