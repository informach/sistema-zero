import { expect, test } from 'bun:test'
import { addScenePrimitive, setScenePrimitiveDetail } from './commands'
import { createSceneProject } from './createProject'
import { sceneToJson } from './documentJson'
import { buildSceneGeometry } from './geometry'
import { sceneGeometryMesh } from './parametricGeometry'
import { readSceneDocument } from './readDocument'

test('o cone nativo tem uma ponta, base fechada e detalhes persistidos', () => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Formas' }),
    'cone',
    'Cone',
  )
  const node = source.nodes.at(-1)!
  const geometry = source.geometries.at(-1)!
  expect(geometry.kind).toBe('cone')
  const mesh = sceneGeometryMesh(geometry)
  expect(Object.keys(mesh.faces)).toHaveLength(32)
  expect(Object.values(mesh.vertices).filter((point) => point[1] === 1)).toHaveLength(1)
  const rendered = buildSceneGeometry(geometry)
  expect(rendered.issues).toEqual([])
  expect(rendered.faceIds.filter((id) => id === 'side')).toHaveLength(16)
  expect(rendered.faceIds.filter((id) => id === 'bottom')).toHaveLength(16)
  expect(rendered.normals.every(Number.isFinite)).toBe(true)

  const detailed = setScenePrimitiveDetail(source, node.id, { around: 24 })
  const changed = detailed.geometries.at(-1)!
  expect(changed.kind === 'cone' ? changed.tessellation : null).toEqual({ around: 24 })
  expect(Object.keys(sceneGeometryMesh(changed).faces)).toHaveLength(48)
  expect(readSceneDocument(sceneToJson(detailed)).status).toBe('valid')
})
