import { beforeEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  GAME_RULES_3D_MARKER,
  GAME_RULES_PUBLIC_METHODS,
  gameRules3DRuntimeSource,
  withGameRules3DRuntime,
} from '../runtime'

/**
 * O fragmento das regras de jogo 3D avaliado ISOLADO, num `new Function` sobre o DOM do
 * happy-dom, com um host falso (o mesmo contrato que o Jogo 3D cumpre no runtime dele). É a
 * rede da parte comum: as extensões só ligam os ganchos.
 */

type Obj = { visible?: boolean; parent?: Obj | null; name?: string; _szLife?: unknown }
type Cam = { position: { x: number; y: number; z: number } }
interface Rules {
  hudText(corner: string, text: unknown): void
  panel(corner: string, key: string, order: number): HTMLElement | null
  dropPanel(corner: string, key: string): void
  addScore(n: number): void
  score(): number
  setLife(obj: Obj, n: number): void
  hurt(obj: Obj, n: number): void
  heal(obj: Obj, n: number): void
  lifeOf(obj: Obj): number
  onLifeOver(obj: Obj, fn: () => void): void
  startTimer(secs: number): void
  stopTimer(): void
  timeLeft(): number
  onTimerEnd(fn: () => void): void
  afterSeconds(secs: number, fn: () => void): void
  randomBetween(a: number, b: number): number
  randomChance(p: number): boolean
  blink(obj: Obj, secs: number): void
  cameraShake(strength: number, secs: number): void
  onKey(code: string, fn: () => void): void
  onClickObject(obj: Obj, fn: () => void): void
  onCanvasClick(fn: () => void): void
  onTouchGroup(obj: Obj, group: Obj[], fn: (item: Obj) => void): void
  setScreenText(kind: string, title: string, text: string, button: string): void
  endGame(result: string): void
  restart(): void
  step(dt: number): void
  beforeFrame(cam: Cam): void
  afterFrame(cam: Cam, dt: number): void
  key(code: string): void
  click(hit: Obj | null): void
  running(): boolean
  reset(): void
  dispose(): void
}

const createSzGameRules = new Function(
  `${gameRules3DRuntimeSource}\nreturn createSzGameRules;`,
)() as (host: Record<string, unknown>) => Rules

function setup(options: { random?: number[] } = {}) {
  const state = {
    paused: false,
    restarts: 0,
    wakes: 0,
    clickWired: 0,
    deferred: [] as (() => void)[],
    touching: new Set<Obj>(),
  }
  const randoms = [...(options.random ?? [])]
  let rules: Rules
  const host = {
    pause: () => {
      state.paused = true
    },
    resume: () => {
      state.paused = false
    },
    restart: () => {
      state.restarts++
      rules.reset()
      state.paused = false
    },
    wake: () => {
      state.wakes++
    },
    wireClick: () => {
      state.clickWired++
    },
    defer: (fn: () => void) => {
      state.deferred.push(fn)
    },
    random: () => randoms.shift() ?? 0.5,
    warn: () => {},
    touching: (_obj: Obj, group: Obj[], out: Obj[]) => {
      out.length = 0
      for (const other of group) if (state.touching.has(other)) out.push(other)
      return out
    },
  }
  rules = createSzGameRules(host)
  const flush = () => {
    const pending = state.deferred.splice(0)
    for (const fn of pending) fn()
  }
  return { rules, state, flush }
}

const corner = (name: string) => document.querySelector(`.szr-${name}`)
const panelTexts = (name: string) =>
  [...(corner(name)?.querySelectorAll('.szr-panel') ?? [])].map((el) => el.textContent)
const screen = () => document.querySelector('.szr-screen')

beforeEach(() => {
  document.body.innerHTML = ''
  for (const style of document.querySelectorAll('style[data-sz-game-rules]')) style.remove()
})

