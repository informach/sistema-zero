import { afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import * as RealTHREE from 'three'
import { makeHdrDataUrl } from '../../__tests__/three3d/assetFixtures'
import flipbookFixture from '../../__tests__/three3d/molda-flipbook.json'
import skinFixture from '../../__tests__/three3d/molda-skinned.json'
import { loadStartedWorld, pressKey, releaseKey, type WorldApi } from './kitHarness'

/**
 * Lote 10 do review 3D (10/2026): o Molda no Mundo 3D, com a fixture REAL do Molda (boneco de
 * 6 ossos, clipes "Acenar" e "Esticar") e o GLTFLoader/SkeletonUtils de verdade.
 *
 * - "Pôr o modelo": tamanho = lado maior em metros, pé no chão sobre o heightAt, clipe tocando;
 *   teto de 24 animados.
 * - "Espalhar" avisa que o modelo animado fica parado.
 * - Personagem, amigo e carro com o modelo; "No … quando estiver …" troca o clipe.
 * - Céu 360°: as luzes pegam as cores do céu (os materiais toon não refletem o environment).
 * - Descarte de mixer e ossos no disposeAll e no recomeçar.
 */

interface Molda {
  person(color: string, hat: string): void
  personPlace(x: number, z: number, deg: number): void
  npc(name: string, x: number, z: number, color: string, hat: string): void
  car(options: { style: string; color: string }): void
  placeModel(name: string, x: number, z: number, size: number, deg: number, clip?: string): void
  scatterModel(n: number, name: string, s: number): void
  personModel(name: string, height: number): void
  npcModel(name: string, npc: string, height: number): void
  carModel(name: string, length: number): void
  modelAnim(who: string, name: string, state: string, clip: string): void
  restart(): void
}
type Api = WorldApi & Molda

const assets = () => window as unknown as Record<string, unknown>

beforeAll(async () => {
  // O carregador pede os dois addons juntos; já em memória, o parse começa na hora.
  await import('three/addons/loaders/GLTFLoader.js')
  await import('three/addons/utils/SkeletonUtils.js')
  await import('three/addons/loaders/HDRLoader.js')
})

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
  releaseKey('w', 'KeyW')
  delete assets().__SZGAME_ASSETS_3D
})

function withModels(extra: Record<string, unknown> = {}) {
  assets().__SZGAME_ASSETS_3D = {
    boneco: { kind: 'model3d', fileName: 'boneco.glb', dataUrl: skinFixture.dataUrl },
    ...extra,
  }
}

/** Registra os clipes pedidos ao mixer (o animador do carregador compartilhado). */
function clipRecorder() {
  const asked: string[] = []
  class RecordingMixer extends RealTHREE.AnimationMixer {
    constructor(root: RealTHREE.Object3D) {
      super(root)
      const original = this.clipAction.bind(this)
      this.clipAction = ((clip: RealTHREE.AnimationClip, ...rest: unknown[]) => {
        asked.push(typeof clip === 'string' ? clip : clip.name)
        return (original as (...args: unknown[]) => RealTHREE.AnimationAction)(clip, ...rest)
      }) as typeof this.clipAction
    }
  }
  return { asked, overrides: { AnimationMixer: RecordingMixer } }
}

function skinnedIn(root: RealTHREE.Object3D | null | undefined): RealTHREE.SkinnedMesh[] {
  const out: RealTHREE.SkinnedMesh[] = []
  root?.traverse((o) => {
    if ((o as RealTHREE.SkinnedMesh).isSkinnedMesh) out.push(o as RealTHREE.SkinnedMesh)
  })
  return out
}

/** O filho DIRETO da cena que contém o objeto (o grupo do personagem, do amigo, do carro). */
function sceneChild(scene: RealTHREE.Scene, object: RealTHREE.Object3D): RealTHREE.Object3D {
  let node = object
  while (node.parent && node.parent !== scene) node = node.parent
  return node
}

/** O "suporte" de topo (filho direto da cena ou do grupo da natureza) de um objeto. */
function topHolder(scene: RealTHREE.Scene, object: RealTHREE.Object3D): RealTHREE.Object3D {
  let node = object
  while (node.parent && node.parent !== scene && node.parent.parent !== scene) node = node.parent
  return node
}

