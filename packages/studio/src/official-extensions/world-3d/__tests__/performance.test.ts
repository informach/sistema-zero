import { afterEach, describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { compileStatements } from '#generators'
import { parseJS } from '../../../parsers/js'
import { makeCountingThree, mathAllocations } from '../../__tests__/three3d/countingThree'
import { CACA_ESTRELAS_SOURCE } from '../__gen_cacaEstrelas'
import { FAZENDINHA_SOURCE } from '../__gen_fazendinha'
import { world3DRuntime } from '../runtime'
import {
  type FakeRenderer,
  loadExampleWorld,
  loadStartedWorld,
  pressKey,
  releaseKey,
} from './kitHarness'

/**
 * Travas de desempenho do Mundo 3D (review 3D, lote 14, P1).
 *
 * Roda o runtime com o THREE CONTADOR (`makeCountingThree`, subclasses que contam as construções
 * de Vector3/Vector2/Box3/Matrix4/Quaternion/Sphere/Raycaster; aqui somamos Color) sobre o
 * harness de sempre. Depois de 30 quadros de aquecimento, 120 quadros com o jogador andando
 * NÃO podem construir nenhuma dessas peças: o laço usa temporários do módulo.
 *
 * `scene.updateMatrixWorld`: o FakeRenderer chama `scene.updateMatrixWorld()` em TODO render (como
 * o renderer de verdade), e o compositor de efeitos desenha várias passadas por quadro (cada uma
 * numa cena de quadro cheio). Por isso a contagem fica DESLIGADA durante o `render`: o que sobra é
 * o que o RUNTIME pede, e o teto é 1 por quadro. Medido no lote 14: 0 chamadas do runtime; o
 * renderer falso soma ~8,5 por quadro com os efeitos de cinema ligados (1 da cena + as passadas
 * do bloom) e 1 sem eles.
 *
 * Raycast: o Mundo 3D não lança raios no laço (nenhum `Raycaster`), então a lista de
 * `intersectObjects` tem de ficar vazia.
 */

const FRAMES = 120
const WARMUP = 30

type Counting = ReturnType<typeof makeCountingThree>

/** THREE contador + contagem de THREE.Color (as cores também não podem nascer no laço). */
function countedThree() {
  let counting: Counting | null = null
  let colors = 0
  const wrap = (base: Record<string, unknown>) => {
    counting = makeCountingThree(base)
    class Color extends RealTHREE.Color {
      constructor(...args: ConstructorParameters<typeof RealTHREE.Color>) {
        super(...args)
        colors++
      }
    }
    return { ...counting.THREE, Color }
  }
  const get = () => {
    if (!counting) throw new Error('o THREE contador não foi montado')
    return counting
  }
  return {
    wrap,
    get,
    colors: () => colors,
    /** Zera tudo (fim do aquecimento). */
    reset() {
      get().reset()
      colors = 0
    },
    /** Desliga a contagem durante o render: o `updateMatrixWorld` do renderer não é do runtime. */
    muteRenders(renderer: FakeRenderer) {
      const render = renderer.render
      let renders = 0
      renderer.render = (scene, camera) => {
        renders++
        get().arm(false)
        try {
          render(scene, camera)
        } finally {
          get().arm(true)
        }
      }
      return () => renders
    },
  }
}

function measure(k: ReturnType<typeof countedThree>, step: (n: number) => void) {
  step(WARMUP)
  k.reset()
  step(FRAMES)
  const c = k.get().counts
  return { ...c, colors: k.colors(), math: mathAllocations(c) }
}

function expectZeroAllocLoop(m: ReturnType<typeof measure>) {
  expect(m.Vector3).toBe(0)
  expect(m.Box3).toBe(0)
  expect(m.Matrix4).toBe(0)
  expect(m.Raycaster).toBe(0)
  expect(m.math).toBe(0)
  expect(m.colors).toBe(0)
  // O runtime não pede updateMatrixWorld da cena (o renderer já faz no render): teto 1/quadro.
  expect(m.sceneUpdateMatrixWorld).toBeLessThanOrEqual(FRAMES)
  expect(m.sceneUpdateMatrixWorldForced).toBe(0)
  // Sem raycast por quadro.
  expect(m.intersectLists).toEqual([])
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
  for (const [key, code] of [
    ['w', 'KeyW'],
    ['a', 'KeyA'],
  ])
    releaseKey(key as string, code as string)
  try {
    localStorage.clear()
  } catch {}
})

