import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { gameKitRuntime } from '../runtime'

// happy-dom devolve null em getContext('2d') — o render() sairia cedo e o laço
// de desenho ficaria invisível ao teste. Stub mínimo, com RESTORE no afterAll
// (o registro de módulos do bun não é isolado por arquivo).
const canvasProto = (globalThis as { HTMLCanvasElement?: { prototype: object } }).HTMLCanvasElement
  ?.prototype as { getContext?: unknown } | undefined
const originalGetContext = canvasProto?.getContext
const fakeCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  imageSmoothingEnabled: true,
  fillRect() {},
  strokeRect() {},
  drawImage() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
}

beforeAll(() => {
  if (canvasProto) canvasProto.getContext = () => fakeCtx
})

afterAll(() => {
  if (canvasProto) canvasProto.getContext = originalGetContext
})

/**
 * Testes do runtime SZGameKit avaliado num escopo controlado: `window` é um
 * stub (listeners capturados, relógio controlável) e `requestAnimationFrame`
 * captura o callback p/ os testes rodarem os quadros NA MÃO. O DOM real vem do
 * happy-dom do preload (o runtime usa `document` bare — igual ao iframe).
 */

type Listener = (ev: unknown) => void

type Fn = (...args: unknown[]) => unknown

/** A superfície pública do runtime (1 método por bloco) — tipagem nomeada p/ o
 * noUncheckedIndexedAccess não reclamar de cada chamada. */
interface GameKitApi {
  setup: Fn
  start: Fn
  width: Fn
  height: Fn
  loadImage: Fn
  setScreenText: Fn
  createScreen: Fn
  addButton: Fn
  showScreen: Fn
  hideScreens: Fn
  setState: Fn
  onEnterState: Fn
  stateIs: Fn
  state: Fn
  pause: Fn
  resume: Fn
  returnToMenu: Fn
  endGame: Fn
  onUpdate: Fn
  onDraw: Fn
  drawBackground: Fn
  createCharacter: Fn
  moveWithKeys: Fn
  keepOnScreen: Fn
  drawCharacter: Fn
  placeCharacter: Fn
  resetCharacter: Fn
  setSpeedMultiplier: Fn
  touching: Fn
  charX: Fn
  charY: Fn
  keyDown: Fn
  setPauseKey: Fn
}

interface Harness {
  api: GameKitApi
  listeners: Record<string, Listener[]>
  fire: (name: string, ev?: unknown) => void
  clock: { value: number }
  nextFrame: (ts: number) => void
  rafCount: () => number
}

function loadRuntime(): Harness {
  const listeners: Record<string, Listener[]> = {}
  const clock = { value: 0 }
  const rafQueue: Array<(ts: number) => void> = []
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => clock.value },
    innerWidth: 1200,
    innerHeight: 700,
    SZGameKit: undefined,
  } as unknown as Record<string, unknown>
  const raf = (cb: (ts: number) => void) => {
    rafQueue.push(cb)
    return rafQueue.length
  }
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(win, raf)
  const api = win.SZGameKit as Harness['api']
  if (!api) throw new Error('runtime não montou window.SZGameKit')
  return {
    api,
    listeners,
    fire: (name, ev = {}) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
    clock,
    nextFrame: (ts) => {
      const cb = rafQueue.shift()
      if (!cb) throw new Error('nenhum quadro agendado')
      cb(ts)
    },
    rafCount: () => rafQueue.length,
  }
}

/** Sobe o jogo: start() + espera as promessas de carregamento resolverem. */
async function startGame(h: Harness): Promise<void> {
  h.api.start()
  // Promise.all(pending) resolve em microtask — 2 voltas dão folga.
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  for (const el of Array.from(document.querySelectorAll('#szgk-stage, #szgk-style'))) {
    el.remove()
  }
})

