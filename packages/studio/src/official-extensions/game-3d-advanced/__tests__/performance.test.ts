import { afterEach, describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import type { BehaviorIR } from '#ir'
import { makeCountingThree, mathAllocations } from '../../__tests__/three3d/countingThree'
import { mundoDeBlocosProfissionalExample, patrulhaEspacialProfissionalExample } from '../examples'
import { gameKit3DRuntime } from '../runtime'
import { type FakeRenderer, type KitApi, loadExampleKit, loadStartedKit } from './kitHarness'
import { stripIds } from './testUtils'

/**
 * Travas de desempenho do Jogo 3D Avançado (lote 14 do review 3D).
 *
 * O THREE do harness é embrulhado pelo `makeCountingThree`: as classes de matemática contam as
 * construções que o RUNTIME pede (as internas do three usam as classes originais e não entram).
 * Os exemplos rodam o MESMO JS do preview, entrando em "jogando" com teclado e mouse ativos:
 * 30 quadros de aquecimento, contadores zerados, 120 quadros medidos.
 *
 * ⚠️ A conta do `updateMatrixWorld`. O espião do `countingThree` conta TODA cena, e o
 * mini-composer (bloom/vinheta) desenha vários quads, cada um com a sua `Scene`: por isso aqui se
 * mede só a CENA DO JOGO, por instância. O FakeRenderer chama `scene.updateMatrixWorld()` em
 * todo `render` (como o WebGLRenderer de verdade) e a cena do jogo é desenhada uma vez por quadro;
 * o que sobra é do runtime (o `syncMatrices` das consultas de mouse), que tem de ser ≤ 1 por
 * quadro. Antes deste lote: 5 por quadro no Mundo de Blocos (uma por consulta, todas forçadas).
 */

type Counting = ReturnType<typeof makeCountingThree>

const WARMUP = 30
const FRAMES = 120

function jsDoExemplo(example: { ir: { behavior: BehaviorIR } }): string {
  return generateJS({ behavior: stripIds(example.ir.behavior), lifecycle: 'game-3d-advanced' })
}

function apertarBotaoDe(stage: Element, screen: string): void {
  const btn = stage.querySelector(
    `[data-szg3k-screen="${screen}"] button`,
  ) as HTMLButtonElement | null
  if (!btn) throw new Error(`sem botão na tela "${screen}"`)
  btn.click()
}

function tecla(name: 'keydown' | 'keyup', key: string, code: string): void {
  window.dispatchEvent(new KeyboardEvent(name, { key, code }))
}

/** Conta as atualizações da cena DO JOGO e quantas vezes o renderer a desenhou. */
function espiarCenaDoJogo(renderer: FakeRenderer) {
  const scene = renderer.scene
  if (!scene) throw new Error('a cena do jogo ainda não foi desenhada')
  const conta = { updates: 0, renders: 0 }
  const update = scene.updateMatrixWorld.bind(scene)
  scene.updateMatrixWorld = (force?: boolean) => {
    conta.updates += 1
    update(force)
  }
  const render = renderer.render
  renderer.render = (s?: unknown, cam?: unknown) => {
    if (s === scene) conta.renders += 1
    render(s, cam)
  }
  return conta
}

function carregarContando(exampleJs: string) {
  let c: Counting | null = null
  const loaded = loadExampleKit(exampleJs, {
    wrapThree: (base) => {
      c = makeCountingThree(base)
      return c.THREE
    },
  })
  return loaded.then((kit) => ({ ...kit, counting: c as unknown as Counting }))
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

describe('g3k — desempenho por quadro (THREE contador)', () => {
  it('Patrulha Espacial: 120 quadros jogando com teclado = zero matemática nova', async () => {
    const { api, step, stage, renderers, counting } = await carregarContando(
      jsDoExemplo(patrulhaEspacialProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu')
    expect(api.state()).toBe('jogando')
    // Anda para os lados e atira (o tiro nasce, voa e é recolhido: spawn/recycle no laço).
    const jogar = (frames: number) => {
      for (let i = 0; i < frames; i++) {
        const lado = Math.floor(i / 20) % 2 === 0 ? ['d', 'KeyD'] : ['a', 'KeyA']
        tecla('keydown', lado[0] as string, lado[1] as string)
        if (i % 6 === 0) tecla('keydown', ' ', 'Space')
        step(1)
        if (i % 6 === 0) tecla('keyup', ' ', 'Space')
        tecla('keyup', lado[0] as string, lado[1] as string)
      }
    }
    jogar(WARMUP)
    const renderer = renderers[0]
    if (!renderer) throw new Error('sem renderer')
    const cena = espiarCenaDoJogo(renderer)
    counting.reset()
    jogar(FRAMES)
    const counts = counting.counts
    expect(api.state()).toBe('jogando')
    expect({
      Vector3: counts.Vector3,
      Vector2: counts.Vector2,
      Box3: counts.Box3,
      Matrix4: counts.Matrix4,
      Quaternion: counts.Quaternion,
      Raycaster: counts.Raycaster,
      Sphere: counts.Sphere,
    }).toEqual({
      Vector3: 0,
      Vector2: 0,
      Box3: 0,
      Matrix4: 0,
      Quaternion: 0,
      Raycaster: 0,
      Sphere: 0,
    })
    expect(mathAllocations(counts)).toBe(0)
    // Sem mouse, o runtime não atualiza a cena: só o desenho (1 por quadro).
    expect(cena.renders).toBe(FRAMES)
    expect(cena.updates - cena.renders).toBe(0)
  })

  it('Mundo de Blocos: mouse (pick, pointerOver, groundPoint) + teclado sem matemática nova; raycast só nas entidades vivas', async () => {
    const { api, step, stage, renderers, counting } = await carregarContando(
      jsDoExemplo(mundoDeBlocosProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu') // "Construir"
    expect(api.state()).toBe('jogando')
    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('sem canvas')
    const renderer = renderers[0]
    if (!renderer?.scene) throw new Error('sem cena')
    const gameScene = renderer.scene

    let heroi: unknown = null
    api.forEachAlive('heroi', (e) => {
      heroi = e
    })
    expect(heroi).not.toBeNull()
    const kit = api as unknown as {
      pick(m: string): unknown
      pointerOver(e: unknown): boolean
      groundPoint(a: string): number
    }
    const moldes = ['heroi', 'grama', 'pedra', 'madeira', 'muralha', 'arvore']
    const vivos = () => moldes.reduce((n, m) => n + api.countAlive(m), 0)
    // Consultas de mouse a CADA quadro, além do clique do exemplo (que planta blocos com
    // groundPoint): cinco consultas no mesmo quadro, e a cena só pode ser atualizada uma vez.
    const listasEsperadas: number[] = []
    let medindo = false
    api.onUpdate(() => {
      const n = vivos()
      const antes = counting.counts.intersectLists.length
      kit.pick('')
      kit.pick('grama')
      kit.pointerOver(heroi)
      kit.groundPoint('x')
      kit.groundPoint('z')
      if (medindo) {
        const novas = counting.counts.intersectLists.slice(antes)
        expect(novas).toEqual([n, n, 1])
        listasEsperadas.push(n)
      }
    })
    const jogar = (frames: number, desde: number) => {
      for (let i = 0; i < frames; i++) {
        const n = desde + i
        const k = n % 40 < 20 ? ['w', 'KeyW'] : ['s', 'KeyS']
        tecla('keydown', k[0] as string, k[1] as string)
        canvas.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: 0.3 + (n % 7) * 0.05,
            clientY: 0.6,
          }),
        )
        if (n % 10 === 0) {
          canvas.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true, clientX: 0.5, clientY: 0.7 }),
          )
        }
        step(1)
        if (n % 10 === 0) window.dispatchEvent(new PointerEvent('pointerup'))
        tecla('keyup', k[0] as string, k[1] as string)
      }
    }
    jogar(WARMUP, 0)
    const cena = espiarCenaDoJogo(renderer)
    counting.reset()
    medindo = true
    jogar(FRAMES, WARMUP)
    medindo = false
    const counts = counting.counts
    expect(api.state()).toBe('jogando')
    expect(mathAllocations(counts)).toBe(0)
    expect(counts.Raycaster).toBe(0)
    // Toda consulta mediu a lista das entidades vivas (ou 1, no pointerOver) e nunca a cena:
    // a cena tem chão, sol, luz ambiente e o efeito de poeira além das entidades.
    expect(listasEsperadas.length).toBe(FRAMES)
    const maiorLista = Math.max(...counts.intersectLists)
    expect(maiorLista).toBeLessThan(gameScene.children.length)
    // O carimbo: ≤ 1 atualização da cena do runtime por quadro (o resto é o desenho), nunca forçada.
    expect(cena.renders).toBe(FRAMES)
    expect(cena.updates - cena.renders).toBeLessThanOrEqual(FRAMES)
    expect(cena.updates - cena.renders).toBeGreaterThan(0)
    expect(counts.sceneUpdateMatrixWorldForced).toBe(0)
  })
})