type Extra = Record<string, (...args: unknown[]) => unknown>

describe('Mundo 3D — laço sem alocar (THREE contador)', () => {
  it('Caça às Estrelas: a pé, com regras de jogo, coletáveis e espalhado', async () => {
    const k = countedThree()
    const code = compileStatements(parseJS(CACA_ESTRELAS_SOURCE), 0)
    const { api, renderers, step } = await loadExampleWorld(code, k.wrap)
    const renders = k.muteRenders(renderers[0] as FakeRenderer)
    ;(document.querySelector('[data-szr-screen="inicio"] button') as HTMLButtonElement).click()
    const z0 = api.playerPos('z')
    pressKey('w', 'KeyW')
    const m = measure(k, step)
    expect(api.playerPos('z')).not.toBe(z0) // andou de verdade (o teste não é vazio)
    expectZeroAllocLoop(m)
    expect(renders()).toBeGreaterThanOrEqual(FRAMES)
  })

  it('Fazendinha: dirigindo, com bichos, moinho, amiga e folhas ao vento', async () => {
    const k = countedThree()
    const code = compileStatements(parseJS(FAZENDINHA_SOURCE), 0)
    const { api, renderers, step } = await loadExampleWorld(code, k.wrap)
    k.muteRenders(renderers[0] as FakeRenderer)
    const z0 = api.playerPos('z')
    pressKey('w', 'KeyW')
    const m = measure(k, step)
    expect(Math.abs(api.playerPos('z') - z0)).toBeGreaterThan(1)
    expectZeroAllocLoop(m)
  })

  it('mundo cheio: moedas, postes à noite, cidade com trânsito, chuva, minimapa e missão', async () => {
    const k = countedThree()
    const { api, renderers, step } = await loadStartedWorld(
      (a) => {
        const w = a as unknown as Extra
        w.person?.('#f97316', 'bone')
        w.scatter?.(120, 'arvores')
        w.scatter?.(80, 'flores')
        w.coinsLine?.(20, -40, 6, 40, 6)
        w.coinsRing?.(16, 0, 0, 30)
        w.lamp?.(6, 6)
        w.lamp?.(-6, 6)
        w.lamp?.(20, -10)
        w.city?.(30, 30, 'pequena', 'neon')
        w.traffic?.(4)
        w.setTime?.('noite')
        w.weather?.('chuva')
        w.minimap?.('ver')
        w.npc?.('Ana', 4, 4, '#e04f3f', 'palha')
        w.windmill?.(-20, -20)
        w.animals?.(3, 'vacas', 10, -10, 6)
        w.fireflies?.('media')
        w.quest?.('pegar', 'Pegue moedas')
        w.guideArrow?.(30, 30)
        w.say?.('Bora!', 10)
        // "A cada quadro" da criança soltando confete de vez em quando: as cores das
        // partículas não podem virar um THREE.Color novo por partícula.
        let frame = 0
        a.onUpdate(() => {
          frame++
          if (frame === 10 || frame % 50 === 0) w.confetti?.()
        })
      },
      {},
      k.wrap,
    )
    k.muteRenders(renderers[0] as FakeRenderer)
    const x0 = api.playerPos('x')
    const z0 = api.playerPos('z')
    pressKey('w', 'KeyW')
    const m = measure(k, step)
    expect(Math.abs(api.playerPos('x') - x0) + Math.abs(api.playerPos('z') - z0)).toBeGreaterThan(1)
    expectZeroAllocLoop(m)
  })
})

/** Os InstancedMesh do espalhado: filhos do grupo da natureza (o único grupo só de instâncias). */
function natureChunks(scene: RealTHREE.Scene): RealTHREE.InstancedMesh[] {
  for (const child of scene.children) {
    if (!(child as RealTHREE.Group).isGroup || !child.children.length) continue
    if (child.children.every((o) => (o as RealTHREE.InstancedMesh).isInstancedMesh))
      return child.children as RealTHREE.InstancedMesh[]
  }
  return []
}

