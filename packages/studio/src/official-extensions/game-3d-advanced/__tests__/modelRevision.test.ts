import { expect, test } from 'bun:test'
import {
  type AnimationClip,
  type AnimationMixer,
  type BufferGeometry,
  Mesh,
  type MeshStandardMaterial,
  type Object3D,
  SkinnedMesh,
} from 'three'
import fixture from './fixtures/molda-skinned.json'
import { type KitApi, loadStartedKit } from './kitHarness'

type Entity = { mesh: Object3D; _mixer: AnimationMixer | null; _clips: AnimationClip[] | null }

function definePart(api: KitApi, shape: string, color = '#ff0000') {
  api.defineMold('personagem', { health: 1, speed: 0 }, () => {
    api.part({ shape, model: 'comossos', color, w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
  })
}

function visibleMeshes(entity: Entity) {
  const result: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
  entity.mesh.traverse((node) => {
    if (node instanceof Mesh) result.push(node)
  })
  return result
}

async function inGame(
  run: (kit: Awaited<ReturnType<typeof loadStartedKit>>) => void | Promise<void>,
  shape = 'box',
) {
  const win = window as unknown as Record<string, unknown>,
    previous = win.__SZGAME_ASSETS_3D
  win.__SZGAME_ASSETS_3D = {
    comossos: { kind: 'model3d', dataUrl: fixture.dataUrl, fileName: 'comossos.glb' },
  }
  try {
    const kit = await loadStartedKit((api) => definePart(api, shape))
    kit.api.setState('jogando')
    await run(kit)
  } finally {
    window.dispatchEvent(new Event('pagehide'))
    if (previous === undefined) delete win.__SZGAME_ASSETS_3D
    else win.__SZGAME_ASSETS_3D = previous
  }
}

test('redefining a recipe never reuses its old pooled shape and retains old materials until the last live owner leaves', async () => {
  await inGame(({ api }) => {
    const live = api.spawn('personagem', 0, 0, 0) as Entity,
      pooled = api.spawn('personagem', 3, 0, 0) as Entity,
      original = visibleMeshes(live)[0]!
    let oldMaterialDisposals = 0
    original.material.addEventListener('dispose', () => oldMaterialDisposals++)
    api.recycle(pooled)
    definePart(api, 'sphere', '#0000ff')
    expect(oldMaterialDisposals).toBe(0)
    expect(api.exists(live)).toBe(true)
    const next = api.spawn('personagem', 6, 0, 0) as Entity,
      replacement = visibleMeshes(next)[0]!
    expect(next.mesh === pooled.mesh).toBe(false)
    expect(replacement.geometry.type).toBe('SphereGeometry')
    expect(replacement.material.color.getHexString()).toBe('0000ff')
    expect(original.geometry.type).toBe('BoxGeometry')
    expect(original.material.color.getHexString()).toBe('ff0000')
    api.recycle(live)
    expect(oldMaterialDisposals).toBe(1)
    api.recycle(next)
    expect((api.spawn('personagem', 8, 0, 0) as Entity).mesh === next.mesh).toBe(true)
    window.dispatchEvent(new Event('pagehide'))
    expect(oldMaterialDisposals).toBe(1)
  })
})

test('an obsolete pooled skin is released immediately while a living old skin stays animated until recycled', async () => {
  await inGame(({ api, step }) => {
    const live = api.spawn('personagem', 0, 0, 0) as Entity,
      pooled = api.spawn('personagem', 3, 0, 0) as Entity
    let liveTexturesDisposed = 0,
      pooledTexturesDisposed = 0
    for (const entity of [live, pooled])
      for (const mesh of visibleMeshes(entity)) {
        if (!(mesh instanceof SkinnedMesh)) throw new Error('Skin esperada')
        mesh.skeleton.computeBoneTexture()
        mesh.skeleton.boneTexture!.addEventListener('dispose', () => {
          if (entity === live) liveTexturesDisposed++
          else pooledTexturesDisposed++
        })
      }
    api.playAnim(live, 'Acenar', false)
    api.playAnim(pooled, 'Esticar', false)
    step(5)
    api.recycle(pooled)
    definePart(api, 'box')
    expect(pooledTexturesDisposed).toBe(3)
    expect(liveTexturesDisposed).toBe(0)
    expect(pooled._mixer!.existingAction(pooled._clips![1]!) === null).toBe(true)
    const next = api.spawn('personagem', 6, 0, 0) as Entity
    expect(visibleMeshes(next)).toHaveLength(1)
    expect(visibleMeshes(next)[0] instanceof SkinnedMesh).toBe(false)
    expect(next._mixer === null).toBe(true)
    const time = live._mixer!.time
    step(5)
    expect(live._mixer!.time).toBeGreaterThan(time)
    api.recycle(live)
    expect(liveTexturesDisposed).toBe(3)
    expect(live._mixer!.existingAction(live._clips![0]!) === null).toBe(true)
    window.dispatchEvent(new Event('pagehide'))
    expect(pooledTexturesDisposed).toBe(3)
    expect(liveTexturesDisposed).toBe(3)
  }, 'modelo')
})

test('nested iteration discards retired resources only after their final live owner is recycled', async () => {
  await inGame(({ api }) => {
    const first = api.spawn('personagem', 0, 0, 0) as Entity
    api.spawn('personagem', 3, 0, 0)
    const material = visibleMeshes(first)[0]!.material
    let disposals = 0
    material.addEventListener('dispose', () => disposals++)
    let retired = false
    const countsDuringTraversal: number[] = []
    api.forEachAlive('personagem', (entity) => {
      if (!retired) {
        definePart(api, 'sphere')
        retired = true
      }
      api.recycle(entity)
      countsDuringTraversal.push(disposals)
    })
    expect(countsDuringTraversal).toEqual([0, 0]) // Release happens after the traversal.
    expect(disposals).toBe(1)
    expect(visibleMeshes(api.spawn('personagem', 0, 0, 0) as Entity)[0]!.geometry.type).toBe(
      'SphereGeometry',
    )
  })
})

test('teardown releases a shared unit geometry only once with both current and retired recipe instances alive', async () => {
  await inGame(({ api }) => {
    const first = api.spawn('personagem', 0, 0, 0) as Entity,
      geometry = visibleMeshes(first)[0]!.geometry,
      oldMaterial = visibleMeshes(first)[0]!.material
    let geometryDisposals = 0,
      oldMaterialDisposals = 0,
      newMaterialDisposals = 0
    geometry.addEventListener('dispose', () => geometryDisposals++)
    oldMaterial.addEventListener('dispose', () => oldMaterialDisposals++)
    definePart(api, 'box', '#0000ff')
    const second = api.spawn('personagem', 3, 0, 0) as Entity,
      replacement = visibleMeshes(second)[0]!
    expect(replacement.geometry === geometry).toBe(true)
    replacement.material.addEventListener('dispose', () => newMaterialDisposals++)
    expect(oldMaterialDisposals).toBe(0)
    window.dispatchEvent(new Event('pagehide'))
    expect(geometryDisposals).toBe(1)
    expect(oldMaterialDisposals).toBe(1)
    expect(newMaterialDisposals).toBe(1)
  })
})
