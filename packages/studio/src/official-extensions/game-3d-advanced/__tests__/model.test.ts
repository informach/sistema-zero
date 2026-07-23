import { describe, expect, it } from 'bun:test'
import { LoopOnce } from 'three'
import { makeAnimatedGlb, makeHdrDataUrl } from './assetFixtures'
import { type KitApi, loadStartedKit, makeFakeThree, runtimeBody } from './kitHarness'

/**
 * O caminho do .glb — que foi para a v0.3.0 com ZERO teste, e é exatamente por
 * isso que dois bugs silenciosos ("meu robô virou um cubo", sem aviso nenhum)
 * sobreviveram a um review inteiro:
 *
 * 1. Dois moldes com o MESMO arquivo: o segundo caía num `if (pending) return`
 *    que DESCARTAVA o callback → ficava com o cubo de reserva para sempre.
 * 2. O `start()` esperava só os SONS. Como o `spawn()` CLONA o template, toda
 *    entidade nascida antes de o parse terminar ficava com o cubo — e o pool
 *    guardava esse mesh para sempre.
 *
 * Aqui o GLTFLoader é o DE VERDADE (o bun resolve `three/addons/...`, e a
 * bancada já usa three 0.180.0 = a versão do CDN), com um .glb mínimo montado no
 * próprio teste — nada de asset de MB nem de loader falso.
 */

/**
 * ⭐ Um .glb 2.0 COM SKIN: 1 SkinnedMesh, 2 ossos (raiz + filho), skin com
 * inverseBindMatrices e 1 clip que gira o osso filho. É o único jeito de ver o
 * bug do clone: o `.glb` sem esqueleto (o `makeAnimatedGlb` comum, translação num nó
 * solto) aceita o clone comum sem reclamar — foi por isso que a v0.5.0 passou
 * verde com a animação MORTA no caso real. A montagem binária foi validada
 * contra o GLTFLoader de verdade (spike) antes de virar teste.
 */
function makeSkinnedGlb(clipName: string): string {
  const f32 = (a: number[]) => new Float32Array(a)
  const u16 = (a: number[]) => new Uint16Array(a)
  const parts: Uint8Array[] = []
  let off = 0
  const views: { byteOffset: number; byteLength: number }[] = []
  const push = (typed: Float32Array | Uint16Array): number => {
    const bytes = new Uint8Array(typed.buffer)
    while (off % 4 !== 0) {
      parts.push(new Uint8Array([0]))
      off++
    }
    views.push({ byteOffset: off, byteLength: bytes.length })
    parts.push(bytes)
    off += bytes.length
    return views.length - 1
  }
  const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  const s = Math.sin(Math.PI / 4)
  const c = Math.cos(Math.PI / 4)
  const vPos = push(f32([-1, 0, 0, 1, 0, 0, -1, 2, 0, 1, 2, 0]))
  const vJoints = push(u16([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]))
  const vWeights = push(f32([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]))
  const vIdx = push(u16([0, 1, 2, 2, 1, 3]))
  const vIBM = push(f32([...ident, ...ident]))
  const vTime = push(f32([0, 1]))
  const vRot = push(f32([0, 0, 0, 1, 0, s, 0, c]))
  const binLen = off
  const bin = new Uint8Array(binLen)
  {
    let p = 0
    for (const ch of parts) {
      bin.set(ch, p)
      p += ch.length
    }
  }
  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0, 3] }],
    nodes: [
      { name: 'Root', children: [1] },
      { name: 'Bone', translation: [0, 1, 0] },
      { name: 'unused' },
      { name: 'Boneco', mesh: 0, skin: 0 },
    ],
    meshes: [
      {
        primitives: [
          { attributes: { POSITION: vPos, JOINTS_0: vJoints, WEIGHTS_0: vWeights }, indices: vIdx },
        ],
      },
    ],
    skins: [{ joints: [0, 1], inverseBindMatrices: vIBM, skeleton: 0 }],
    animations: [
      {
        name: clipName,
        samplers: [{ input: vTime, interpolation: 'LINEAR', output: vRot }],
        channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }],
      },
    ],
    buffers: [{ byteLength: binLen }],
    bufferViews: views.map((v, i) => ({
      buffer: 0,
      byteOffset: v.byteOffset,
      byteLength: v.byteLength,
      // POSITION/JOINTS/WEIGHTS = ARRAY_BUFFER; índices = ELEMENT_ARRAY_BUFFER.
      ...(i < 3 ? { target: 34962 } : i === 3 ? { target: 34963 } : {}),
    })),
    accessors: [
      {
        bufferView: vPos,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        min: [-1, 0, 0],
        max: [1, 2, 0],
      },
      { bufferView: vJoints, componentType: 5123, count: 4, type: 'VEC4' },
      { bufferView: vWeights, componentType: 5126, count: 4, type: 'VEC4' },
      { bufferView: vIdx, componentType: 5123, count: 6, type: 'SCALAR' },
      { bufferView: vIBM, componentType: 5126, count: 2, type: 'MAT4' },
      { bufferView: vTime, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: vRot, componentType: 5126, count: 2, type: 'VEC4' },
    ],
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jpad = (4 - (json.length % 4)) % 4
  const bpad = (4 - (binLen % 4)) % 4
  const jsonLen = json.length + jpad
  const binChunkLen = binLen + bpad
  const total = 12 + 8 + jsonLen + 8 + binChunkLen
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, jsonLen, true)
  dv.setUint32(16, 0x4e4f534a, true)
  u8.set(json, 20)
  for (let i = 0; i < jpad; i++) u8[20 + json.length + i] = 0x20
  const bo = 20 + jsonLen
  dv.setUint32(bo, binChunkLen, true)
  dv.setUint32(bo + 4, 0x004e4942, true)
  u8.set(bin, bo + 8)
  for (let i = 0; i < bpad; i++) u8[bo + 8 + binLen + i] = 0
  let out = ''
  for (let i = 0; i < u8.length; i++) out += String.fromCharCode(u8[i] as number)
  return `data:model/gltf-binary;base64,${btoa(out)}`
}