describe('Mundo 3D — espalhado em pedaços de ~80 m (frustum culling)', () => {
  it('mundo pequeno (< 160 m) continua num pedaço só: a câmera vê quase tudo, pedaço só somaria draw call', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      const w = a as unknown as Extra
      w.scatter?.(200, 'arvores')
      w.scatter?.(100, 'flores')
    })
    step(2)
    // Mundo de 120 m (o do harness): as mesmas 5 InstancedMesh de antes (3 peças + 2 peças).
    expect(natureChunks(renderers[0]?.scene as RealTHREE.Scene).length).toBe(5)
  })

  it('vários InstancedMesh, cada um com a SUA esfera, o mesmo total e cada instância no seu pedaço', async () => {
    const WORLD = 300
    const { renderers, step } = await loadStartedWorld((a) => {
      a.setup({ style: 'floresta', world: WORLD })
      const w = a as unknown as Extra
      // Com alguém para a câmera seguir (sem jogador, ela sobrevoa o mundo inteiro).
      w.person?.('#f97316', 'bone')
      w.scatter?.(200, 'arvores')
      w.scatter?.(100, 'flores')
    })
    step(2)
    const scene = renderers[0]?.scene as RealTHREE.Scene
    const chunks = natureChunks(scene)
    // 3 peças por árvore + 2 por flor: sem pedaços eram 5 InstancedMesh (5 draw calls, todas
    // sempre na tela). 300 m = grade 3x3 de 100 m: até 9 pedaços por peça.
    expect(chunks.length).toBeGreaterThan(5)
    expect(chunks.length).toBeLessThanOrEqual(9 * 5)
    const byPart = new Map<string, number>()
    const m = new RealTHREE.Matrix4()
    const p = new RealTHREE.Vector3()
    const cellOf = (v: number) => Math.floor((v + WORLD / 2) / 100)
    for (const mesh of chunks) {
      // Esfera própria, do tamanho de um pedaço (meia-diagonal de 100x100 m + a copa), nunca
      // a do mundo (meia-diagonal de 300x300 m = 212 m).
      expect(mesh.boundingSphere).not.toBeNull()
      expect((mesh.boundingSphere as RealTHREE.Sphere).radius).toBeLessThan(80)
      expect(mesh.frustumCulled).toBe(true)
      const key = `${mesh.geometry.uuid}:${(mesh.material as RealTHREE.Material).uuid}`
      byPart.set(key, (byPart.get(key) ?? 0) + mesh.count)
      // Todas as instâncias do pedaço moram na MESMA célula (o tronco/caule fica no lugar sorteado).
      const cells = new Set<string>()
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m)
        p.setFromMatrixPosition(m)
        cells.add(`${cellOf(p.x)}:${cellOf(p.z)}`)
      }
      expect(cells.size).toBeLessThanOrEqual(2) // a copa deslocada pode cruzar a borda por ~1 m
    }
    // O MESMO total por peça: 200 árvores (3 peças) e 100 flores (2 peças).
    const totals = [...byPart.values()].sort((a, b) => a - b)
    expect(totals.reduce((s, n) => s + n, 0)).toBe(200 * 3 + 100 * 2)

    // O frustum culling agora recorta: da câmera do começo, parte dos pedaços fica fora da tela.
    const camera = renderers[0]?.camera as RealTHREE.PerspectiveCamera
    camera.updateMatrixWorld()
    const frustum = new RealTHREE.Frustum().setFromProjectionMatrix(
      new RealTHREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    )
    const visible = chunks.filter((mesh) => frustum.intersectsObject(mesh)).length
    expect(visible).toBeLessThan(chunks.length)
    expect(visible).toBeGreaterThan(0)
  })

  it('o descarte libera os pedaços (o disposeAll passa por todos os InstancedMesh)', async () => {
    const { api, renderers } = await loadStartedWorld((a) => {
      a.setup({ style: 'floresta', world: 300 })
      ;(a as unknown as Extra).scatter?.(150, 'arvores')
    })
    const chunks = natureChunks(renderers[0]?.scene as RealTHREE.Scene)
    expect(chunks.length).toBeGreaterThan(3)
    let disposed = 0
    for (const mesh of chunks) {
      const dispose = mesh.dispose.bind(mesh)
      mesh.dispose = () => {
        disposed++
        return dispose()
      }
    }
    api.disposeAll()
    expect(disposed).toBe(chunks.length)
  })
})