describe('regras de jogo 3D — o fragmento compartilhado', () => {
  it('clique no jogo independe de acertar um objeto, respeita pausa e não sobrevive ao recomeço', () => {
    const { rules, state } = setup()
    const object: Obj = {}
    let sceneClicks = 0,
      objectClicks = 0
    rules.onCanvasClick(() => sceneClicks++)
    rules.onClickObject(object, () => objectClicks++)
    rules.click(null)
    expect([sceneClicks, objectClicks]).toEqual([1, 0])
    rules.click(object)
    expect([sceneClicks, objectClicks]).toEqual([2, 1])
    expect(state.clickWired).toBe(2)
    rules.endGame('perdeu')
    rules.click(null)
    expect(sceneClicks).toBe(2)
    rules.reset()
    rules.click(object)
    expect([sceneClicks, objectClicks]).toEqual([2, 1])
    rules.dispose()
  })
  it('texto central usa a camada do jogo, atualiza sem duplicar e sai com a execução', () => {
    const { rules } = setup()
    rules.hudText('center', '+')
    const center = document.querySelector('.szr-center [data-szr-panel="texto"]')
    expect(center?.textContent).toBe('+')
    rules.hudText('center', '×')
    expect(document.querySelectorAll('.szr-center [data-szr-panel="texto"]')).toHaveLength(1)
    expect(center?.textContent).toBe('×')
    rules.hudText('center', '')
    expect(document.querySelector('.szr-center [data-szr-panel="texto"]')).toBeNull()
    rules.dispose()
    expect(document.querySelector('.szr-layer')).toBeNull()
  })
  it('é JavaScript válido, sem crase nem cifrão-chave, e entra pelo marcador uma vez só', () => {
    const source = readFileSync(join(import.meta.dir, '..', 'runtime.ts'), 'utf8')
    const start = source.indexOf('const GAME_RULES_3D_SOURCE = `')
    const end = source.indexOf('`\n', start + 31)
    const literal = source.slice(start + 31, end)
    expect(literal.includes('${')).toBe(false)
    expect(() => new Function(gameRules3DRuntimeSource)).not.toThrow()
    // Comentário de linha e indentação saem do payload.
    expect(gameRules3DRuntimeSource).not.toMatch(/^\s*\/\//m)
    expect(withGameRules3DRuntime(`a\n${GAME_RULES_3D_MARKER}\nb`)).toContain(
      'function createSzGameRules',
    )
    expect(() => withGameRules3DRuntime('sem marcador')).toThrow()
    expect(() => withGameRules3DRuntime(`${GAME_RULES_3D_MARKER}${GAME_RULES_3D_MARKER}`)).toThrow()
  })

  it('não toca o DOM ao ser criado (o runtime é avaliado sem documento nos testes)', () => {
    const { rules } = setup()
    expect(document.querySelector('.szr-layer')).toBeNull()
    for (const method of GAME_RULES_PUBLIC_METHODS) {
      if (method === 'restart') continue
      expect(typeof (rules as unknown as Record<string, unknown>)[method], method).toBe('function')
    }
  })

  it('empilha cada canto pela ordem: o texto da criança primeiro, depois os automáticos e os de fora', () => {
    const { rules } = setup()
    const heroi: Obj = {}
    rules.setLife(heroi, 3)
    rules.hudText('top-left', 'Pegue as estrelas!')
    const externo = rules.panel('top-left', 'missao', 40)
    if (externo) externo.textContent = 'Missão: 2/5'
    const antes = rules.panel('top-left', 'aviso', 5)
    if (antes) antes.textContent = 'Primeiro'
    expect(panelTexts('top-left')).toEqual(['Primeiro', 'Pegue as estrelas!', '❤️❤️❤️', 'Missão: 2/5'])
    // Texto vazio apaga só o texto da criança.
    rules.hudText('top-left', '')
    expect(panelTexts('top-left')).toEqual(['Primeiro', '❤️❤️❤️', 'Missão: 2/5'])
    // Canto desconhecido cai no ↖, sem quebrar.
    rules.hudText('lugar-nenhum', 7)
    expect(panelTexts('top-left')).toContain('7')
    // A fonte da interface dos jogos vem da variável de CSS (nunca carregada aqui).
    expect(document.querySelector('style[data-sz-game-rules]')?.textContent).toContain(
      'var(--sz-game-ui-font)',
    )
  })

  it('pontos aparecem sozinhos no canto de cima à direita', () => {
    const { rules } = setup()
    expect(corner('top-right')).toBeNull()
    rules.addScore(1)
    rules.addScore(2)
    expect(rules.score()).toBe(3)
    expect(panelTexts('top-right')).toEqual(['⭐ 3'])
  })

  it('vida: corações do herói, invencível 1 s piscando, e "vida acabou" uma vez só', () => {
    const { rules } = setup()
    const heroi: Obj = { visible: true }
    const inimigo: Obj = { visible: true }
    let acabou = 0
    rules.onLifeOver(heroi, () => acabou++)
    rules.setLife(heroi, 2)
    rules.setLife(inimigo, 5)
    expect(panelTexts('top-left')).toEqual(['❤️❤️'])

    rules.hurt(heroi, 1)
    expect(rules.lifeOf(heroi)).toBe(1)
    expect(panelTexts('top-left')).toEqual(['❤️🤍'])
    // Invencível: o segundo encostão no mesmo segundo não conta.
    rules.hurt(heroi, 1)
    expect(rules.lifeOf(heroi)).toBe(1)
    // Pisca enquanto está invencível e volta a aparecer no fim.
    const visto = new Set<boolean | undefined>()
    for (let i = 0; i < 10; i++) {
      rules.step(0.05)
      visto.add(heroi.visible)
    }
    expect(visto).toEqual(new Set([true, false]))
    rules.step(0.6)
    expect(heroi.visible).toBe(true)

    rules.hurt(heroi, 1)
    expect(rules.lifeOf(heroi)).toBe(0)
    expect(acabou).toBe(1)
    rules.step(1.2)
    rules.hurt(heroi, 1)
    expect(acabou).toBe(1)
    // Curar devolve a vida (e os corações acompanham).
    rules.heal(heroi, 2)
    expect(rules.lifeOf(heroi)).toBe(2)
    expect(panelTexts('top-left')).toEqual(['❤️❤️'])
    // Só o herói tem corações na tela.
    expect(rules.lifeOf(inimigo)).toBe(5)
  })

  it('contagem regressiva: aparece, desce com o quadro e avisa uma vez no zero', () => {
    const { rules, state } = setup()
    let acabou = 0
    rules.onTimerEnd(() => acabou++)
    rules.startTimer(3)
    expect(state.wakes).toBeGreaterThan(0)
    expect(panelTexts('top-center')).toEqual(['⏱️ 3'])
    rules.step(1)
    expect(rules.timeLeft()).toBe(2)
    expect(panelTexts('top-center')).toEqual(['⏱️ 2'])
    rules.step(2.5)
    expect(rules.timeLeft()).toBe(0)
    expect(acabou).toBe(1)
    rules.step(1)
    expect(acabou).toBe(1)
    // Parar congela o que falta.
    rules.startTimer(5)
    rules.step(1)
    rules.stopTimer()
    rules.step(3)
    expect(rules.timeLeft()).toBe(4)
  })

  it('"depois de N segundos" roda uma vez só, contando o tempo de jogo', () => {
    const { rules } = setup()
    let vezes = 0
    rules.afterSeconds(2, () => vezes++)
    rules.step(1)
    expect(vezes).toBe(0)
    rules.step(1.1)
    expect(vezes).toBe(1)
    rules.step(5)
    expect(vezes).toBe(1)
  })

  it('sorteio: inteiro de a até b (os dois contam) e chance em porcentagem', () => {
    const { rules } = setup({ random: [0, 0.999, 0.5, 0.29, 0.31] })
    expect(rules.randomBetween(1, 6)).toBe(1)
    expect(rules.randomBetween(6, 1)).toBe(6)
    expect(rules.randomBetween(1, 6)).toBe(4)
    expect(rules.randomChance(30)).toBe(true)
    expect(rules.randomChance(30)).toBe(false)
  })

  it('tela de início segura o jogo até "Jogar"; os eventos esperam junto', () => {
    const { rules, state } = setup()
    let teclas = 0
    rules.onKey('Space', () => teclas++)
    rules.setScreenText('inicio', 'Caça às Estrelas', 'Pegue todas!', 'Jogar')
    expect(state.paused).toBe(true)
    expect(screen()?.getAttribute('data-szr-screen')).toBe('inicio')
    expect(screen()?.textContent).toContain('Caça às Estrelas')
    expect(screen()?.getAttribute('role')).toBe('dialog')
    rules.key('Space')
    expect(teclas).toBe(0)
    ;(screen()?.querySelector('button') as HTMLButtonElement).click()
    expect(state.paused).toBe(false)
    expect(screen()).toBeNull()
    rules.key('Space')
    rules.key('Enter')
    expect(teclas).toBe(1)
  })

  it('fim de jogo pausa os laços e mostra a tela; "Jogar de novo" recomeça fora do quadro', () => {
    const { rules, state, flush } = setup()
    let depois = 0
    rules.setScreenText('fim', 'Ops!', 'Tente de novo', '')
    rules.addScore(4)
    rules.afterSeconds(1, () => depois++)
    rules.endGame('perdeu')
    expect(state.paused).toBe(true)
    expect(rules.running()).toBe(false)
    expect(screen()?.getAttribute('data-szr-screen')).toBe('fim')
    expect(screen()?.textContent).toContain('Ops!')
    expect(screen()?.textContent).toContain('⭐ 4 pontos')
    // Botão vazio usa o texto padrão.
    expect(screen()?.querySelector('button')?.textContent).toBe('Jogar de novo')
    rules.step(2)
    expect(depois).toBe(0)
    // Fim de jogo repetido não troca a tela.
    rules.endGame('ganhou')
    expect(screen()?.getAttribute('data-szr-screen')).toBe('fim')

    ;(screen()?.querySelector('button') as HTMLButtonElement).click()
    expect(state.restarts).toBe(0)
    flush()
    expect(state.restarts).toBe(1)
    expect(rules.score()).toBe(0)
    expect(screen()).toBeNull()
    expect(rules.running()).toBe(true)
    rules.step(2)
    expect(depois).toBe(0)
  })

  it('vitória usa a tela própria e o texto padrão quando a criança não escreveu', () => {
    const { rules } = setup()
    rules.endGame('ganhou')
    expect(screen()?.getAttribute('data-szr-screen')).toBe('vitoria')
    expect(screen()?.textContent).toContain('Você venceu!')
  })

  it('recomeçar limpa pontos, vidas, contagem, handlers e painéis próprios, mantendo os de fora', () => {
    const { rules, flush, state } = setup()
    const heroi: Obj = {}
    rules.setLife(heroi, 3)
    rules.addScore(10)
    rules.startTimer(9)
    rules.hudText('bottom-right', 'oi')
    const externo = rules.panel('top-right', 'moedas', 60)
    if (externo) externo.textContent = '🪙 3'
    let teclas = 0
    rules.onKey('KeyR', () => teclas++)
    rules.setScreenText('inicio', 'Início', '', 'Jogar')
    ;(screen()?.querySelector('button') as HTMLButtonElement).click()

    rules.restart()
    rules.restart()
    flush()
    expect(state.restarts).toBe(1)
    expect(rules.score()).toBe(0)
    expect(rules.timeLeft()).toBe(0)
    expect(rules.lifeOf(heroi)).toBe(0)
    expect(heroi._szLife).toBeUndefined()
    expect(panelTexts('top-left')).toEqual([])
    expect(panelTexts('bottom-right')).toEqual([])
    expect(panelTexts('top-right')).toEqual(['🪙 3'])
    rules.key('KeyR')
    expect(teclas).toBe(0)
    // A tela de início aparece uma vez por página: o recomeçar volta direto ao jogo.
    rules.setScreenText('inicio', 'Início', '', 'Jogar')
    expect(screen()).toBeNull()
    expect(rules.running()).toBe(true)
  })

  it('tremer a câmera volta exatamente ao lugar e para sozinho', () => {
    const { rules } = setup({ random: [1, 0, 1, 0, 1, 0] })
    const cam: Cam = { position: { x: 1, y: 2, z: 3 } }
    rules.cameraShake(1, 0.4)
    rules.beforeFrame(cam)
    rules.afterFrame(cam, 0.1)
    expect(cam.position).not.toEqual({ x: 1, y: 2, z: 3 })
    rules.beforeFrame(cam)
    expect(cam.position.x).toBeCloseTo(1)
    expect(cam.position.y).toBeCloseTo(2)
    expect(cam.position.z).toBeCloseTo(3)
    for (let i = 0; i < 6; i++) {
      rules.afterFrame(cam, 0.1)
      rules.beforeFrame(cam)
    }
    // Passado o tempo, o quadro seguinte não mexe mais na câmera.
    rules.afterFrame(cam, 0.1)
    rules.afterFrame(cam, 0.1)
    expect(cam.position.x).toBeCloseTo(1, 9)
    expect(cam.position.y).toBeCloseTo(2, 9)
    expect(cam.position.z).toBeCloseTo(3, 9)
  })

  it('piscar some e aparece e devolve a visibilidade de antes', () => {
    const { rules } = setup()
    const moeda: Obj = { visible: true }
    const escondido: Obj = { visible: false }
    rules.blink(moeda, 0.5)
    rules.blink(escondido, 0.2)
    const visto = new Set<boolean | undefined>()
    for (let i = 0; i < 4; i++) {
      rules.step(0.1)
      visto.add(moeda.visible)
    }
    expect(visto.has(false)).toBe(true)
    rules.step(0.3)
    expect(moeda.visible).toBe(true)
    expect(escondido.visible).toBe(false)
  })

  it('encostar no grupo dispara na ENTRADA do contato, uma vez por entrada', () => {
    const { rules, state } = setup()
    const heroi: Obj = {}
    const a: Obj = { name: 'a' }
    const b: Obj = { name: 'b' }
    const grupo = [a, b]
    const pegou: string[] = []
    rules.onTouchGroup(heroi, grupo, (item) => {
      pegou.push(item.name ?? '')
      grupo.splice(grupo.indexOf(item), 1)
    })
    rules.step(0.016)
    expect(pegou).toEqual([])
    state.touching.add(a)
    rules.step(0.016)
    rules.step(0.016)
    expect(pegou).toEqual(['a'])
    state.touching.add(b)
    rules.step(0.016)
    expect(pegou).toEqual(['a', 'b'])
  })

  it('encostar continuado não repete; sair e voltar conta de novo', () => {
    const { rules, state } = setup()
    const heroi: Obj = {}
    const inimigo: Obj = { name: 'i' }
    let vezes = 0
    rules.onTouchGroup(heroi, [inimigo], () => vezes++)
    state.touching.add(inimigo)
    for (let i = 0; i < 5; i++) rules.step(0.016)
    expect(vezes).toBe(1)
    state.touching.delete(inimigo)
    rules.step(0.016)
    state.touching.add(inimigo)
    rules.step(0.016)
    expect(vezes).toBe(2)
  })

  it('clique acerta o objeto (ou uma peça dele) e liga o clique uma vez no host', () => {
    const { rules, state } = setup()
    const botao: Obj = {}
    const peca: Obj = { parent: botao }
    const outro: Obj = {}
    let cliques = 0
    rules.onClickObject(botao, () => cliques++)
    expect(state.clickWired).toBe(1)
    rules.click(peca)
    rules.click(outro)
    expect(cliques).toBe(1)
  })

  it('um erro no corpo de um evento não derruba os outros', () => {
    const { rules } = setup()
    let segundo = 0
    rules.onKey('Space', () => {
      throw new Error('erro de propósito')
    })
    rules.onKey('Space', () => segundo++)
    rules.key('Space')
    expect(segundo).toBe(1)
  })

  it('dispose remove a camada e o estilo do documento', () => {
    const { rules } = setup()
    rules.hudText('top-left', 'oi')
    expect(document.querySelector('.szr-layer')).not.toBeNull()
    rules.dispose()
    expect(document.querySelector('.szr-layer')).toBeNull()
    expect(document.querySelector('style[data-sz-game-rules]')).toBeNull()
  })
})

describe('regras de jogo 3D — piscar não desfaz o que a criança pediu', () => {
  it('esconder no meio da piscada vence: a piscada acaba e o objeto fica escondido', () => {
    const { rules } = setup()
    const moeda: Obj = { visible: true }
    rules.blink(moeda, 1)
    rules.step(0.1)
    rules.step(0.1)
    moeda.visible = false // "Esconder" no meio da piscada
    for (let i = 0; i < 12; i++) rules.step(0.1)
    expect(moeda.visible).toBe(false)
    // Mostrar no meio também vence.
    const outra: Obj = { visible: true }
    rules.blink(outra, 1)
    rules.step(0.0625) // a piscada apaga
    expect(outra.visible).toBe(false)
    outra.visible = true
    for (let i = 0; i < 12; i++) rules.step(0.1)
    expect(outra.visible).toBe(true)
  })

  it('fim de jogo no meio da piscada devolve o objeto como era', () => {
    const { rules } = setup()
    const heroi: Obj = { visible: true }
    rules.setLife(heroi, 3)
    rules.hurt(heroi, 1) // machucar pisca por 1 s
    rules.step(0.0625)
    expect(heroi.visible).toBe(false)
    rules.endGame('perdeu')
    expect(heroi.visible).toBe(true)
    rules.step(0.1)
    expect(heroi.visible).toBe(true)
  })
})

describe('regras de jogo 3D — a camada do HUD mede o canvas só no reajuste', () => {
  it('60 quadros não leem offset*; o ResizeObserver do canvas acerta a caixa', async () => {
    const { installResizeObserverStub } = await import('../../__tests__/three3d/resizeObserverStub')
    const ro = installResizeObserverStub()
    try {
      const wrap = document.createElement('div')
      const canvas = document.createElement('canvas')
      wrap.appendChild(canvas)
      document.body.appendChild(wrap)
      let reads = 0
      const box = { left: 10, top: 20, width: 480, height: 360 }
      for (const [prop, key] of [
        ['offsetLeft', 'left'],
        ['offsetTop', 'top'],
        ['offsetWidth', 'width'],
        ['offsetHeight', 'height'],
      ] as const) {
        Object.defineProperty(canvas, prop, {
          configurable: true,
          get() {
            reads++
            return box[key]
          },
        })
      }
      const rules = createSzGameRules({ canvas: () => canvas })
      rules.hudText('top-left', 'oi')
      const layer = document.querySelector('.szr-layer') as HTMLElement
      expect(layer.style.width).toBe('480px')
      expect(ro.observed).toContain(canvas)
      reads = 0
      const cam = { position: { x: 0, y: 0, z: 0 } }
      for (let i = 0; i < 60; i++) {
        rules.step(1 / 60)
        rules.beforeFrame(cam)
        rules.afterFrame(cam, 1 / 60)
      }
      expect(reads).toBe(0)
      box.width = 640
      ro.fire()
      expect(layer.style.width).toBe('640px')
      rules.dispose()
      expect(ro.disconnects).toBe(1)
    } finally {
      ro.restore()
    }
  })
})