describe('SZGameKit — API e personagens (sem DOM)', () => {
  it('expõe os 33 métodos (1 por bloco)', () => {
    const { api } = loadRuntime()
    const expected = [
      'setup',
      'start',
      'width',
      'height',
      'loadImage',
      'setScreenText',
      'createScreen',
      'addButton',
      'showScreen',
      'hideScreens',
      'setState',
      'onEnterState',
      'stateIs',
      'state',
      'pause',
      'resume',
      'returnToMenu',
      'endGame',
      'onUpdate',
      'onDraw',
      'drawBackground',
      'createCharacter',
      'moveWithKeys',
      'keepOnScreen',
      'drawCharacter',
      'placeCharacter',
      'resetCharacter',
      'setSpeedMultiplier',
      'touching',
      'charX',
      'charY',
      'keyDown',
      'setPauseKey',
    ]
    const rec = api as unknown as Record<string, unknown>
    for (const m of expected) expect(typeof rec[m]).toBe('function')
    expect(Object.keys(api).length).toBe(expected.length)
  })

  it('setup muda a resolução interna e o personagem nasce centrado nela', () => {
    const { api } = loadRuntime()
    api.setup({ width: 960, height: 540, background: '#101020', accent: '#ff8800' })
    expect(api.width()).toBe(960)
    expect(api.height()).toBe(540)
    const c = api.createCharacter({ w: 60, h: 40, speed: 200, color: '#fff', image: '' }) as {
      x: number
      y: number
      speedMultiplier: number
    }
    expect(c.x).toBe((960 - 60) / 2)
    expect(c.y).toBe((540 - 40) / 2)
    expect(c.speedMultiplier).toBe(1)
  })

  it('createCharacter preenche defaults do kit (64×64, 300 px/s)', () => {
    const { api } = loadRuntime()
    const c = api.createCharacter({}) as Record<string, unknown>
    expect(c.w).toBe(64)
    expect(c.h).toBe(64)
    expect(c.speed).toBe(300)
    expect(c.color).toBe('#4a9eff')
  })

  it('moveWithKeys: diagonal normalizada × velocidade × turbo × dt', () => {
    const h = loadRuntime()
    void startGame(h) // liga o bindInput (listeners de teclado)
    const c = h.api.createCharacter({ w: 0, h: 0, speed: 100 }) as { x: number; y: number }
    h.api.placeCharacter(c, 0, 0)
    h.fire('keydown', { key: 'd' })
    h.api.moveWithKeys(c, 1)
    expect(c.x).toBeCloseTo(100)
    expect(c.y).toBeCloseTo(0)
    // Diagonal (d + s): mesmo deslocamento TOTAL, repartido por √2.
    h.api.placeCharacter(c, 0, 0)
    h.fire('keydown', { key: 's' })
    h.api.moveWithKeys(c, 1)
    expect(c.x).toBeCloseTo(100 / Math.SQRT2)
    expect(c.y).toBeCloseTo(100 / Math.SQRT2)
    // Turbo multiplica.
    h.api.placeCharacter(c, 0, 0)
    h.fire('keyup', { key: 's' })
    h.api.setSpeedMultiplier(c, 2)
    h.api.moveWithKeys(c, 0.5)
    expect(c.x).toBeCloseTo(100)
  })

  it('keepOnScreen prende o personagem na tela; touching é AABB', () => {
    const { api } = loadRuntime()
    api.setup({ width: 200, height: 100 })
    const a = api.createCharacter({ w: 20, h: 20 }) as Record<string, number>
    api.placeCharacter(a, -50, 500)
    api.keepOnScreen(a)
    expect(a.x).toBe(0)
    expect(a.y).toBe(80)
    const b = api.createCharacter({ w: 20, h: 20 }) as Record<string, number>
    api.placeCharacter(b, 15, 75)
    expect(api.touching(a, b)).toBe(true)
    api.placeCharacter(b, 40, 75)
    expect(api.touching(a, b)).toBe(false)
    expect(api.touching(a, null)).toBe(false)
  })

  it('keyDown lê o mapa lowercase e aceita apelidos (Espaço, Esc)', () => {
    const h = loadRuntime()
    void startGame(h)
    h.fire('keydown', { key: 'W' })
    expect(h.api.keyDown('w')).toBe(true)
    expect(h.api.keyDown('W')).toBe(true)
    h.fire('keydown', { key: ' ' })
    expect(h.api.keyDown('espaço')).toBe(true)
    expect(h.api.keyDown('space')).toBe(true)
    // blur solta TODAS as teclas (tecla presa ao perder o foco).
    h.fire('blur')
    expect(h.api.keyDown('w')).toBe(false)
  })

  it('API nunca lança: chamadas com lixo só avisam', () => {
    const { api } = loadRuntime()
    expect(() => {
      api.moveWithKeys(null, Number.NaN)
      api.drawCharacter(undefined)
      api.placeCharacter(42, 'x', 'y')
      api.setScreenText('nao-existe', 1, 2, 3)
      api.showScreen('nada')
      api.loadImage('', '')
      api.setup('lixo')
    }).not.toThrow()
  })
})

describe('SZGameKit — máquina de estados', () => {
  it('setState dispara os ganchos de "quando entrar"; stateIs/state leem', () => {
    const { api } = loadRuntime()
    const seen: string[] = []
    api.onEnterState('jogando', () => seen.push('jogando'))
    api.onEnterState('loja', () => seen.push('loja'))
    expect(api.state()).toBe('menu')
    api.setState('jogando')
    api.setState('loja')
    expect(seen).toEqual(['jogando', 'loja'])
    expect(api.stateIs('loja')).toBe(true)
    expect(api.stateIs('jogando')).toBe(false)
  })

  it('pause só pausa jogando; resume só continua pausado; endGame vai ao fim', () => {
    const { api } = loadRuntime()
    api.pause() // no menu: não faz nada
    expect(api.state()).toBe('menu')
    api.setState('jogando')
    api.pause()
    expect(api.state()).toBe('pausado')
    api.pause() // já pausado: não alterna
    expect(api.state()).toBe('pausado')
    api.resume()
    expect(api.state()).toBe('jogando')
    api.endGame()
    expect(api.state()).toBe('fim')
    api.returnToMenu()
    expect(api.state()).toBe('menu')
  })

  it('a tecla de pausa alterna jogando↔pausado (e setPauseKey troca a tecla)', async () => {
    const h = loadRuntime()
    h.api.setPauseKey('p')
    await startGame(h)
    h.api.setState('jogando')
    h.fire('keydown', { key: 'p' })
    expect(h.api.state()).toBe('pausado')
    h.fire('keydown', { key: 'p' })
    expect(h.api.state()).toBe('jogando')
    // Esc (default antigo) não faz mais nada.
    h.fire('keydown', { key: 'Escape' })
    expect(h.api.state()).toBe('jogando')
  })
})