describe('Mundo 3D — playerXZ reaproveitado, postes, moedas e HUD', () => {
  it('o gancho que teletransporta o jogador não muda o resto do laço das moedas', async () => {
    let pegas = 0
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as Extra
      // Duas moedas no MESMO lugar: as duas caem no mesmo quadro.
      w.coinsLine?.(2, 0, 4, 0, 4)
      w.onCollect?.(() => {
        pegas++
        api.carPlace(50, 50, 0)
      })
    })
    api.carPlace(0, 0, 0)
    pressKey('w', 'KeyW')
    step(60)
    releaseKey('w', 'KeyW')
    // A 2ª moeda foi conferida com a posição de ANTES do gancho (cópia local), como sempre.
    expect(pegas).toBe(2)
    expect((api as unknown as { coinCount(): number }).coinCount()).toBe(2)
    expect(api.playerPos('x')).toBeCloseTo(50, 0)
    // playerPos lê a hora certa a cada chamada (o objeto reaproveitado não fica velho).
    api.carPlace(-7, 9, 0)
    expect(api.playerPos('x')).toBeCloseTo(-7, 5)
    expect(api.playerPos('z')).toBeCloseTo(9, 5)
    api.carPlace(3, -4, 0)
    expect(api.playerPos('x')).toBeCloseTo(3, 5)
    expect(api.playerPos('z')).toBeCloseTo(-4, 5)
  })

  it('as luzes dos postes seguem o jogador (ordem refeita ao andar > 4 m, sem esperar)', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as Extra
      for (let i = 0; i < 5; i++) w.lamp?.(-40, -40 + i * 3)
      for (let i = 0; i < 5; i++) w.lamp?.(40, 40 + i * 3)
      a.setTime('noite')
    })
    const lit = () => {
      const out: RealTHREE.PointLight[] = []
      renderers[0]?.scene?.traverse((o) => {
        const l = o as RealTHREE.PointLight
        if (l.isPointLight && l.intensity > 0 && l.distance === 16) out.push(l)
      })
      return out
    }
    api.carPlace(-40, -36, 0)
    step(2)
    expect(lit().length).toBe(4)
    for (const l of lit()) expect(l.position.x).toBeCloseTo(-40, 5)
    api.carPlace(40, 44, 0)
    step(1)
    for (const l of lit()) expect(l.position.x).toBeCloseTo(40, 5)
  })

  it('moedas longe da câmera ficam paradas; as perto giram; pegar continua igual', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as Extra
      w.coinsLine?.(2, 0, 10, 0, 12)
      w.coinsLine?.(2, 0, -150, 0, -152)
    })
    api.carPlace(0, 0, 0)
    step(2)
    let coins: RealTHREE.InstancedMesh | null = null
    renderers[0]?.scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (im.isInstancedMesh && im.count === 4) coins = im
    })
    expect(coins).not.toBeNull()
    const mesh = coins as unknown as RealTHREE.InstancedMesh
    const at = (i: number) => {
      const m = new RealTHREE.Matrix4()
      mesh.getMatrixAt(i, m)
      return m.elements.slice()
    }
    const near0 = at(0)
    const far0 = at(2)
    step(5)
    expect(at(0)).not.toEqual(near0) // perto: gira
    expect(at(2)).toEqual(far0) // longe: parada na última pose (desenhada, sem custo)
    expect(far0[13]).toBeGreaterThan(-100) // visível (não é a moeda escondida a -9999)
  })

  it('o balão do "Falar" não reescreve o estilo quando nada mudou na tela', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
    })
    api.say('Olá!', 30)
    step(120) // a câmera assenta
    const bubble = Array.from(document.querySelectorAll('#szw3d-stage div')).find(
      (el) => el.textContent === 'Olá!',
    ) as HTMLElement
    expect(bubble).toBeDefined()
    expect(bubble.style.display).toBe('block')
    let writes = 0
    const style = bubble.style as unknown as Record<string, string>
    for (const prop of ['left', 'top', 'display']) {
      let proto: object | null = Object.getPrototypeOf(style)
      let desc: PropertyDescriptor | undefined
      while (proto && !desc) {
        desc = Object.getOwnPropertyDescriptor(proto, prop)
        proto = Object.getPrototypeOf(proto)
      }
      if (!desc?.set || !desc.get) throw new Error(`sem acessor de estilo para ${prop}`)
      const { get, set } = desc
      Object.defineProperty(style, prop, {
        configurable: true,
        get() {
          return get.call(this)
        },
        set(v: string) {
          writes++
          set.call(this, v)
        },
      })
    }
    step(30)
    expect(writes).toBe(0)
  })
})

