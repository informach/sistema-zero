import { afterEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { generateProjectFiles } from '../../../generators/project'
import { behaviorStatements, normalizeSZIR } from '../../../ir'
import { parseProjectFiles } from '../../../parsers'
import { parseJS } from '../../../parsers/js'
import { gameThreeDRuntime } from '../runtime'

/**
 * As regras de jogo no Jogo 3D de ponta a ponta, com o Three.js REAL: o código que a Ponte
 * lê vira blocos sem código avançado, o gerador embrulha na partida gerenciada, e o mini-jogo
 * roda sobre o runtime de verdade (renderer falso, DOM do happy-dom): pegar estrela soma
 * ponto, encostar no inimigo tira a vida, a vida acaba no fim de jogo e "Jogar de novo"
 * recomeça a partida do zero no MESMO documento, sem vazar listener nem cena.
 */

class FakeRenderer {
  static created: FakeRenderer[] = []
  shadowMap = { enabled: false, type: 0 }
  loop: ((time: number) => void) | null = null
  renders = 0
  lost = false
  constructor() {
    FakeRenderer.created.push(this)
  }
  setPixelRatio() {}
  setSize() {}
  setAnimationLoop(loop: ((time: number) => void) | null) {
    this.loop = loop
  }
  render() {
    this.renders++
  }
  dispose() {}
  forceContextLoss() {
    this.lost = true
  }
}

const SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0b1020");
const heroi = SZGame3D.createBox(cena, { size: 1, color: "#34d399" });
const molde = SZGame3D.createBox(cena, { size: 1, color: "#facc15" });
SZGame3D.setPosition(molde, 0, 50, 0);
const estrelas = SZGame3D.createGroup();
SZGame3D.spawnCopy(estrelas, molde, 3, 0, 0);
const inimigos = SZGame3D.createGroup();
SZGame3D.spawnCopy(inimigos, molde, -3, 0, 0);
SZGame3D.setLife(heroi, 1);
SZGame3D.setScreenText("fim", "Ops!", "O inimigo pegou você", "Jogar de novo");
SZGame3D.onTouchGroup(heroi, estrelas, (estrela) => {
  SZGame3D.addScore(1);
  SZGame3D.removeFromGroup(estrelas, estrela);
});
SZGame3D.onTouchGroup(heroi, inimigos, (inimigo) => {
  SZGame3D.hurt(heroi, 1);
});
SZGame3D.onLifeOver(heroi, () => {
  SZGame3D.endGame("perdeu");
});
SZGame3D.animate(cena, () => {
  SZGame3D.hudText("top-left", "Pontos: " + SZGame3D.score());
});
`.trim()

type Api = Record<string, (...args: unknown[]) => unknown>

function boot() {
  FakeRenderer.created = []
  const listeners = new Map<string, Set<unknown>>()
  const win: Record<string, unknown> = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    SZGame3D: undefined,
    addEventListener(name: string, fn: unknown) {
      const set = listeners.get(name) ?? new Set()
      set.add(fn)
      listeners.set(name, set)
    },
    removeEventListener(name: string, fn: unknown) {
      listeners.get(name)?.delete(fn)
    },
  }
  const body = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  new Function('THREE', 'window', 'document', body)(
    { ...THREE, WebGLRenderer: FakeRenderer },
    win,
    document,
  )
  const real = win.SZGame3D as Api
  const boxes: THREE.Object3D[] = []
  const copies: THREE.Object3D[] = []
  const api: Api = {
    ...real,
    createBox: (...args) => {
      const box = real.createBox?.(...args) as THREE.Object3D
      boxes.push(box)
      return box
    },
    spawnCopy: (...args) => {
      const copy = real.spawnCopy?.(...args) as THREE.Object3D
      copies.push(copy)
      return copy
    },
  }
  const total = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0)
  const fire = (name: string, event: unknown) => {
    for (const fn of listeners.get(name) ?? []) (fn as (event: unknown) => void)(event)
  }
  return { win, api, real, boxes, copies, total, fire }
}

const hud = () =>
  [...document.querySelectorAll('.szr-top-left .szr-panel')].map((el) => el.textContent)
const screen = () => document.querySelector('.szr-screen')
const frame = (() => {
  let t = 0
  return () => {
    t += 16
    const renderer = FakeRenderer.created.at(-1)
    renderer?.loop?.(t)
  }
})()

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Jogo 3D — regras de jogo de ponta a ponta', () => {
  it('a Ponte lê o mini-jogo inteiro em blocos e o gerador usa a partida gerenciada', () => {
    const js = parseJS(SOURCE)
    expect(JSON.stringify(js)).not.toContain('rawJS')
    const ir = normalizeSZIR({ html: [], css: [], js, extensions: [{ extensionId: 'game-3d' }] })
    // Os "Quando…" moram em ⚡ Quando acontecer.
    expect(ir.behavior?.events.map((statement) => statement.type)).toEqual([
      'g3d:onGame',
      'g3d:onGame',
      'g3d:onGame',
    ])
    const files = generateProjectFiles({ ir, projectName: 'Pega-Estrelas' })
    expect(files['script.js']).toContain(
      'window.__SZProjectLifecycle.begin(() => SZGame3D.restart());',
    )
    // E o envelope volta pela Ponte sem ser re-embrulhado.
    const parsed = parseProjectFiles(files)
    expect(behaviorStatements(parsed).length).toBe(behaviorStatements(ir).length)
  })

  it('pegar estrela soma ponto, o inimigo acaba com a vida e "Jogar de novo" zera a partida', async () => {
    const { win, api, real, boxes, total } = boot()
    const ir = normalizeSZIR({
      html: [],
      css: [],
      js: parseJS(SOURCE),
      extensions: [{ extensionId: 'game-3d' }],
    })
    const script = generateProjectFiles({ ir, projectName: 'Pega-Estrelas' })['script.js']
    const run = new Function('window', 'SZGame3D', script)
    run(win, api)

    const heroi = boxes[0]
    if (!heroi) throw new Error('o herói não nasceu')
    frame()
    expect(hud()).toContain('Pontos: 0')
    expect(hud()).toContain('❤️')
    const listenersNaPartida = total()

    // Pega a estrela: um ponto, e ela sai do grupo (não conta de novo).
    real.setPosition?.(heroi, 3, 0, 0)
    frame()
    frame()
    frame()
    expect(real.score?.()).toBe(1)
    expect(hud()).toContain('Pontos: 1')

    // Encosta no inimigo: a vida acaba e o fim de jogo pausa os laços.
    real.setPosition?.(heroi, -3, 0, 0)
    frame()
    expect(real.lifeOf?.(heroi)).toBe(0)
    expect(screen()?.getAttribute('data-szr-screen')).toBe('fim')
    expect(screen()?.textContent).toContain('O inimigo pegou você')
    expect(screen()?.textContent).toContain('⭐ 1 pontos')
    const rendererAntigo = FakeRenderer.created.at(-1)
    const desenhos = rendererAntigo?.renders ?? 0
    frame()
    // A cena segue desenhada por trás da tela, mas o laço da criança parou.
    expect(rendererAntigo?.renders).toBe(desenhos + 1)

    // "Jogar de novo": a partida recomeça FORA do quadro, do zero.
    ;(screen()?.querySelector('button') as HTMLButtonElement).click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(rendererAntigo?.lost).toBe(true)
    expect(FakeRenderer.created.length).toBe(2)
    expect(document.querySelectorAll('canvas').length).toBe(1)
    expect(boxes.length).toBe(4)
    expect(screen()).toBeNull()
    expect(real.score?.()).toBe(0)
    frame()
    expect(hud()).toContain('Pontos: 0')
    // Nenhum listener da partida velha ficou para trás.
    expect(total()).toBe(listenersNaPartida)

    // A partida nova joga de verdade (a estrela voltou).
    const heroiNovo = boxes[2]
    if (!heroiNovo) throw new Error('o herói novo não nasceu')
    expect(real.lifeOf?.(heroiNovo)).toBe(1)
    real.setPosition?.(heroiNovo, 3, 0, 0)
    frame()
    expect(real.score?.()).toBe(1)
  })

  it('"Recomeçar o jogo" pedido no meio de um quadro termina o quadro velho antes', async () => {
    const { real } = boot()
    let quadros = 0
    let factories = 0
    real.runProject?.(() => {
      factories++
      const cena = real.createFullscreenScene?.('#000')
      real.animate?.(cena, () => {
        quadros++
        if (quadros === 2) real.restart?.()
      })
    })
    frame()
    frame()
    expect(factories).toBe(1)
    frame()
    // Pausado esperando o recomeçar: o laço velho não roda de novo.
    expect(quadros).toBe(2)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(factories).toBe(2)
    frame()
    expect(quadros).toBe(3)
  })

  it('"Quando apertar a tecla" roda uma vez por aperto e "clicar no objeto" acerta o objeto', () => {
    const { real, fire } = boot()
    let teclas = 0
    let cliques = 0
    let canvas: HTMLCanvasElement | null = null
    real.runProject?.(() => {
      const cena = real.createFullscreenScene?.('#000') as { _canvas: HTMLCanvasElement }
      canvas = cena._canvas
      const alvo = real.createBox?.(cena, { size: 2 })
      real.onKey?.('Space', () => teclas++)
      real.onClickObject?.(alvo, () => cliques++)
    })
    const key = (type: string) => fire(type, { code: 'Space', preventDefault() {} })
    key('keydown')
    key('keydown') // a repetição do sistema (tecla segurada) não conta
    key('keyup')
    key('keydown')
    expect(teclas).toBe(2)

    // Clique no meio da tela: o raio do centro acerta o cubo na origem.
    const target = canvas as HTMLCanvasElement | null
    if (!target) throw new Error('sem canvas')
    target.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }) as DOMRect
    const click = (x: number, y: number) => {
      const event = new window.Event('pointerdown') as Event & { clientX: number; clientY: number }
      Object.assign(event, { clientX: x, clientY: y })
      target.dispatchEvent(event)
    }
    click(400, 300)
    expect(cliques).toBe(1)
    click(5, 5)
    expect(cliques).toBe(1)
  })

  it('"Remover" tira o objeto também do grupo: a contagem e o "para cada" não veem quem sumiu', () => {
    const { real } = boot()
    let estrelas: unknown[] = []
    let primeira: unknown = null
    real.runProject?.(() => {
      const cena = real.createFullscreenScene?.('#000')
      const molde = real.createBox?.(cena, { size: 1 })
      estrelas = real.createGroup?.() as unknown[]
      primeira = real.spawnCopy?.(estrelas, molde, 1, 0, 0)
      real.spawnCopy?.(estrelas, molde, 2, 0, 0)
      expect(real.countGroup?.(estrelas)).toBe(2)
      real.remove?.(cena, primeira)
    })
    expect(real.countGroup?.(estrelas)).toBe(1)
    const vistos: unknown[] = []
    real.forEachInGroup?.(estrelas, (item: unknown) => vistos.push(item))
    expect(vistos).not.toContain(primeira)
  })
})

describe('Jogo 3D — peça de efeito do modelo fora da área de toque', () => {
  it('um nó com szSemCaixa (o feixe do farol) não aumenta a caixa do encontro', () => {
    const { api } = boot()
    const cena = api.createFullscreenScene?.('#000') as unknown
    const farol = api.createBox?.(cena, { size: 1 }) as THREE.Mesh
    const heroi = api.createBox?.(cena, { size: 1 }) as THREE.Mesh
    api.setPosition?.(heroi, 3, 0, 0)
    // O modelo montado: o corpo no lugar do objeto e o feixe comprido para o lado do herói.
    const modelo = new THREE.Group()
    const feixe = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 0.2))
    feixe.position.set(2, 0, 0)
    modelo.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), feixe)
    farol.add(modelo)
    ;(farol.userData.sz as Record<string, unknown>).modelRoot = modelo
    // Sem a marca, o feixe conta (a régua de sempre).
    expect(api.hitAny?.(heroi, [farol])).toBe(true)
    // Marcado como efeito, ele sai da caixa; o corpo continua valendo.
    const outro = new THREE.Group()
    const feixe2 = feixe.clone()
    feixe2.userData = { szSemCaixa: true }
    outro.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), feixe2)
    farol.remove(modelo)
    farol.add(outro)
    ;(farol.userData.sz as Record<string, unknown>).modelRoot = outro
    expect(api.hitAny?.(heroi, [farol])).toBe(false)
    api.setPosition?.(heroi, 0.8, 0, 0)
    expect(api.hitAny?.(heroi, [farol])).toBe(true)
  })
})
