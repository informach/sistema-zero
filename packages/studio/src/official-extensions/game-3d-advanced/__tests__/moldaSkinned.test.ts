import { expect, test } from 'bun:test'
import {
  type AnimationAction,
  type AnimationClip,
  type AnimationMixer,
  type BufferGeometry,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
  type Skeleton,
  SkinnedMesh,
  Vector3,
} from 'three'
import { isValidAssetDataUrl } from '../../../core/project'
import fixture from './fixtures/molda-skinned.json'
import { loadStartedKit } from './kitHarness'

interface Entity {
  mesh: Object3D
  _mixer: AnimationMixer
  _clips: AnimationClip[]
  _action: AnimationAction | null
}
type Kit = Awaited<ReturnType<typeof loadStartedKit>>

async function inGame(run: (kit: Kit) => void | Promise<void>) {
  const win = window as unknown as Record<string, unknown>,
    previous = win.__SZGAME_ASSETS_3D
  win.__SZGAME_ASSETS_3D = {
    comossos: { kind: 'model3d', dataUrl: fixture.dataUrl, fileName: 'comossos.glb' },
  }
  try {
    expect(isValidAssetDataUrl(fixture.dataUrl, 'model3d', 'comossos.glb')).toBe(true)
    const kit = await loadStartedKit((api) => {
      api.defineMold('personagem', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'comossos', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
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

function skins(root: Object3D) {
  const meshes: SkinnedMesh[] = []
  root.traverse((node) => {
    if (node instanceof SkinnedMesh) meshes.push(node)
  })
  return meshes
}

function expectPose(entity: Entity, expected: typeof fixture.rest) {
  const nodes = new Map(
    skins(entity.mesh).map((mesh) => [
      mesh.userData.molda.mirrorId ?? mesh.userData.molda.sourceId,
      mesh,
    ]),
  )
  expect(nodes.size).toBe(expected.length)
  // Observe matrices already updated by the runtime's renderer, never repair a stale frame here.
  const inverse = new Matrix4().copy(entity.mesh.matrixWorld).invert(),
    point = new Vector3()
  for (const part of expected) {
    const mesh = nodes.get(part.id)
    if (!mesh) throw new Error('Peça com pesos ausente')
    const matrix = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld).elements
    for (let i = 0; i < 16; i++) expect(Math.abs(matrix[i]! - part.matrix[i]!)).toBeLessThan(5e-6)
    expect(mesh.geometry.getAttribute('position').count).toBe(part.points.length)
    for (const [vertex, expectedPoint] of part.points.entries()) {
      mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)
      for (const [axis, actual] of point.toArray().entries())
        expect(Math.abs(actual - expectedPoint[axis]!)).toBeLessThan(5e-5)
    }
  }
}

test('native weighted GLB deforms in independent Studio entities with affine bones, hidden helpers, mirrors and local/delta clips', async () => {
  await inGame(({ api, step }) => {
    const first = api.spawn('personagem', 3, 0, 0) as Entity,
      second = api.spawn('personagem', -3, 0, 0) as Entity
    expect(first._mixer).not.toBe(second._mixer)
    const firstSkins = skins(first.mesh),
      secondSkins = skins(second.mesh)
    expect(firstSkins).toHaveLength(3)
    const firstNodes = new Set<Object3D>()
    first.mesh.traverse((node) => firstNodes.add(node))
    for (const [i, mesh] of firstSkins.entries()) {
      expect(mesh.skeleton).not.toBe(secondSkins[i]!.skeleton)
      expect(mesh.geometry).toBe(secondSkins[i]!.geometry)
      expect(mesh.material).toBe(secondSkins[i]!.material)
      for (const bone of mesh.skeleton.bones) expect(firstNodes.has(bone)).toBe(true)
    }
    step(1)
    expectPose(first, fixture.rest)
    expectPose(second, fixture.rest)
    api.playAnim(first, 'Acenar', false)
    step(40)
    expect(first._action!.time).toBe(1)
    expectPose(first, fixture.clips[0]!.end)
    expectPose(second, fixture.rest)
    api.playAnim(second, 'Esticar', false)
    step(40)
    expectPose(first, fixture.clips[0]!.end)
    expectPose(second, fixture.clips[1]!.end)
    api.playAnim(first, 'Esticar', false)
    step(40)
    expectPose(first, fixture.clips[1]!.end)
    api.stopAnim(first)
    step(1)
    expectPose(first, fixture.rest)
    expectPose(second, fixture.clips[1]!.end)
  })
})

test('pause and recycling retain owned skin resources, while teardown releases active and pooled bone textures and mixer bindings exactly once', async () => {
  await inGame(({ api, step }) => {
    const first = api.spawn('personagem', 0, 0, 0) as Entity,
      second = api.spawn('personagem', 4, 0, 0) as Entity,
      skeletons = new Set<Skeleton>(),
      geometries = new Set<BufferGeometry>(),
      materials = new Set<Material>()
    for (const entity of [first, second])
      entity.mesh.traverse((node) => {
        if (!(node instanceof Mesh)) return
        geometries.add(node.geometry)
        for (const material of Array.isArray(node.material) ? node.material : [node.material])
          materials.add(material)
        if (node instanceof SkinnedMesh) skeletons.add(node.skeleton)
      })
    expect(skeletons.size).toBe(6)
    expect(geometries.size).toBe(1)
    expect(materials.size).toBe(1)
    let texturesDisposed = 0,
      geometriesDisposed = 0,
      materialsDisposed = 0
    for (const skeleton of skeletons) {
      // GPU boundary: create the real Three data texture normally allocated on first render.
      skeleton.computeBoneTexture()
      skeleton.boneTexture!.addEventListener('dispose', () => texturesDisposed++)
    }
    for (const geometry of geometries)
      geometry.addEventListener('dispose', () => geometriesDisposed++)
    for (const material of materials)
      material.addEventListener('dispose', () => materialsDisposed++)
    api.playAnim(first, 'Acenar', false)
    step(12)
    const time = first._action!.time
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(api.state()).toBe('pausado')
    step(40)
    expect(first._action!.time).toBe(time)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
    step(40)
    expectPose(first, fixture.clips[0]!.end)
    api.recycle(first)
    const replacement = api.spawn('personagem', 7, 0, 0) as Entity
    expect(replacement).not.toBe(first)
    expect(replacement.mesh).toBe(first.mesh)
    expect(replacement._mixer).toBe(first._mixer)
    for (const mesh of skins(replacement.mesh)) expect(skeletons.has(mesh.skeleton)).toBe(true)
    api.playAnim(first, 'Esticar', false)
    step(1)
    expectPose(replacement, fixture.rest)
    api.playAnim(replacement, 'Esticar', false)
    step(40)
    expectPose(replacement, fixture.clips[1]!.end)
    api.recycle(second) // This skeleton tree is no longer reachable by scene.traverse().
    expect(texturesDisposed).toBe(0)
    expect(geometriesDisposed).toBe(0)
    expect(materialsDisposed).toBe(0)
    window.dispatchEvent(new Event('pagehide'))
    expect(texturesDisposed).toBe(6)
    expect(geometriesDisposed).toBe(1)
    expect(materialsDisposed).toBe(1)
    expect(replacement._mixer.existingAction(replacement._clips[0]!)).toBeNull()
    window.dispatchEvent(new Event('pagehide'))
    expect(texturesDisposed).toBe(6)
    expect(geometriesDisposed).toBe(1)
    expect(materialsDisposed).toBe(1)
  })
})

test('rebuilding the project frees pooled skeleton textures and old mixer actions without releasing cached geometry or material', async () => {
  await inGame(({ api, step }) => {
    api.runProject(() =>
      api.defineMold('personagem', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'comossos', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      }),
    )
    const first = api.spawn('personagem', 0, 0, 0) as Entity,
      skeletons = new Set(skins(first.mesh).map((mesh) => mesh.skeleton)),
      geometry = skins(first.mesh)[0]!.geometry,
      material = skins(first.mesh)[0]!.material
    if (Array.isArray(material)) throw new Error('Single material expected')
    let texturesDisposed = 0,
      geometriesDisposed = 0,
      materialsDisposed = 0
    for (const skeleton of skeletons) {
      skeleton.computeBoneTexture()
      skeleton.boneTexture!.addEventListener('dispose', () => texturesDisposed++)
    }
    geometry.addEventListener('dispose', () => geometriesDisposed++)
    material.addEventListener('dispose', () => materialsDisposed++)
    api.playAnim(first, 'Acenar', false)
    step(40)
    api.recycle(first)
    api.setState('fim')
    api.setState('jogando')
    expect(texturesDisposed).toBe(3)
    expect(first._mixer.existingAction(first._clips[0]!)).toBeNull()
    expect(geometriesDisposed).toBe(0)
    expect(materialsDisposed).toBe(0)
    const replacement = api.spawn('personagem', 5, 0, 0) as Entity
    for (const mesh of skins(replacement.mesh)) {
      expect(skeletons.has(mesh.skeleton)).toBe(false)
      expect(mesh.geometry).toBe(geometry)
      expect(mesh.material).toBe(material)
    }
    api.playAnim(first, 'Esticar', false)
    step(1)
    expectPose(replacement, fixture.rest)
    api.playAnim(replacement, 'Esticar', false)
    step(40)
    expectPose(replacement, fixture.clips[1]!.end)
    window.dispatchEvent(new Event('pagehide'))
    expect(texturesDisposed).toBe(3)
    expect(geometriesDisposed).toBe(1)
    expect(materialsDisposed).toBe(1)
  })
})