/** Draw calls e instâncias que a câmera desenharia, com o culling do renderer (esfera por objeto). */
function drawStats(root: RealTHREE.Object3D, camera: RealTHREE.PerspectiveCamera) {
  camera.updateMatrixWorld()
  const frustum = new RealTHREE.Frustum().setFromProjectionMatrix(
    new RealTHREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  )
  const out = { calls: 0, instances: 0, meshes: 0, totalInstances: 0, neverCulled: 0 }
  root.traverseVisible((o) => {
    const r = o as RealTHREE.InstancedMesh & { isPoints?: boolean; isLine?: boolean }
    if (!r.isMesh && !r.isPoints && !r.isLine) return
    const n = r.isInstancedMesh ? r.count : 1
    out.meshes++
    out.totalInstances += n
    if (!o.frustumCulled) out.neverCulled++
    if (!o.frustumCulled || frustum.intersectsObject(o)) {
      out.calls++
      out.instances += n
    }
  })
  return out
}

/** O grupo da cidadezinha: o filho da cena que tem a malha viária (cor por vértice). */
function cityGroupOf(scene: RealTHREE.Scene): RealTHREE.Object3D {
  const g = scene.children.find((c) =>
    c.children.some(
      (o) =>
        ((o as RealTHREE.Mesh).material as RealTHREE.Material | undefined)?.vertexColors === true,
    ),
  )
  if (!g) throw new Error('a cidade não montou')
  return g
}

/**
 * A cidade agrupada por FORMA (lote 15). Antes: ~22 InstancedMesh de casas e cercas (5 por
 * arquétipo + a cerca), cada uma com a esfera da cidade inteira, e os 4 varais com
 * `frustumCulled = false`. Agora: um InstancedMesh por forma (caixa, telhado) com a cor por
 * instância, e os varais com a esfera deles. Pela regra do espalhado (faixas de 80 m) as três
 * cidades (68, 88 e 108 m) ficam num pedaço só: o 2x2 de 40 m foi medido e somava draw calls em
 * todas as vistas (média: 16/10/44/40/0 contra 8/7/33/30/0) — as peças são caixas baratas.
 *
 * Vistas (carro parado, câmera atrás dele): anel leste olhando +z, anel leste olhando +x, anel
 * sul olhando a cidade inteira, praça a 45° e fora da cidade olhando para longe.
 */
const CITY_VIEWS: [number, number, number][] = [
  [24, 0, 0],
  [24, 0, 90],
  [0, 24, 180],
  [0, 0, 45],
  [80, 0, 90],
]
// Medido ANTES do lote 15 (mesmas vistas, mesmo mundo de 240 m, trânsito de 4 com semáforos).
const CITY_BEFORE = {
  pequena: { calls: [21, 19, 52, 39, 4], instances: 163 },
  media: { calls: [26, 24, 49, 44, 4], instances: 195 },
  grande: { calls: [33, 30, 50, 47, 4], instances: 225 },
}
// Medido DEPOIS (52 objetos desenháveis por cidade viraram 33).
const CITY_AFTER = {
  pequena: { calls: [8, 7, 33, 30, 0], meshes: 33 },
  media: { calls: [8, 7, 33, 30, 0], meshes: 33 },
  grande: { calls: [10, 7, 31, 28, 0], meshes: 33 },
}

