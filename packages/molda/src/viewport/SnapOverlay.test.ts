import { describe, expect, test } from 'bun:test'
import { PerspectiveCamera, Vector2, Vector3 } from 'three'
import { createModelAsset, createPart } from '../core/model'
import { snapSourceAnchors, snapTargetAnchors } from '../model/snap'
import { SnapOverlay } from './SnapOverlay'

describe('SnapOverlay', () => {
  test('escolhe âncoras pelo raio em pixels e só calcula o alvo indicado', () => {
    const source = createPart({
      id: 'source',
      name: 'source',
      from: [-1, 0, 0],
      to: [1, 2, 2],
      color: 2,
    })
    const target = createPart({
      id: 'target',
      name: 'target',
      from: [3, 0, 0],
      to: [5, 2, 2],
      color: 2,
    })
    const model = { ...createModelAsset({ name: 'snap', starter: false }), parts: [source, target] }
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 2, 12)
    camera.lookAt(0, 1, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    const overlay = new SnapOverlay()

    overlay.setState(model, { phase: 'source', primaryId: 'source', movingIds: ['source'] })
    const wantedSource = snapSourceAnchors(model, 'source', ['source']).find(
      (anchor) => anchor.ref.kind === 'vertex',
    )
    if (!wantedSource) throw new Error('sem origem')
    const projectedSource = new Vector3(...wantedSource.point).project(camera)
    expect(
      overlay.pickSource(new Vector2(projectedSource.x, projectedSource.y), camera, 800, 800, 10)
        ?.ref,
    ).toEqual(wantedSource.ref)

    overlay.setState(model, {
      phase: 'target',
      primaryId: 'source',
      movingIds: ['source'],
      source: wantedSource,
    })
    const wantedTarget = snapTargetAnchors(model, 'target', ['source']).find(
      (anchor) => anchor.ref.kind === 'vertex',
    )
    if (!wantedTarget) throw new Error('sem destino')
    const projectedTarget = new Vector3(...wantedTarget.point).project(camera)
    const pointer = new Vector2(projectedTarget.x, projectedTarget.y)
    expect(overlay.pickTarget(pointer, camera, 800, 800, 22)).toBeNull()
    overlay.setTargetPart('target')
    expect(overlay.pickTarget(pointer, camera, 800, 800, 22)?.ref).toEqual(wantedTarget.ref)

    overlay.dispose()
  })
})