describe('SZGameKit — telas (happy-dom) e laço', () => {
  it('start monta o palco + 4 telas prontas e termina no menu', async () => {
    const h = loadRuntime()
    h.api.loadImage('heroi', 'nao-existe-no-projeto') // resolve na hora (fallback)
    await startGame(h)
    expect(h.api.state()).toBe('menu')
    const stage = document.querySelector('#szgk-stage')
    expect(stage).not.toBeNull()
    expect(stage?.querySelector('#szgk-canvas')).not.toBeNull()
    const names = Array.from(stage?.querySelectorAll('[data-szgk-screen]') ?? []).map((el) =>
      el.getAttribute('data-szgk-screen'),
    )
    expect(names).toEqual(['menu', 'pausa', 'carregando', 'fim'])
    // Estado menu → painel do menu ativo, os outros não.
    const active = Array.from(stage?.querySelectorAll('.szgk-active') ?? []).map((el) =>
      el.getAttribute('data-szgk-screen'),
    )
    expect(active).toEqual(['menu'])
    expect(h.rafCount()).toBe(1) // laço agendado
  })

  it('setScreenText personaliza título/texto/botão; telas custom com botão clicável', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setScreenText('menu', 'Caça-moedas', 'Pegue 5 moedas!', 'Bora!')
    const stage = document.querySelector('#szgk-stage')
    const menu = stage?.querySelector('[data-szgk-screen="menu"]')
    expect(menu?.querySelector('h1')?.textContent).toBe('Caça-moedas')
    expect(menu?.querySelector('p')?.textContent).toBe('Pegue 5 moedas!')
    expect(menu?.querySelector('button')?.textContent).toBe('Bora!')

    let clicked = 0
    h.api.createScreen('vitoria', 'Você venceu!', 'Parabéns')
    h.api.addButton('vitoria', 'Jogar de novo', () => {
      clicked += 1
      h.api.returnToMenu()
    })
    h.api.showScreen('vitoria')
    const vitoria = stage?.querySelector('[data-szgk-screen="vitoria"]') as HTMLElement | null
    expect(vitoria?.classList.contains('szgk-active')).toBe(true)
    const btn = vitoria?.querySelector('button') as HTMLButtonElement | null
    expect(btn?.textContent).toBe('Jogar de novo')
    btn?.click()
    expect(clicked).toBe(1)
    expect(h.api.state()).toBe('menu')
    expect(vitoria?.classList.contains('szgk-active')).toBe(false)
  })

  it('o botão Jogar do menu entra em "jogando" e esconde as telas', async () => {
    const h = loadRuntime()
    await startGame(h)
    const menu = document.querySelector('[data-szgk-screen="menu"]')
    ;(menu?.querySelector('button') as HTMLButtonElement | null)?.click()
    expect(h.api.state()).toBe('jogando')
    expect(document.querySelectorAll('.szgk-active').length).toBe(0)
    // Pausar liga o painel de pausa automaticamente.
    h.api.pause()
    const active = document.querySelector('.szgk-active')
    expect(active?.getAttribute('data-szgk-screen')).toBe('pausa')
  })

  it('laço: update roda SÓ em jogando com dt clampado; draw congela na pausa', async () => {
    const h = loadRuntime()
    const dts: number[] = []
    let draws = 0
    h.api.onUpdate((dt: unknown) => dts.push(dt as number))
    h.api.onDraw(() => {
      draws += 1
    })
    h.clock.value = 1000
    await startGame(h)
    // No menu: quadro roda, update NÃO (estado ≠ jogando).
    h.nextFrame(1016)
    expect(dts).toEqual([])
    h.clock.value = 2000
    h.api.setState('jogando') // zera o relógio interno AGORA (sem salto de dt)
    h.nextFrame(2016) // 16ms depois do "agora" de entrar no estado
    expect(dts.length).toBe(1)
    expect(dts[0]).toBeCloseTo(0.016)
    // Aba dormiu 5s: o clamp de 0.1s segura o teleporte (kit).
    h.nextFrame(7016)
    expect(dts[1]).toBe(0.1)
    // Pausa: update para, draw continua (imagem congelada + painel por cima).
    h.api.pause()
    const before = draws
    h.nextFrame(7032)
    expect(dts.length).toBe(2)
    expect(draws).toBe(before + 1)
    // Um erro num gancho NÃO derruba o laço (avisa uma vez e segue).
    h.api.resume()
    h.api.onUpdate(() => {
      throw new Error('boom')
    })
    expect(() => {
      h.nextFrame(7048)
      h.nextFrame(7064)
    }).not.toThrow()
    expect(dts.length).toBe(4)
  })
})