describe('g3k — grade espacial', () => {
  async function kitComMoldes() {
    const { api, step } = await loadStartedKit((k) => {
      for (const nome of ['a', 'b']) {
        k.defineMold(nome, { health: 1, speed: 0 }, () => {
          k.part({ shape: 'box', w: 1, h: 1, d: 1 })
        })
      }
    })
    return { api, step }
  }

  function nomes(api: KitApi, lista: unknown[]): string[] {
    return lista
      .map((e) => `${api.posOf(e, 'x')},${api.posOf(e, 'z')}`)
      .sort((x, y) => x.localeCompare(y))
  }

  it('fonte: a chave da célula é numérica (nada de texto montado a cada consulta)', () => {
    expect(gameKit3DRuntime.includes("gx + ',' + gz")).toBe(false)
    expect(/gridCells\[[^\]]*'/.test(gameKit3DRuntime)).toBe(false)
    expect(gameKit3DRuntime.includes('gridCells[gx * GRID_DIM + gz]')).toBe(true)
  })

  it('forEachNear reentrante: o gancho que consulta de novo não corrompe a volta de fora', async () => {
    const { api } = await kitComMoldes()
    const centro = api.spawn('a', 0, 0, 0)
    const as = [
      api.spawn('a', 2, 0, 0),
      api.spawn('a', -3, 0, 1),
      api.spawn('a', 0, 0, 4),
      api.spawn('a', 30, 0, 30), // longe: fora do raio
    ]
    const bs = [api.spawn('b', 3, 0, 0), api.spawn('b', -3, 0, 3), api.spawn('b', 0, 0, 6)]
    expect(as.every(Boolean) && bs.every(Boolean)).toBe(true)

    // O resultado sem reentrância é a régua.
    const simples: unknown[] = []
    api.forEachNear(centro, 'a', 6, (o) => simples.push(o))
    expect(nomes(api, simples)).toEqual(['-3,1', '0,4', '2,0'])

    const externos: unknown[] = []
    const internos: string[][] = []
    api.forEachNear(centro, 'a', 6, (o) => {
      externos.push(o)
      // Dois níveis abaixo: outro molde e o MESMO molde (a lista de fora não pode mudar).
      const bPerto: unknown[] = []
      api.forEachNear(o, 'b', 2, (b) => {
        bPerto.push(b)
        api.forEachNear(b, 'a', 50, () => {})
      })
      api.forEachNear(centro, 'a', 6, () => {})
      internos.push(nomes(api, bPerto))
    })
    expect(nomes(api, externos)).toEqual(nomes(api, simples))
    expect(externos.length).toBe(3)
    // Cada vizinho achou o "b" dele (ou nenhum), na ordem em que a volta de fora os visitou.
    expect(internos.flat().sort()).toEqual(['-3,3', '0,6', '3,0'])
    // Depois de tudo, a mesma consulta devolve o mesmo.
    const depois: unknown[] = []
    api.forEachNear(centro, 'a', 6, (o) => depois.push(o))
    expect(nomes(api, depois)).toEqual(nomes(api, simples))
  })

  it('entidade fora do mundo é achada (balde próprio) e sai dele ao ser recolhida', async () => {
    // O mundo do harness tem 100 de lado: a borda é ±50.
    const { api } = await kitComMoldes()
    const dentro = api.spawn('a', 48, 0, 0)
    const fora = api.spawn('b', 55, 0, 0)
    const longe = api.spawn('b', 900, 0, -700)
    expect(dentro && fora && longe).toBeTruthy()

    const perto: unknown[] = []
    api.forEachNear(dentro, 'b', 10, (o) => perto.push(o))
    expect(perto).toEqual([fora])
    expect(api.nearest('b', dentro)).toBe(fora)

    // De fora para dentro, e entre dois de fora (os dois longe da grade inteira).
    const deFora: unknown[] = []
    api.forEachNear(fora, 'a', 10, (o) => deFora.push(o))
    expect(deFora).toEqual([dentro])
    const vizinhoLonge = api.spawn('a', 903, 0, -702)
    const doLonge: unknown[] = []
    api.forEachNear(longe, 'a', 6, (o) => doLonge.push(o))
    expect(doLonge).toEqual([vizinhoLonge])
    expect(api.nearest('a', longe)).toBe(vizinhoLonge)

    // Recolhido, não volta em consulta nenhuma; teleportado para dentro, é achado pelas células.
    api.recycle(fora)
    const semFora: unknown[] = []
    api.forEachNear(dentro, 'b', 10, (o) => semFora.push(o))
    expect(semFora).toEqual([])
    api.place(longe, 44, 0, 0)
    const voltou: unknown[] = []
    api.forEachNear(dentro, 'b', 6, (o) => voltou.push(o))
    expect(voltou).toEqual([longe])
  })
})

describe('g3k — o mouse mira pelo retângulo do canvas na tela', () => {
  it('com a resolução real (pixel ratio do orçamento), o centro do RETÂNGULO do canvas acerta o centro do mundo', async () => {
    const { api, step } = await loadStartedKit((k) => {
      k.defineMold('alvo', { health: 1, speed: 0 }, () => {
        k.part({ shape: 'box', w: 2, h: 2, d: 2 })
      })
    })
    const stages = document.querySelectorAll('#szg3k-stage')
    const canvas = stages[stages.length - 1]?.querySelector('canvas')
    if (!canvas) throw new Error('sem canvas')
    // Canvas deslocado na página e menor que a régua (640×360): o desenho tem outro tamanho,
    // mas a conta do mouse usa só o retângulo CSS.
    const rect = {
      left: 100,
      top: 50,
      width: 320,
      height: 180,
      right: 420,
      bottom: 230,
      x: 100,
      y: 50,
    }
    canvas.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
    const alvo = api.spawn('alvo', 0, 0, 0)
    step(1)
    const kit = api as unknown as { pick(m: string): unknown }
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 260, clientY: 140 }),
    )
    expect(kit.pick('')).toBe(alvo)
    // No canto do retângulo não há ninguém.
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 102, clientY: 52 }),
    )
    expect(kit.pick('')).toBeNull()
  })
})