/** GLB válido com geometria zero-inicializada; permite testar orçamento sem fixture gigante. */
function makeTriangleGlb(triangleCount: number, meshNodes = 1): string {
  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: Array.from({ length: meshNodes }, (_, index) => index) }],
    nodes: Array.from({ length: meshNodes }, (_, index) => ({ name: `Mesh-${index}`, mesh: 0 })),
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      {
        componentType: 5126,
        count: triangleCount * 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
    ],
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const padding = (4 - (json.length % 4)) % 4
  const jsonLength = json.length + padding
  const total = 12 + 8 + jsonLength
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  for (let index = 0; index < padding; index++) bytes[20 + json.length + index] = 0x20
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}

function seedModels(models: Record<string, string>) {
  const entries: Record<string, unknown> = {}
  for (const [name, dataUrl] of Object.entries(models)) {
    entries[name] = { kind: 'model3d', dataUrl, fileName: `${name}.glb` }
  }
  ;(globalThis.window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D = entries
}

function seedEnvironments(environments: Record<string, string>) {
  const entries: Record<string, unknown> = {}
  for (const [name, dataUrl] of Object.entries(environments)) {
    entries[name] = { kind: 'environment3d', dataUrl, fileName: `${name}.hdr` }
  }
  ;(globalThis.window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D = entries
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('a condição assíncrona não aconteceu a tempo')
}

/**
 * O nó do .glb aparece na árvore do mesh da entidade? (= o modelo entrou de fato,
 * em vez do cubo de reserva). A entidade é um objeto simples com `.mesh` — não
 * precisa de API só-de-teste para espiar.
 */
function hasNode(entity: unknown, name: string): boolean {
  let found = false
  const mesh = (entity as { mesh?: { traverse: (fn: (o: { name?: string }) => void) => void } })
    .mesh
  if (!mesh) return false
  mesh.traverse((o) => {
    if (o.name === name) found = true
  })
  return found
}

describe('SZGameKit3D — modelos .glb', () => {
  it('rejeita modelo acima do teto de malhas antes de colocá-lo no cache', async () => {
    seedModels({ cidade: makeTriangleGlb(1, 49) })
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      const { api } = await loadStartedKit((runtime) => {
        runtime.defineMold('cidade', { health: 1, speed: 0 }, () => {
          runtime.part({
            shape: 'modelo',
            model: 'cidade',
            w: 1,
            h: 1,
            d: 1,
            x: 0,
            y: 0,
            z: 0,
          })
        })
      })
      api.setState('jogando')
      const entity = api.spawn('cidade', 0, 0, 0)
      expect(hasNode(entity, 'Mesh-0')).toBe(false)
      expect(warnings.some((warning) => warning.includes('49 malhas'))).toBe(true)
    } finally {
      console.warn = originalWarn
    }
  })

  it('limita cópias vivas de modelo pelo orçamento agregado de triângulos', async () => {
    seedModels({ denso: makeTriangleGlb(100_000) })
    const { api } = await loadStartedKit((runtime) => {
      runtime.defineMold('denso', { health: 1, speed: 0 }, () => {
        runtime.part({
          shape: 'modelo',
          model: 'denso',
          w: 1,
          h: 1,
          d: 1,
          x: 0,
          y: 0,
          z: 0,
        })
      })
    })
    api.setState('jogando')
    for (let index = 0; index < 20; index++) {
      expect(api.spawn('denso', 0, 0, 0)).not.toBeNull()
    }
    expect(api.spawn('denso', 0, 0, 0)).toBeNull()
  })

  it('aplica o orçamento ativo globalmente entre moldes e devolve o custo ao reciclar', async () => {
    seedModels({ denso: makeTriangleGlb(100_000) })
    const { api } = await loadStartedKit((runtime) => {
      for (const mold of ['a', 'b']) {
        runtime.defineMold(mold, { health: 1, speed: 0 }, () => {
          runtime.part({
            shape: 'modelo',
            model: 'denso',
            w: 1,
            h: 1,
            d: 1,
            x: 0,
            y: 0,
            z: 0,
          })
        })
      }
    })
    api.setState('jogando')
    const spawned: unknown[] = []
    for (let index = 0; index < 10; index++) {
      spawned.push(api.spawn('a', 0, 0, 0), api.spawn('b', 0, 0, 0))
    }
    expect(spawned.every(Boolean)).toBe(true)
    expect(api.spawn('a', 0, 0, 0)).toBeNull()

    api.recycle(spawned[spawned.length - 1])
    expect(api.spawn('a', 0, 0, 0)).not.toBeNull()
  })

  it('⭐ dois moldes com o MESMO .glb: os DOIS ganham o modelo (não só o primeiro)', async () => {
    seedModels({ robo: makeAnimatedGlb('Boneco') })
    const { api } = await loadStartedKit()
    // Os dois pedem o mesmo arquivo: o 2º chega com a carga EM VOO e entra na fila.
    api.defineMold('heroi', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'modelo', model: 'robo', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
    })
    api.defineMold('inimigo', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'modelo', model: 'robo', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
    })
    await new Promise((r) => setTimeout(r, 120))
    api.setState('jogando')
    const h = api.spawn('heroi', 0, 0, 0)
    const i = api.spawn('inimigo', 3, 0, 0)
    expect(hasNode(h, 'Boneco')).toBe(true)
    expect(hasNode(i, 'Boneco')).toBe(true) // era o CUBO para sempre
  })

  it('⭐ entidade nascida logo depois do start NÃO fica com o cubo', async () => {
    seedModels({ nave: makeAnimatedGlb('Casco') })
    // loadStartedKit define o molde DEPOIS do setup e ANTES do start — que agora
    // espera o modelo junto com os sons (a tela de "carregando" já existia).
    const { api } = await loadStartedKit((a) => {
      a.defineMold('nave', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'nave', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('nave', 0, 0, 0)
    expect(hasNode(e, 'Casco')).toBe(true)
  })

  it('dispose durante o parse de GLB invalida a conclusão tardia do start', async () => {
    seedModels({ tardio: makeAnimatedGlb('Tardio') })
    const { THREE, renderers } = makeFakeThree()
    const win = globalThis.window as unknown as Record<string, unknown>
    new Function('THREE', 'window', runtimeBody)(THREE, win)
    const api = win.SZGameKit3D as KitApi
    api.setup({ width: 640, height: 360, world: 100 })
    api.defineMold('tardio', { health: 1, speed: 0 }, () => {
      api.part({
        shape: 'modelo',
        model: 'tardio',
        w: 1,
        h: 1,
        d: 1,
        x: 0,
        y: 0,
        z: 0,
      })
    })
    api.start()
    window.dispatchEvent(new Event('pagehide'))

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(renderers[0]?.loop).toBeNull()
    expect(renderers[0]?.disposeCalls).toBe(1)
  })

  it('⭐ o boneco ganha um mixer e os clipes do .glb (era estátua congelada)', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['parado', 'correr']) })
    const { api } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as { _mixer?: unknown; _clips?: unknown[] }
    expect(e._mixer).toBeTruthy()
    expect((e._clips || []).map((c) => (c as { name: string }).name).sort()).toEqual([
      'correr',
      'parado',
    ])
  })

  it('⭐⭐ boneco RIGADO: cada entidade tem o PRÓPRIO esqueleto (senão anima morto)', async () => {
    // ESTE é o teste que faltava. Com clone comum, o SkinnedMesh da entidade
    // compartilha o esqueleto do TEMPLATE por referência: o mixer da entidade
    // move os ossos do clone e a malha deforma pelos ossos do template, que
    // ninguém anima → bind pose eterna, sem aviso. A prova é que os esqueletos
    // são objetos DIFERENTES. (Falha antes do cloneModel no spawn.)
    seedModels({ heroi: makeSkinnedGlb('girar') })
    const { api } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const findSkeleton = (root: unknown): unknown => {
      let skel: unknown = null
      ;(
        root as {
          traverse: (fn: (o: { isSkinnedMesh?: boolean; skeleton?: unknown }) => void) => void
        }
      ).traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) skel = o.skeleton
      })
      return skel
    }
    const a = api.spawn('heroi', 0, 0, 0) as { mesh: unknown }
    const b = api.spawn('heroi', 5, 0, 0) as { mesh: unknown }
    const skelA = findSkeleton(a.mesh)
    const skelB = findSkeleton(b.mesh)
    expect(skelA).toBeTruthy() // o SkinnedMesh sobreviveu ao clone
    // Duas entidades = dois esqueletos. Com clone comum seriam o MESMO objeto
    // (e uma animaria a outra). Este é o coração do bug.
    expect(skelA).not.toBe(skelB)
  })

  it('⭐⭐ o esqueleto do SkinnedMesh aponta para os ossos DA entidade (não do template)', async () => {
    // A prova de que a reamarração funcionou. O clone comum do Object3D até
    // clona os ossos, mas o objeto Skeleton (com o ARRAY de ossos que a malha
    // usa para deformar) é compartilhado por referência com o template — então
    // a malha deforma pelos ossos do template, que ninguém anima. Aqui exijo o
    // contrário: cada osso do skeleton do SkinnedMesh tem de estar DENTRO da
    // árvore da própria entidade. (Falha antes do cloneModel no spawn.)
    seedModels({ heroi: makeSkinnedGlb('girar') })
    const { api } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as { mesh: unknown }
    const nodes = new Set<unknown>()
    ;(e.mesh as { traverse: (fn: (o: unknown) => void) => void }).traverse((o) => nodes.add(o))
    let skinned: { skeleton: { bones: unknown[] } } | null = null
    ;(e.mesh as { traverse: (fn: (o: { isSkinnedMesh?: boolean }) => void) => void }).traverse(
      (o) => {
        if (o.isSkinnedMesh) skinned = o as { skeleton: { bones: unknown[] } }
      },
    )
    expect(skinned).toBeTruthy()
    const bones = (skinned as unknown as { skeleton: { bones: unknown[] } }).skeleton.bones
    expect(bones.length).toBeGreaterThan(0)
    // TODO osso que a malha usa tem de pertencer à ÁRVORE desta entidade.
    for (const bone of bones) expect(nodes.has(bone)).toBe(true)
  })

  it('rodar o mixer de fato anima (o osso da entidade gira com o clip)', async () => {
    seedModels({ heroi: makeSkinnedGlb('girar') })
    const { api, step } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as { mesh: { skeleton?: unknown } }
    let bone: { rotation: { y: number } } | null = null
    ;(
      e.mesh as {
        traverse: (
          fn: (o: { isBone?: boolean; name?: string; rotation?: { y: number } }) => void,
        ) => void
      }
    ).traverse((o) => {
      if (o.isBone && o.name === 'Bone' && o.rotation) bone = o as { rotation: { y: number } }
    })
    expect(bone).toBeTruthy()
    const y0 = (bone as unknown as { rotation: { y: number } }).rotation.y
    api.playAnim(e, 'girar', false)
    step(20) // o clip gira o osso de 0 a 90° ao longo de 1s
    const y1 = (bone as unknown as { rotation: { y: number } }).rotation.y
    expect(Math.abs(y1 - y0)).toBeGreaterThan(0.1)
  })

  it('animação de uma vez pode tocar novamente depois de terminar', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['atacar']) })
    const { api, step } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as {
      _action?: { time: number; isRunning(): boolean }
    }
    api.playAnim(e, 'atacar', false)
    step(40)
    expect(e._action?.isRunning()).toBe(false)
    expect(e._action?.time).toBeCloseTo(1)

    api.playAnim(e, 'atacar', false)

    expect(e._action?.isRunning()).toBe(true)
    expect(e._action?.time).toBe(0)
  })

  it('trocar o mesmo clipe de repetição para uma vez reconfigura a ação', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['atacar']) })
    const { api, step } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as {
      _action?: { loop: number; time: number; isRunning(): boolean }
    }
    api.playAnim(e, 'atacar', true)
    step(5)
    const action = e._action
    expect(action?.time).toBeGreaterThan(0)

    api.playAnim(e, 'atacar', false)

    expect(e._action).toBe(action)
    expect(action?.loop).toBe(LoopOnce)
    expect(action?.time).toBe(0)
    expect(action?.isRunning()).toBe(true)
  })

  it('⭐ a animação segue o ESTADO da entidade, sozinha', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['parado', 'correr']) })
    const { api } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
      a.setStateAnim('heroi', 'parado', 'parado')
      a.setStateAnim('heroi', 'andar', 'correr')
    })
    api.setState('jogando')
    // Toda entidade nasce no estado 'parado' → já entra tocando a animação dele.
    const e = api.spawn('heroi', 0, 0, 0) as { _action?: { getClip(): { name: string } } }
    expect(e._action?.getClip().name).toBe('parado')
    // Mudar o cérebro de estado troca a animação — sem a criança pedir.
    api.setEntityState(e, 'andar')
    expect(e._action?.getClip().name).toBe('correr')
  })

  it('animação com nome que não existe: avisa UMA vez e não derruba o jogo', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['parado']) })
    const { api, step } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0)
    const avisos: string[] = []
    const orig = console.warn
    console.warn = (...a: unknown[]) => {
      avisos.push(a.map(String).join(' '))
    }
    try {
      // A criança erraria isso dentro do "a cada quadro" — 60 avisos/s entupiriam
      // o console e esconderiam todo o resto.
      for (let i = 0; i < 5; i++) {
        api.playAnim(e, 'voar', true)
        step(1)
      }
    } finally {
      console.warn = orig
    }
    expect(avisos.filter((m) => m.includes('voar')).length).toBe(1)
    expect(api.exists(e)).toBe(true)
  })

  it('recycle para a animação (o mesh volta ao pool e é REUSADO)', async () => {
    seedModels({ heroi: makeAnimatedGlb('Armature', ['parado']) })
    const { api } = await loadStartedKit((a) => {
      a.defineMold('heroi', { health: 1, speed: 0 }, () => {
        a.part({ shape: 'modelo', model: 'heroi', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    api.setState('jogando')
    const e = api.spawn('heroi', 0, 0, 0) as { _mixer?: unknown; _action?: unknown }
    api.playAnim(e, 'parado', true)
    expect(e._action).toBeTruthy()
    api.recycle(e)
    expect(e._action).toBeNull()
    // O recurso volta com o MESMO mixer (não remonta), mas em um handle novo.
    const e2 = api.spawn('heroi', 0, 0, 0) as { _mixer?: unknown; _action?: unknown }
    expect(e2).not.toBe(e as unknown as typeof e2)
    expect(e2._mixer).toBe(e._mixer)
    expect(e2._mixer).toBeTruthy()
    expect(e2._action).toBeNull()
  })

  it('modelo que não está no projeto: cai na peça de reserva e AVISA', async () => {
    seedModels({})
    const avisos: string[] = []
    const win = globalThis.window as unknown as Record<string, unknown>
    const { THREE } = makeFakeThree()
    const orig = console.warn
    console.warn = (...a: unknown[]) => {
      avisos.push(a.map(String).join(' '))
    }
    try {
      new Function('THREE', 'window', runtimeBody)(THREE, win)
      const api = win.SZGameKit3D as Pick<KitApi, 'setup' | 'defineMold' | 'part'>
      api.setup({ width: 320, height: 200, world: 40 })
      api.defineMold('x', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'sumido', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    } finally {
      console.warn = orig
    }
    expect(avisos.some((m) => m.includes('sumido') && m.includes('reserva'))).toBe(true)
  })
})

describe('SZGameKit3D — ambientes .hdr', () => {
  it('troca e remove o HDR sem vazar textura nem deixar iluminação antiga', async () => {
    seedEnvironments({
      dia: makeHdrDataUrl(160, 190, 255),
      noite: makeHdrDataUrl(20, 30, 80),
    })
    const { api, renderers } = await loadStartedKit()
    const scene = renderers[0]?.scene
    expect(scene).toBeTruthy()

    api.setSkyPhoto('dia')
    await waitUntil(() => Boolean(scene?.environment))
    const day = scene?.environment
    let dayDisposals = 0
    day?.addEventListener('dispose', () => dayDisposals++)

    api.setSkyPhoto('noite')
    await waitUntil(() => Boolean(scene?.environment && scene.environment !== day))
    const night = scene?.environment
    expect(dayDisposals).toBe(1)
    expect(scene?.background).toBe(night)

    let nightDisposals = 0
    night?.addEventListener('dispose', () => nightDisposals++)
    api.setSky('#111827', '#93c5fd')
    expect(scene?.environment).toBeNull()
    expect(scene?.background).not.toBe(night)
    expect(nightDisposals).toBe(1)
  })
})
