import { expect, test } from 'bun:test'
import {
  type AnimationAction,
  type AnimationMixer,
  type BufferGeometry,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
} from 'three'
import { isValidAssetDataUrl } from '../../../core/project'
import fixture from './fixtures/molda-articulated.json'
import { loadStartedKit } from './kitHarness'

interface Entity {
  mesh: Object3D
  _mixer: AnimationMixer
  _action: AnimationAction | null
}
type Kit = Awaited<ReturnType<typeof loadStartedKit>>

/** Real runtime, GLTFLoader, SkeletonUtils and AnimationMixer; only the GPU is a boundary stub. */
async function inGame(run: (kit: Kit) => void | Promise<void>) {
  const win = window as unknown as Record<string, unknown>
  const previous = win.__SZGAME_ASSETS_3D
  win.__SZGAME_ASSETS_3D = {
    articulado: { kind: 'model3d', dataUrl: fixture.dataUrl, fileName: 'articulado.glb' },
  }
  try {
    expect(isValidAssetDataUrl(fixture.dataUrl, 'model3d', 'articulado.glb')).toBe(true)
    const kit = await loadStartedKit((api) => {
      api.defineMold('personagem', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'articulado', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    kit.api.setState('jogando')
    await run(kit)
  } finally {
    window.dispatchEvent(new Event('pagehide'))
    if (previous === undefined) delete win.__SZGAME_ASSETS_3D
    else win.__SZGAME_ASSETS_3D = previous
  }
}

function expectPose(entity: Entity, expected: typeof fixture.rest) {
  const nodes = new Map<string, Object3D>()
  entity.mesh.traverse((node) => {
    if (!(node instanceof Mesh) || node.userData.molda?.role !== 'node') return
    nodes.set(node.userData.molda.mirrorId ?? node.userData.molda.sourceId, node)
  })
  expect(nodes.size).toBe(expected.length)
  // Use matrices already updated by the renderer: forcing an update here could hide a frozen transform bug.
  const inverse = new Matrix4().copy(entity.mesh.matrixWorld).invert()
  for (const pose of expected) {
    const node = nodes.get(pose.id)
    expect(node !== undefined).toBe(true)
    if (!node) throw new Error('Peça exportada ausente')
    const actual = new Matrix4().multiplyMatrices(inverse, node.matrixWorld).elements
    for (let i = 0; i < 16; i++) expect(Math.abs(actual[i]! - pose.matrix[i]!)).toBeLessThan(5e-6)
  }
}

test('Molda hierarchy, affine groups, mirrors and two local/delta clips keep native poses in independent Studio instances', async () => {
  await inGame(({ api, step }) => {
    const first = api.spawn('personagem', 3, 0, 0) as Entity
    const second = api.spawn('personagem', -3, 0, 0) as Entity
    expect(first._mixer === second._mixer).toBe(false)
    step(1)
    expectPose(first, fixture.rest)
    expectPose(second, fixture.rest)
    api.playAnim(first, 'Saltar', false)
    step(40)
    expect(first._action?.time).toBe(1)
    expectPose(first, fixture.clips[0]!.end)
    expectPose(second, fixture.rest)
    api.playAnim(second, 'Posar', false)
    step(40)
    expectPose(first, fixture.clips[0]!.end)
    expectPose(second, fixture.clips[1]!.end)
    // Switch channel spaces: a faded-out delta action must not contaminate a local pose.
    api.playAnim(first, 'Posar', false)
    step(40)
    expectPose(first, fixture.clips[1]!.end)
    expectPose(second, fixture.clips[1]!.end)
    api.stopAnim(first)
    step(1)
    expectPose(first, fixture.rest)
    expectPose(second, fixture.clips[1]!.end)
  })
})

test('pause, recycling, stale handles and teardown preserve the other native character and release shared resources once', async () => {
  await inGame(({ api, step }) => {
    const first = api.spawn('personagem', 0, 0, 0) as Entity
    const second = api.spawn('personagem', 4, 0, 0) as Entity
    const geometries = new Set<BufferGeometry>(),
      materials = new Set<Material>()
    for (const entity of [first, second])
      entity.mesh.traverse((node) => {
        if (!(node instanceof Mesh)) return
        geometries.add(node.geometry)
        for (const material of Array.isArray(node.material) ? node.material : [node.material])
          materials.add(material)
      })
    expect(geometries.size).toBe(1)
    expect(materials.size).toBe(1)
    let disposedGeometries = 0,
      disposedMaterials = 0
    for (const geometry of geometries)
      geometry.addEventListener('dispose', () => disposedGeometries++)
    for (const material of materials)
      material.addEventListener('dispose', () => disposedMaterials++)
    api.playAnim(first, 'Saltar', false)
    step(12)
    const time = first._action!.time
    expect(time).toBeGreaterThan(0)
    expect(time).toBeLessThan(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(api.state()).toBe('pausado')
    step(40)
    expect(first._action!.time).toBe(time)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(api.state()).toBe('jogando')
    step(40)
    expectPose(first, fixture.clips[0]!.end)
    expectPose(second, fixture.rest)
    api.recycle(first)
    const replacement = api.spawn('personagem', 7, 0, 0) as Entity
    expect(replacement === first).toBe(false)
    expect(replacement.mesh === first.mesh).toBe(true)
    expect(replacement._mixer === first._mixer).toBe(true)
    api.playAnim(first, 'Posar', false)
    step(1)
    expectPose(replacement, fixture.rest)
    api.playAnim(replacement, 'Posar', false)
    step(40)
    expectPose(replacement, fixture.clips[1]!.end)
    expectPose(second, fixture.rest)
    expect(disposedGeometries).toBe(0)
    expect(disposedMaterials).toBe(0)
    window.dispatchEvent(new Event('pagehide'))
    expect(disposedGeometries).toBe(1)
    expect(disposedMaterials).toBe(1)
    window.dispatchEvent(new Event('pagehide'))
    expect(disposedGeometries).toBe(1)
    expect(disposedMaterials).toBe(1)
  })
})
