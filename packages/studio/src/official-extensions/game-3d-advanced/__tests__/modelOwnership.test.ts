import { expect, test } from 'bun:test'
import {
  type AnimationMixer,
  type BufferGeometry,
  type Material,
  Mesh,
  type Object3D,
  SkinnedMesh,
} from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import fixture from './fixtures/molda-skinned.json'
import { type KitApi, makeFakeThree, runtimeBody } from './kitHarness'

type Entity = { mesh: Object3D; _mixer: AnimationMixer | null }

function defineModel(api: KitApi, name = 'personagem') {
  api.defineMold(name, { health: 1, speed: 0 }, () => {
    api.part({ shape: 'modelo', model: 'comossos', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
  })
}

/** Only the addon-loading and GPU boundaries are controlled; GLTFLoader/Three stay real. */
async function withBoundary(
  loadSkeletons: () => Promise<unknown>,
  run: (api: KitApi, start: () => Promise<void>, warnings: string[]) => Promise<void>,
  warm?: (root: Object3D) => void,
) {
  const win = window as unknown as Record<string, unknown>,
    previous = win.__SZGAME_ASSETS_3D,
    originalWarn = console.warn,
    warnings: string[] = [],
    { THREE, renderers } = makeFakeThree()
  win.__SZGAME_ASSETS_3D = {
    comossos: { kind: 'model3d', dataUrl: fixture.dataUrl, fileName: 'comossos.glb' },
  }
  console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
  try {
    if (warm) {
      const Renderer = THREE.WebGLRenderer
      function WarmRenderer(this: unknown) {
        return Object.assign(new Renderer(), { compile: warm })
      }
      THREE.WebGLRenderer = WarmRenderer as unknown as typeof Renderer
    }
    const moduleRequest = "import('three/addons/utils/SkeletonUtils.js')"
    expect(runtimeBody.split(moduleRequest)).toHaveLength(2)
    new Function(
      'THREE',
      'window',
      'loadSkeletons',
      runtimeBody.replace(moduleRequest, 'loadSkeletons()'),
    )(THREE, win, loadSkeletons)
    const api = win.SZGameKit3D as KitApi
    api.setup({ width: 640, height: 360, world: 100 })
    await run(
      api,
      async () => {
        api.start()
        for (let i = 0; i < 60 && !renderers[0]?.loop; i++)
          await new Promise((resolve) => setTimeout(resolve, 5))
        if (!renderers[0]?.loop) throw new Error(`Runtime sem renderizador: ${warnings.join('; ')}`)
        expect(renderers[0]?.loop).toBeFunction()
        api.setState('jogando')
      },
      warnings,
    )
  } finally {
    window.dispatchEvent(new Event('pagehide'))
    console.warn = originalWarn
    if (previous === undefined) delete win.__SZGAME_ASSETS_3D
    else win.__SZGAME_ASSETS_3D = previous
  }
}

for (const failure of ['import', 'clone'] as const)
  test(`a ${failure} failure keeps a visible reserve piece without sharing bones or advertising unavailable clips`, async () => {
    await withBoundary(
      async () => {
        if (failure === 'import') throw new Error('Addon indisponível')
        return {
          clone() {
            throw new Error('Clonagem indisponível')
          },
        }
      },
      async (api, start, warnings) => {
        defineModel(api)
        await start()
        const entity = api.spawn('personagem', 0, 0, 0) as Entity
        expect(entity).not.toBeNull()
        let meshes = 0
        entity.mesh.traverse((node) => {
          expect(node instanceof SkinnedMesh).toBe(false)
          if ('isMesh' in node && node.isMesh) meshes++
        })
        expect(meshes).toBe(1)
        expect(entity._mixer === null).toBe(true)
        api.playAnim(entity, 'Acenar', false)
        expect(api.exists(entity)).toBe(true)
        expect(warnings.filter((warning) => warning.includes('preparar o modelo'))).toHaveLength(1)
      },
    )
  })

function allocatedResources() {
  const textures = new Map<object, number>(),
    geometries = new Map<BufferGeometry, number>(),
    materials = new Map<Material, number>()
  function observe(root: Object3D) {
    root.traverse((node) => {
      if (!(node instanceof SkinnedMesh)) return
      const skeleton = node.skeleton
      if (!skeleton.boneTexture) skeleton.computeBoneTexture()
      const texture = skeleton.boneTexture!
      if (!textures.has(texture)) {
        textures.set(texture, 0)
        texture.addEventListener('dispose', () => textures.set(texture, textures.get(texture)! + 1))
      }
      if (!geometries.has(node.geometry)) {
        const geometry = node.geometry
        geometries.set(geometry, 0)
        geometry.addEventListener('dispose', () =>
          geometries.set(geometry, geometries.get(geometry)! + 1),
        )
      }
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (materials.has(material)) continue
        materials.set(material, 0)
        material.addEventListener('dispose', () =>
          materials.set(material, materials.get(material)! + 1),
        )
      }
    })
  }
  return {
    textures,
    geometries,
    materials,
    observe,
    clone(root: Object3D) {
      const copy = SkeletonUtils.clone(root)
      observe(copy) // Allocate the real bone data texture at the simulated GPU boundary.
      return copy
    },
  }
}

test('cache, replaced templates and entity skeletons have separate lifetimes with shared geometry/material released once', async () => {
  const resources = allocatedResources()
  await withBoundary(
    async () => ({ clone: resources.clone }),
    async (api, start) => {
      defineModel(api)
      defineModel(api, 'amigo')
      await start()
      const first = api.spawn('personagem', 0, 0, 0) as Entity,
        second = api.spawn('amigo', 4, 0, 0) as Entity
      api.playAnim(first, 'Acenar', false)
      api.playAnim(second, 'Esticar', false)
      expect(resources.textures.size).toBe(15) // Cache + two templates + two entities, three skins each.
      defineModel(api)
      expect(resources.textures.size).toBe(18)
      expect([...resources.textures.values()].filter((count) => count === 1)).toHaveLength(3)
      expect([...resources.geometries.values()]).toEqual([0])
      expect([...resources.materials.values()]).toEqual([0])
      expect(api.exists(first)).toBe(true)
      api.recycle(second)
      window.dispatchEvent(new Event('pagehide'))
      expect([...resources.textures.values()]).toEqual(Array(18).fill(1))
      expect([...resources.geometries.values()]).toEqual([1])
      expect([...resources.materials.values()]).toEqual([1])
    },
    resources.observe,
  )
})

test('a late load cannot install an orphan skeleton tree into a replaced template', async () => {
  const resources = allocatedResources()
  let resolve!: (module: unknown) => void
  const addon = new Promise((done) => {
    resolve = done
  })
  await withBoundary(
    () => addon,
    async (api, start) => {
      defineModel(api)
      api.defineMold('personagem', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'box', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
      resolve({ clone: resources.clone })
      await start()
      expect(api.spawn('personagem', 0, 0, 0)).not.toBeNull()
      window.dispatchEvent(new Event('pagehide'))
      // Includes the parsed/warmed cache even though no current template uses it.
      expect(resources.textures.size).toBe(3)
      expect([...resources.textures.values()]).toEqual([1, 1, 1])
      expect([...resources.geometries.values()]).toEqual([1])
      expect([...resources.materials.values()]).toEqual([1])
    },
    resources.observe,
  )
})

test('a reserve born and pooled during loading cannot receive the completed model clips without its geometry', async () => {
  const resources = allocatedResources()
  let resolveAddon!: (module: unknown) => void, resolveClone!: () => void
  const addon = new Promise((resolve) => {
      resolveAddon = resolve
    }),
    installed = new Promise<void>((resolve) => {
      resolveClone = resolve
    })
  await withBoundary(
    () => addon,
    async (api, start) => {
      await start()
      defineModel(api)
      const reserve = api.spawn('personagem', 0, 0, 0) as Entity
      expect(reserve._mixer === null).toBe(true)
      const reservePart = reserve.mesh.children[0]!.children[0]!
      if (!(reservePart instanceof Mesh)) throw new Error('Peça de reserva esperada')
      const material = reservePart.material
      if (Array.isArray(material)) throw new Error('Material único esperado')
      let materialDisposals = 0
      material.addEventListener('dispose', () => materialDisposals++)
      api.recycle(reserve)
      resolveAddon({
        clone(root: Object3D) {
          const result = resources.clone(root)
          resolveClone()
          return result
        },
      })
      await installed
      const current = api.spawn('personagem', 4, 0, 0) as Entity
      expect(current.mesh === reserve.mesh).toBe(false)
      let skins = 0
      current.mesh.traverse((node) => {
        if (node instanceof SkinnedMesh) skins++
      })
      expect(skins).toBe(3)
      expect(current._mixer !== null).toBe(true)
      api.playAnim(current, 'Acenar', false)
      api.playAnim(reserve, 'Esticar', false)
      expect(api.exists(reserve)).toBe(false)
      window.dispatchEvent(new Event('pagehide'))
      expect(materialDisposals).toBe(1) // The replaced reserve material remains owned by its recipe.
      expect([...resources.textures.values()]).toEqual(Array(resources.textures.size).fill(1))
    },
    resources.observe,
  )
})

test('twenty recipe replacements release every retired skeleton while reusing only cached geometry and material', async () => {
  const resources = allocatedResources()
  await withBoundary(
    async () => ({ clone: resources.clone }),
    async (api, start) => {
      defineModel(api)
      await start()
      for (let i = 0; i < 20; i++) {
        const current = api.spawn('personagem', 0, 0, 0) as Entity
        api.playAnim(current, 'Acenar', false)
        api.recycle(current)
        defineModel(api)
        expect([...resources.textures.values()].filter((count) => count === 0)).toHaveLength(6)
        expect([...resources.textures.values()].every((count) => count === 0 || count === 1)).toBe(
          true,
        )
        expect([...resources.geometries.values()]).toEqual([0])
        expect([...resources.materials.values()]).toEqual([0])
      }
      window.dispatchEvent(new Event('pagehide'))
      expect(resources.textures.size).toBe(126) // One cache + 21 templates + 20 entities, three skins each.
      expect([...resources.textures.values()]).toEqual(Array(126).fill(1))
      expect([...resources.geometries.values()]).toEqual([1])
      expect([...resources.materials.values()]).toEqual([1])
    },
    resources.observe,
  )
})
