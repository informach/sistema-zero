import { describe, expect, test } from 'bun:test'
import { OrthographicCamera, PerspectiveCamera } from 'three'
import { createModelAsset, createPart } from '../core/model'
import { addSceneLocator, addSceneMirror, setSceneNodeFlag } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import type { SceneSelectionRegion } from '../scene/regionSelection'
import { pickSceneRegion } from './sceneRegionPicking'
import { SceneRenderResource } from './sceneRenderResource'

describe('scene region picking', () => {
  test('a region around a procedural mirror selects its source exactly once', () => {
    const source = migrateLegacyModel(createModelAsset({ name: 'mirrored' })).document
    const id = source.nodes[0]?.id
    if (!id) throw new Error('Missing source')
    const mirrored = addSceneMirror(source, id, { axis: 'x', offset: 2 })
    const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    camera.position.set(0, 1, 10)
    camera.lookAt(0, 1, 0)
    const resource = new SceneRenderResource()
    resource.update(mirrored)
    try {
      expect(
        pickSceneRegion(
          indexSceneDocument(mirrored),
          resource,
          camera,
          { kind: 'box', from: [0.85, 0.4], to: [0.95, 0.6] },
          false,
        ),
      ).toEqual([id])
      expect(
        pickSceneRegion(
          indexSceneDocument(mirrored),
          resource,
          camera,
          { kind: 'box', from: [0, 0], to: [1, 1] },
          true,
        ),
      ).toEqual([id])
    } finally {
      resource.dispose()
    }
  })
  test('front and through selection respect depth, hidden/locked nodes and isolation in both projections', () => {
    const legacy = createModelAsset({ name: 'selection', starter: false })
    legacy.parts = [
      createPart({ id: 'front', name: 'Frente', from: [-1, 0, 1], to: [1, 2, 3], color: 8 }),
      createPart({ id: 'back', name: 'Atrás', from: [-1, 0, -3], to: [1, 2, -1], color: 8 }),
    ]
    const source = migrateLegacyModel(legacy).document
    const resource = new SceneRenderResource()
    const region: SceneSelectionRegion = { kind: 'box', from: [0.3, 0.3], to: [0.7, 0.7] }
    try {
      resource.update(source)
      for (const camera of [
        new OrthographicCamera(-5, 5, 5, -5, 0.1, 100),
        new PerspectiveCamera(45, 1, 0.1, 100),
      ]) {
        camera.position.set(0, 1, 10)
        camera.lookAt(0, 1, 0)
        const index = indexSceneDocument(source)
        expect(pickSceneRegion(index, resource, camera, region, false)).toEqual(['front'])
        expect(pickSceneRegion(index, resource, camera, region, true)).toEqual(['front', 'back'])
        expect(pickSceneRegion(index, resource, camera, region, true, new Set(['back']))).toEqual([
          'back',
        ])
        const hidden = setSceneNodeFlag(source, ['front'], 'hidden', true)
        resource.update(hidden)
        expect(
          pickSceneRegion(indexSceneDocument(hidden), resource, camera, region, false),
        ).toEqual(['back'])
        const locked = setSceneNodeFlag(source, ['front'], 'locked', true)
        resource.update(locked)
        expect(
          pickSceneRegion(indexSceneDocument(locked), resource, camera, region, false),
        ).toEqual([])
        expect(pickSceneRegion(indexSceneDocument(locked), resource, camera, region, true)).toEqual(
          ['back'],
        )
        resource.update(source)
      }
      expect(source.nodes.every((node) => !node.hidden && !node.locked)).toBe(true)
    } finally {
      resource.dispose()
    }
  })
  test('a locator behind the camera is excluded', () => {
    const source = addSceneLocator(
      migrateLegacyModel(createModelAsset({ name: 'empty', starter: false })).document,
      'Ponto',
      () => 'point',
    )
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0, -10)
    camera.lookAt(0, 0, -20)
    const resource = new SceneRenderResource()
    resource.update(source)
    try {
      expect(
        pickSceneRegion(
          indexSceneDocument(source),
          resource,
          camera,
          { kind: 'box', from: [0, 0], to: [1, 1] },
          true,
        ),
      ).toEqual([])
    } finally {
      resource.dispose()
    }
  })
})