describe('Mundo 3D — cidade agrupada por forma, com esfera própria (culling)', () => {
  for (const size of ['pequena', 'media', 'grande'] as const) {
    it(`${size}: menos draw calls em toda vista, as MESMAS instâncias e nada fora do culling`, async () => {
      const { api, renderers, step } = await loadStartedWorld((a) => {
        a.setup({ style: 'floresta', world: 240 })
        a.car('passeio', '#ef4444')
        const w = a as unknown as Extra
        w.city?.(0, 0, size, 'dia')
        w.traffic?.(4, 'semaforos')
      })
      const calls: number[] = []
      let last: ReturnType<typeof drawStats> | null = null
      for (const [x, z, deg] of CITY_VIEWS) {
        api.carPlace(x, z, deg)
        step(90) // a câmera assenta atrás do carro
        const scene = renderers[0]?.scene as RealTHREE.Scene
        last = drawStats(cityGroupOf(scene), renderers[0]?.camera as RealTHREE.PerspectiveCamera)
        calls.push(last.calls)
      }
      const before = CITY_BEFORE[size]
      const after = CITY_AFTER[size]
      for (let i = 0; i < CITY_VIEWS.length; i++) {
        expect(calls[i]).toBeLessThanOrEqual(after.calls[i] as number)
        expect(calls[i]).toBeLessThan(before.calls[i] as number)
      }
      // Fora da cidade, olhando para longe: nada dela é desenhado (antes, os 4 varais).
      expect(calls[4]).toBe(0)
      const stats = last as ReturnType<typeof drawStats>
      expect(stats.neverCulled).toBe(0)
      expect(stats.meshes).toBe(after.meshes)
      // Tudo continua lá: as mesmas instâncias de antes (casas, cercas, faixas, trânsito, semáforos;
      // as ruas contam 1 por malha).
      expect(stats.totalInstances).toBe(before.instances)
      // Cada InstancedMesh tem a SUA esfera.
      const group = cityGroupOf(renderers[0]?.scene as RealTHREE.Scene)
      for (const o of group.children) {
        const im = o as RealTHREE.InstancedMesh
        if (im.isInstancedMesh) expect(im.boundingSphere).not.toBeNull()
      }
    })
  }

  it('casas e cercas: um InstancedMesh por forma, a cor de cada peça por instância', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      a.setup({ style: 'floresta', world: 240 })
      ;(a as unknown as Extra).city?.(0, 0, 'media', 'dia')
    })
    step(2)
    const group = cityGroupOf(renderers[0]?.scene as RealTHREE.Scene)
    const pieces = group.children.filter(
      (o) =>
        (o as RealTHREE.InstancedMesh).isInstancedMesh && (o as RealTHREE.InstancedMesh).castShadow,
    ) as RealTHREE.InstancedMesh[]
    // Caixa (paredes, portas, janelas, toldos, coberturas e a cerca-viva) e telhado piramidal.
    expect(pieces.length).toBe(2)
    expect(new Set(pieces.map((p) => p.geometry.uuid)).size).toBe(2)
    expect(new Set(pieces.map((p) => (p.material as RealTHREE.Material).uuid)).size).toBe(1)
    const colors = new Set<string>()
    const c = new RealTHREE.Color()
    for (const p of pieces) {
      expect(p.instanceColor).not.toBeNull()
      for (let i = 0; i < p.count; i++) {
        p.getColorAt(i, c)
        colors.add(c.getHexString())
      }
    }
    // Paredes pastel, porta, janela, cobertura, toldo, vitrine, cerca e os dois telhados.
    expect(colors.size).toBeGreaterThanOrEqual(9)
  })

  it('o trânsito anda dentro da esfera dele (fixa no anel, não a do 1º quadro)', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      a.setup({ style: 'floresta', world: 240 })
      const w = a as unknown as Extra
      w.city?.(0, 0, 'media', 'dia')
      w.traffic?.(1, 'livre')
    })
    // 1 carro = 4 peças; a 1ª (a carroceria) na faixa de fora do anel da média (23,56 + 1,25).
    let mesh: RealTHREE.InstancedMesh | null = null
    const m = new RealTHREE.Matrix4()
    const p = new RealTHREE.Vector3()
    renderers[0]?.scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (!im.isInstancedMesh || im.count !== 4) return
      im.getMatrixAt(0, m)
      p.setFromMatrixPosition(m)
      if (Math.abs(Math.hypot(p.x, p.z) - 24.81) < 0.05) mesh = im
    })
    const traffic = mesh as unknown as RealTHREE.InstancedMesh
    expect(traffic).not.toBeNull()
    const sphere = traffic.boundingSphere as RealTHREE.Sphere
    const seen = new Set<string>()
    for (let f = 0; f < 60; f++) {
      step(15)
      for (let k = 0; k < traffic.count; k++) {
        traffic.getMatrixAt(k, m)
        p.setFromMatrixPosition(m)
        expect(sphere.containsPoint(p)).toBe(true)
        if (k === 0) seen.add(`${Math.sign(p.x)}:${Math.sign(p.z)}`)
      }
    }
    // O carro deu a volta (passou pelos 4 quadrantes): a esfera do 1º quadro não o cobriria.
    expect(seen.size).toBe(4)
  })

  it('o descarte libera todas as peças e malhas da cidade', async () => {
    const { api, renderers } = await loadStartedWorld((a) => {
      a.setup({ style: 'floresta', world: 240 })
      const w = a as unknown as Extra
      w.city?.(0, 0, 'grande', 'neon')
      w.traffic?.(4, 'semaforos')
    })
    const group = cityGroupOf(renderers[0]?.scene as RealTHREE.Scene)
    const ims = group.children.filter(
      (o) => (o as RealTHREE.InstancedMesh).isInstancedMesh,
    ) as RealTHREE.InstancedMesh[]
    const geos = new Set<RealTHREE.BufferGeometry>()
    group.traverse((o) => {
      const g = (o as RealTHREE.Mesh).geometry
      if (g) geos.add(g)
    })
    // Casas (2), faixas, letreiros neon, trânsito e semáforos.
    expect(ims.length).toBe(6)
    let disposed = 0
    for (const mesh of ims) {
      const dispose = mesh.dispose.bind(mesh)
      mesh.dispose = () => {
        disposed++
        return dispose()
      }
    }
    // Geometria compartilhada (caixa, telhado, poste) é liberada por mais de uma malha: conta cada uma 1 vez.
    const geoDisposed = new Set<RealTHREE.BufferGeometry>()
    for (const g of geos) g.addEventListener('dispose', () => geoDisposed.add(g))
    api.disposeAll()
    expect(disposed).toBe(ims.length)
    expect(geoDisposed.size).toBe(geos.size)
  })
})