describe('Mundo 3D — Molda (lote 10)', () => {
  it('"Pôr o modelo": lado maior em metros, pé no chão do heightAt e o clipe tocando', async () => {
    withModels()
    const { asked, overrides } = clipRecorder()
    const {
      api: a,
      renderers,
      step,
    } = await loadStartedWorld((w) => {
      const api = w as Api
      api.terrain(6, 4)
      api.placeModel('boneco', 18, -12, 3, 0, 'Acenar')
      api.placeModel('boneco', -18, 12, 2, 90)
    }, overrides)
    const api = a as Api
    const scene = renderers[0]?.scene
    if (!scene) throw new Error('sem cena')
    const skinned = skinnedIn(scene)
    expect(skinned.length).toBe(6)
    const holders = [...new Set(skinned.map((mesh) => topHolder(scene, mesh)))]
    expect(holders.length).toBe(2)
    scene.updateMatrixWorld(true)
    const moving = holders.find((h) => Math.abs(h.position.x - 18) < 0.01)
    if (!moving) throw new Error('modelo posto não achado')
    expect(moving.position.y).toBeCloseTo(api.groundHeight(18, -12), 4)
    const box = new RealTHREE.Box3().setFromObject(moving)
    const size = box.getSize(new RealTHREE.Vector3())
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(3, 0)
    expect(box.min.y).toBeCloseTo(api.groundHeight(18, -12), 0)
    // O clipe pedido toca: os ossos do modelo animado mudam com o tempo.
    expect(asked).toContain('Acenar')
    const bone = skinnedIn(moving)[0]?.skeleton.bones[1]
    const before = bone?.quaternion.clone()
    step(10)
    expect(bone?.quaternion.equals(before as RealTHREE.Quaternion)).toBe(false)
  })

  it('teto de 24 modelos se mexendo e aviso ao espalhar um modelo animado', async () => {
    withModels()
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await loadStartedWorld((w) => {
        const api = w as Api
        for (let i = 0; i < 26; i++)
          api.placeModel('boneco', (i % 6) * 6 - 15, Math.floor(i / 6) * 6 - 15, 1, 0, 'Acenar')
        api.scatterModel(4, 'boneco', 1)
      })
      const text = warn.mock.calls.map((call) => String(call[0])).join('\n')
      expect(text).toContain('teto 24')
      expect(text).toContain('Espalhar deixa o modelo "boneco" parado; para mexer, use Pôr')
    } finally {
      warn.mockRestore()
    }
  })

  it('personagem com o modelo: troca o boneco, mantém a física e troca o clipe parado/andando', async () => {
    withModels()
    const { asked, overrides } = clipRecorder()
    const {
      api: a,
      renderers,
      step,
    } = await loadStartedWorld((w) => {
      const api = w as Api
      api.person('#3b82f6', 'nenhum')
      api.personModel('boneco', 1.7)
      api.modelAnim('personagem', '', 'parado', 'Acenar')
      api.modelAnim('personagem', '', 'andando', 'Esticar')
    }, overrides)
    const api = a as Api
    const scene = renderers[0]?.scene
    if (!scene) throw new Error('sem cena')
    const skinned = skinnedIn(scene)
    expect(skinned.length).toBe(3)
    const body = sceneChild(scene, skinned[0] as RealTHREE.Object3D)
    // Sem o boneco montado (as caixas de 0,5 × 0,55 do tronco).
    let rigBoxes = 0
    body.traverse((o) => {
      const g = (o as RealTHREE.Mesh).geometry as RealTHREE.BoxGeometry | undefined
      if (g?.parameters && g.parameters.width === 0.5 && g.parameters.height === 0.55) rigBoxes++
    })
    expect(rigBoxes).toBe(0)
    scene.updateMatrixWorld(true)
    const size = new RealTHREE.Box3().setFromObject(body).getSize(new RealTHREE.Vector3())
    expect(size.y).toBeCloseTo(1.7, 1)
    step(3)
    expect(asked.at(-1)).toBe('Acenar')
    const z0 = api.playerPos('z')
    pressKey('w', 'KeyW')
    step(15)
    releaseKey('w', 'KeyW')
    expect(api.playerPos('z')).toBeGreaterThan(z0 + 0.5)
    expect(asked.at(-1)).toBe('Esticar')
    // O corpo acompanha a física (mesmo personState).
    expect(body.position.z).toBeCloseTo(api.playerPos('z'), 4)
    // Frente: o Molda exporta olhando para +z, a mesma frente do boneco montado (W anda em +z
    // com giro 0). Nenhum giro extra entre o corpo e o modelo.
    expect(body.rotation.y).toBeCloseTo(0, 5)
    const holder = body.children[0]
    const modelRoot = holder?.children[0]
    expect(holder?.rotation.y ?? 1).toBeCloseTo(0, 6)
    expect(modelRoot?.rotation.y ?? 1).toBeCloseTo(0, 6)
  })

  it('amigo e carro com o modelo (as rodas do carro continuam)', async () => {
    withModels()
    const { renderers } = await loadStartedWorld((w) => {
      const api = w as Api
      api.npc('Lia', 8, 8, '#f97316', 'nenhum')
      api.npcModel('boneco', 'Lia', 1.6)
      api.car({ style: 'passeio', color: '#ef4444' })
      api.carModel('boneco', 4)
    })
    const scene = renderers[0]?.scene
    if (!scene) throw new Error('sem cena')
    const skinned = skinnedIn(scene)
    expect(skinned.length).toBe(6)
    const tops = [...new Set(skinned.map((mesh) => sceneChild(scene, mesh)))]
    expect(tops.length).toBe(2)
    const car = tops.find((top) => {
      let wheels = 0
      top.traverse((o) => {
        if ((o as RealTHREE.Mesh).geometry instanceof RealTHREE.CylinderGeometry) wheels++
      })
      return wheels >= 4
    })
    expect(car).toBeDefined()
    scene.updateMatrixWorld(true)
    const body = new RealTHREE.Box3()
    for (const mesh of skinnedIn(car)) body.expandByObject(mesh)
    const size = body.getSize(new RealTHREE.Vector3())
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(4, 0)
  })

  it('céu 360°: as luzes do mundo pegam as cores do céu', async () => {
    withModels({
      ceu: { kind: 'environment3d', fileName: 'ceu.hdr', dataUrl: makeHdrDataUrl(250, 40, 20) },
    })
    const { api, renderers } = await loadStartedWorld((w) => w.skyPhoto('ceu'))
    const scene = renderers[0]?.scene
    let ambient: RealTHREE.AmbientLight | null = null
    scene?.traverse((o) => {
      if ((o as RealTHREE.AmbientLight).isAmbientLight) ambient = o as RealTHREE.AmbientLight
    })
    const color = (ambient as RealTHREE.AmbientLight | null)?.color
    expect(color).toBeDefined()
    expect((color?.r ?? 0) > (color?.b ?? 1)).toBe(true)
    expect(color?.equals(new RealTHREE.Color('#ffffff'))).toBe(false)
    api.disposeAll()
  })

  it('a pintura animada do Molda anda no laço e volta ao 1º quadro no recomeçar', async () => {
    withModels({
      tela: { kind: 'model3d', fileName: 'tela.glb', dataUrl: flipbookFixture.dataUrl },
    })
    const {
      api: a,
      renderers,
      step,
    } = await loadStartedWorld((w) => {
      ;(w as Api).person('#3b82f6', 'nenhum')
      ;(w as Api).scatterModel(6, 'tela', 1)
    })
    const api = a as Api
    // O loader não decodifica PNG fora do navegador: a folha é dada ao material do cache (o
    // MESMO das cópias espalhadas), como no navegador, onde ela já existe no parse.
    const sheet = new RealTHREE.Texture()
    let painted = 0
    renderers[0]?.scene?.traverse((o) => {
      const material = (o as RealTHREE.Mesh).material as
        | (RealTHREE.MeshStandardMaterial & { userData: { molda?: { flipbook?: unknown } } })
        | undefined
      if (material?.userData?.molda?.flipbook) {
        material.map = sheet
        painted++
      }
    })
    expect(painted).toBeGreaterThan(0)
    const texture: RealTHREE.Texture | null = sheet
    step(1)
    const first = texture?.offset.clone()
    step(4)
    // A folha andou (outro quadro), mesmo com as cópias do "Espalhar" paradas.
    expect(texture?.offset.equals(first as RealTHREE.Vector2)).toBe(false)
    api.restart()
    for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 5))
    // 1º passo da folha (contrato 1): quadro 1 = coluna 1, linha 0.
    expect(texture?.offset.x).toBeCloseTo(flipbookFixture.steps[0]?.offset[0] ?? -1, 5)
    expect(texture?.offset.y).toBeCloseTo(flipbookFixture.steps[0]?.offset[1] ?? -1, 5)
  })

  it('descarta mixer e ossos no disposeAll e no recomeçar (modelo posto durante a partida)', async () => {
    withModels()
    const originalDispose = RealTHREE.Skeleton.prototype.dispose
    const originalUncache = RealTHREE.AnimationMixer.prototype.uncacheRoot
    let skeletons = 0
    let mixers = 0
    RealTHREE.Skeleton.prototype.dispose = function countSkeleton() {
      skeletons++
      return originalDispose.call(this)
    }
    RealTHREE.AnimationMixer.prototype.uncacheRoot = function countMixer(root) {
      mixers++
      return originalUncache.call(this, root)
    }
    try {
      const {
        api: a,
        renderers,
        step,
      } = await loadStartedWorld((w) => {
        const api = w as Api
        api.person('#3b82f6', 'nenhum')
        api.placeModel('boneco', 10, 10, 2, 0, 'Acenar')
      })
      const api = a as Api
      // Posto DURANTE a partida: o recomeçar o tira (com ossos e animador).
      api.placeModel('boneco', -10, 10, 2, 0, 'Esticar')
      step(1)
      expect(skinnedIn(renderers[0]?.scene).length).toBe(6)
      api.restart()
      for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 5))
      expect(skinnedIn(renderers[0]?.scene).length).toBe(3)
      expect(mixers).toBe(1)
      expect(skeletons).toBe(3)
      api.disposeAll()
      expect(mixers).toBe(2)
      expect(skeletons).toBeGreaterThanOrEqual(6)
    } finally {
      RealTHREE.Skeleton.prototype.dispose = originalDispose
      RealTHREE.AnimationMixer.prototype.uncacheRoot = originalUncache
    }
  })
})
