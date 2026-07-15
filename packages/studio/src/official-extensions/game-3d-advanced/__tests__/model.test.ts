import { describe, expect, it } from 'bun:test'
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
 * Um .glb 2.0 válido e mínimo: 1 nó, opcionalmente com animações de verdade.
 * Cada clipe é um sampler translation com 2 quadros — o suficiente para o
 * GLTFLoader montar um AnimationClip real e o mixer ter o que tocar.
 */
function makeGlb(nodeName: string, clipNames: string[] = []): string {
  const gltf: Record<string, unknown> = {
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ name: nodeName }],
  }
  if (clipNames.length) {
    // tempos [0,1] (2 floats) + translations 2×vec3 (6 floats) = 32 bytes.
    const bin = new Float32Array([0, 1, 0, 0, 0, 0, 1, 0])
    const b64 = btoa(String.fromCharCode(...new Uint8Array(bin.buffer)))
    gltf.buffers = [{ byteLength: 32, uri: `data:application/octet-stream;base64,${b64}` }]
    gltf.bufferViews = [
      { buffer: 0, byteOffset: 0, byteLength: 8 },
      { buffer: 0, byteOffset: 8, byteLength: 24 },
    ]
    gltf.accessors = [
      { bufferView: 0, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 1, componentType: 5126, count: 2, type: 'VEC3' },
    ]
    gltf.animations = clipNames.map((name) => ({
      name,
      samplers: [{ input: 0, interpolation: 'LINEAR', output: 1 }],
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
    }))
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  // Os chunks do GLB são alinhados em 4 bytes (com espaço, não com zero).
  const pad = (4 - (json.length % 4)) % 4
  const jsonLen = json.length + pad
  const total = 12 + 8 + jsonLen
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  dv.setUint32(0, 0x46546c67, true) // "glTF"
  dv.setUint32(4, 2, true) // versão
  dv.setUint32(8, total, true)
  dv.setUint32(12, jsonLen, true)
  dv.setUint32(16, 0x4e4f534a, true) // "JSON"
  u8.set(json, 20)
  for (let i = 0; i < pad; i++) u8[20 + json.length + i] = 0x20
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i] as number)
  return `data:model/gltf-binary;base64,${btoa(bin)}`
}

function seedModels(models: Record<string, string>) {
  const entries: Record<string, unknown> = {}
  for (const [name, dataUrl] of Object.entries(models)) {
    entries[name] = { kind: 'model3d', dataUrl, fileName: `${name}.glb` }
  }
  ;(globalThis.window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D = entries
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
  it('⭐ dois moldes com o MESMO .glb: os DOIS ganham o modelo (não só o primeiro)', async () => {
    seedModels({ robo: makeGlb('Boneco') })
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
    seedModels({ nave: makeGlb('Casco') })
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

  it('⭐ o boneco ganha um mixer e os clipes do .glb (era estátua congelada)', async () => {
    seedModels({ heroi: makeGlb('Armature', ['parado', 'correr']) })
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

  it('⭐ a animação segue o ESTADO da entidade, sozinha', async () => {
    seedModels({ heroi: makeGlb('Armature', ['parado', 'correr']) })
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
    seedModels({ heroi: makeGlb('Armature', ['parado']) })
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
    seedModels({ heroi: makeGlb('Armature', ['parado']) })
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
    // O slot volta com o MESMO mixer (não remonta) e sem ação pendurada.
    const e2 = api.spawn('heroi', 0, 0, 0) as { _mixer?: unknown; _action?: unknown }
    expect(e2).toBe(e as unknown as typeof e2)
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