/**
 * Passeio dos bichos e dos amigos (lote 15): o alvo de cada um é o MESMO objeto, reescrito a cada
 * troca (era um `{ x, z }` novo a cada poucos segundos). O THREE contador não vê objeto literal,
 * então: (1) a janela medida é longa (900 quadros = 30 s de mundo) e cada bicho troca de alvo pelo
 * menos 2 vezes NELA (galinha r=2: ciclo de no máximo ~7,4 s; vaca r=3: ~12 s), com 0 construções
 * de matemática e de Color; (2) a guarda de fonte proíbe objeto/array literal e `new` no caminho.
 */
describe('Mundo 3D — passeio dos bichos sem alocar', () => {
  it('16 bichos e 3 amigos trocando de alvo várias vezes, semáforos trocando de fase: 0 construções', async () => {
    const k = countedThree()
    const HOMES: [number, number][] = [
      [50, 50],
      [-50, 50],
    ]
    const { api, renderers, step } = await loadStartedWorld(
      (a) => {
        a.setup({ style: 'floresta', world: 200 })
        a.car('passeio', '#ef4444')
        const w = a as unknown as Extra
        w.city?.(0, 0, 'pequena', 'dia')
        w.traffic?.(4, 'semaforos')
        w.animals?.(8, 'galinhas', 50, 50, 2)
        w.animals?.(8, 'vacas', -50, 50, 3)
        for (const [name, x] of [
          ['Ana', -12],
          ['Bia', 0],
          ['Caio', 12],
        ] as const) {
          w.npc?.(name, x, -60, '#e04f3f', 'palha')
          w.npcWander?.(name, 4)
        }
      },
      {},
      k.wrap,
    )
    api.carPlace(70, -10, 0)
    k.muteRenders(renderers[0] as FakeRenderer)
    step(WARMUP)
    k.reset()
    // Os corpos dos rebanhos: InstancedMesh de 8 com sombra cuja 1ª instância mora perto de casa.
    const bodies: RealTHREE.InstancedMesh[] = []
    const m = new RealTHREE.Matrix4()
    const p = new RealTHREE.Vector3()
    renderers[0]?.scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (!im.isInstancedMesh || im.count !== 8 || !im.castShadow) return
      im.getMatrixAt(0, m)
      p.setFromMatrixPosition(m)
      if (HOMES.some(([hx, hz]) => Math.hypot(p.x - hx, p.z - hz) < 6)) bodies.push(im)
    })
    expect(bodies.length).toBe(2)
    const read = (h: number, i: number) => {
      ;(bodies[h] as RealTHREE.InstancedMesh).getMatrixAt(i, m)
      return p.setFromMatrixPosition(m)
    }
    const prev = bodies.map((_, h) => Array.from({ length: 8 }, (_, i) => read(h, i).clone()))
    const moving = bodies.map(() => new Array<boolean>(8).fill(false))
    const starts = bodies.map(() => new Array<number>(8).fill(0))
    for (let f = 0; f < 900; f++) {
      step(1)
      for (let h = 0; h < bodies.length; h++) {
        const sphere = (bodies[h] as RealTHREE.InstancedMesh).boundingSphere as RealTHREE.Sphere
        const prevH = prev[h] as RealTHREE.Vector3[]
        const movingH = moving[h] as boolean[]
        const startsH = starts[h] as number[]
        for (let i = 0; i < 8; i++) {
          const cur = read(h, i)
          // O bicho fica dentro da esfera do rebanho (o culling não o some no meio do passeio).
          expect(sphere.containsPoint(cur)).toBe(true)
          const walking = cur.distanceTo(prevH[i] as RealTHREE.Vector3) > 1e-4
          if (walking && !movingH[i]) startsH[i] = (startsH[i] ?? 0) + 1
          movingH[i] = walking
          ;(prevH[i] as RealTHREE.Vector3).copy(cur)
        }
      }
    }
    const c = k.get().counts
    expectZeroAllocLoop({ ...c, colors: k.colors(), math: mathAllocations(c) })
    const all = starts.flat()
    expect(Math.min(...all)).toBeGreaterThanOrEqual(2)
    expect(all.reduce((s, n) => s + n, 0)).toBeGreaterThanOrEqual(16 * 3)
  })

  it('guarda de fonte: passeio, animação do modelo, semáforos e explosivos não criam objeto no laço', () => {
    const body = (name: string) => {
      const start = world3DRuntime.indexOf(`function ${name}(`)
      expect(start).toBeGreaterThan(0)
      const open = world3DRuntime.indexOf('{', start)
      let depth = 0
      let i = open
      for (; i < world3DRuntime.length; i++) {
        const ch = world3DRuntime[i]
        if (ch === '{') depth++
        else if (ch === '}' && --depth === 0) break
      }
      // Sem os comentários de linha (eles falam de `{ x, z }` à vontade).
      return world3DRuntime
        .slice(open + 1, i)
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n')
    }
    for (const name of [
      'stepAnimals',
      'stepNpcs',
      'stepModelAnim',
      'paintSemaphores',
      'stepExplosives',
    ]) {
      const src = body(name)
      expect({ name, objectLiteral: /(?:[=(,:[]|\|\||\breturn)\s*\{/.test(src) }).toEqual({
        name,
        objectLiteral: false,
      })
      expect({ name, arrayLiteral: /(?:[=(,:]|\|\||\breturn)\s*\[/.test(src) }).toEqual({
        name,
        arrayLiteral: false,
      })
      expect({ name, construct: /\bnew\s/.test(src) }).toEqual({ name, construct: false })
    }
  })
})
