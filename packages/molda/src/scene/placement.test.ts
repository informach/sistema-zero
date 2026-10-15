import { describe, expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { sceneBounds } from './bounds'
import {
  addScenePrimitive,
  groupSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { identityMatrix, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import {
  addScenePrimitiveNear,
  duplicateSceneNodesNearby,
  placeSceneNodesOnGround,
  placeSceneNodesOnSupport,
  sceneInsertionParent,
} from './placement'

const empty = () => migrateLegacyModel({ ...makeModel(), parts: [] }).document
const bounds = (doc: ReturnType<typeof empty>, id: string) =>
  sceneBounds(indexSceneDocument(doc), { nodeIds: new Set([id]), includeMirrors: false })!

describe('montar peças sem coordenadas', () => {
  test('adiciona formas visíveis e separadas, sem alterar a original', () => {
    const source = addScenePrimitive(empty(), 'box', 'Corpo')
    const body = source.nodes.at(-1)!.id
    const next = addScenePrimitiveNear(source, 'sphere', 'Cabeça', [body])
    const head = next.nodes.at(-1)!.id
    expect(bounds(next, head).min[0]).toBeGreaterThan(bounds(next, body).max[0])
    expect(next.nodes.find((node) => node.id === body)).toBe(source.nodes.at(-1))
    expect(source.nodes).toHaveLength(1)
  })

  test('uma peça nova pertence ao grupo transformado sem mudar o pivô ou o movimento', () => {
    let source = addScenePrimitive(empty(), 'box', 'Corpo')
    source = groupSceneNodes(source, [source.nodes[0]!.id], { name: 'Bichinho' })
    const group = source.nodes.find((node) => node.kind === 'group')!
    const delta = identityMatrix()
    delta[12] = 8
    source = transformSceneNodes(source, [group.id], delta)
    const body = source.nodes.find((node) => node.kind === 'mesh')!
    expect(sceneInsertionParent(source, [body.id])).toBe(group.id)
    expect(sceneInsertionParent(source, [])).toBe(group.id)
    const next = addScenePrimitiveNear(source, 'sphere', 'Cabeça', [body.id])
    const head = next.nodes.at(-1)!
    expect(head.parentId).toBe(group.id)
    expect(next.nodes.find((node) => node.id === group.id)).toBe(
      source.nodes.find((node) => node.id === group.id),
    )
    expect(next.animations).toBe(source.animations)
    expect(bounds(next, head.id).min[0]).toBeGreaterThan(bounds(next, body.id).max[0])
  })

  test('empilha pelo contato da base e permite voltar ao chão', () => {
    let source = addScenePrimitive(empty(), 'box', 'Corpo')
    const body = source.nodes[0]!.id
    source = addScenePrimitiveNear(source, 'sphere', 'Cabeça', [body])
    const head = source.nodes.at(-1)!.id
    const next = placeSceneNodesOnSupport(source, [head], body)
    expect(bounds(next, head).min[1]).toBeCloseTo(bounds(next, body).max[1])
    expect(bounds(next, head).min[0]).toBeCloseTo(bounds(next, body).min[0])
    expect(bounds(placeSceneNodesOnGround(next, [head]), head).min[1]).toBeCloseTo(0)
  })

  test('recusa apoio curvo, a própria seleção e peças travadas sem modificar a origem', () => {
    let source = addScenePrimitive(empty(), 'sphere', 'Bola')
    const ball = source.nodes[0]!.id
    source = addScenePrimitiveNear(source, 'box', 'Peça', [ball])
    const part = source.nodes.at(-1)!.id
    expect(() => placeSceneNodesOnSupport(source, [part], ball)).toThrow()
    expect(() => placeSceneNodesOnSupport(source, [part], part)).toThrow()
    const locked = setSceneNodeFlag(source, [part], 'locked', true)
    expect(() => placeSceneNodesOnGround(locked, [part])).toThrow()
    expect(
      transformPoint(indexSceneDocument(source).scene.worldMatrices.get(part)!, [0, 0, 0])[1],
    ).toBe(1)
  })

  test('duplica ao lado, com nome e recursos independentes, mantendo o grupo', () => {
    let source = addScenePrimitive(empty(), 'box', 'Corpo')
    const bodyId = source.nodes[0]!.id
    source = groupSceneNodes(source, [bodyId], { name: 'Bichinho' })
    const next = duplicateSceneNodesNearby(source, [bodyId])
    const body = next.nodes.find((node) => node.id === bodyId)!
    const copy = next.nodes.at(-1)!
    expect(copy.parentId).toBe(body.parentId)
    expect(copy.name).not.toBe(body.name)
    expect(
      copy.kind === 'mesh' && body.kind === 'mesh' && copy.materialId !== body.materialId,
    ).toBe(true)
    expect(bounds(next, copy.id).min[0]).toBeGreaterThan(bounds(next, body.id).max[0])
  })
})
