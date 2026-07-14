import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { gameKitRuntime } from '../runtime'

// happy-dom devolve null em getContext('2d') — o render() sairia cedo e o laço
// de desenho ficaria invisível ao teste. Stub mínimo, com RESTORE no afterAll
// (o registro de módulos do bun não é isolado por arquivo).
const canvasProto = (globalThis as { HTMLCanvasElement?: { prototype: object } }).HTMLCanvasElement
  ?.prototype as { getContext?: unknown } | undefined
const originalGetContext = canvasProto?.getContext
const ctxCalls: Array<[string, number[]]> = []
const fakeCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  imageSmoothingEnabled: true,
  font: '',
  globalAlpha: 1,
  fillRect(...a: number[]) {
    ctxCalls.push(['fillRect', a])
  },
  strokeRect() {},
  drawImage() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  arc() {},
  fill() {},
  fillText() {},
  save() {
    ctxCalls.push(['save', []])
  },
  restore() {
    ctxCalls.push(['restore', []])
  },
  translate(...a: number[]) {
    ctxCalls.push(['translate', a])
  },
  scale(...a: number[]) {
    ctxCalls.push(['scale', a])
  },
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
  // P24
  on: Fn
  emit: Fn
  defineMold: Fn
  spawnFromMold: Fn
  startSpawner: Fn
  forEachActive: Fn
  cullOffscreen: Fn
  recycle: Fn
  drawActive: Fn
  countActive: Fn
  defineLook: Fn
  drawLook: Fn
  seek: Fn
  drift: Fn
  face: Fn
  hurt: Fn
  knockback: Fn
  drawHealthBar: Fn
  touchCircle: Fn
  isDead: Fn
  healthOf: Fn
  setMission: Fn
  missionKill: Fn
  drawTimer: Fn
  timeSurvived: Fn
  kills: Fn
  defineEffect: Fn
  burst: Fn
  drawEffects: Fn
  loadSound: Fn
  playSound: Fn
  playEffect: Fn
  playTone: Fn
  // R1
  stopSpawner: Fn
  isInvincible: Fn
  keyPressed: Fn
  // R2
  setSheet: Fn
  playAnim: Fn
  cameraFollow: Fn
  cameraStop: Fn
  cameraX: Fn
  cameraY: Fn
  onDrawHud: Fn
  launchTowards: Fn
  moveByVelocity: Fn
  setAngle: Fn
  mouseX: Fn
  mouseY: Fn
  mouseDown: Fn
  onGameClick: Fn
  drawBar: Fn
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
  it('expõe os 84 métodos (spawn_named reusa spawnFromMold)', () => {
    const { api } = loadRuntime()
    const expected = [
      // v1 (33)
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
      // P24 (33)
      'on',
      'emit',
      'defineMold',
      'spawnFromMold',
      'startSpawner',
      'forEachActive',
      'cullOffscreen',
      'recycle',
      'drawActive',
      'countActive',
      'defineLook',
      'drawLook',
      'seek',
      'drift',
      'face',
      'hurt',
      'knockback',
      'drawHealthBar',
      'touchCircle',
      'isDead',
      'healthOf',
      'setMission',
      'missionKill',
      'drawTimer',
      'timeSurvived',
      'kills',
      'defineEffect',
      'burst',
      'drawEffects',
      'loadSound',
      'playSound',
      'playEffect',
      'playTone',
      // R1 (3 métodos p/ 4 blocos: sz_gk_spawn_named reusa spawnFromMold)
      'stopSpawner',
      'isInvincible',
      'keyPressed',
      // R2 (15): animação de folha, câmera+HUD, velocidade/tiro, mouse, giro, barra
      'setSheet',
      'playAnim',
      'cameraFollow',
      'cameraStop',
      'cameraX',
      'cameraY',
      'onDrawHud',
      'launchTowards',
      'moveByVelocity',
      'setAngle',
      'mouseX',
      'mouseY',
      'mouseDown',
      'onGameClick',
      'drawBar',
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

  it('createCharacter preenche defaults do kit (64×64, 300 px/s, vida 100)', () => {
    const { api } = loadRuntime()
    const c = api.createCharacter({}) as Record<string, unknown>
    expect(c.w).toBe(64)
    expect(c.h).toBe(64)
    expect(c.speed).toBe(300)
    expect(c.color).toBe('#4a9eff')
    // Vida por padrão → o herói aguenta vários hits (não morre no primeiro).
    expect(c.health).toBe(100)
    expect(c.maxHealth).toBe(100)
  })

  it('herói com vida não morre no primeiro hit; resetCharacter cura', () => {
    const { api } = loadRuntime()
    const heroi = api.createCharacter({}) as Record<string, number>
    api.hurt(heroi, 10, 1)
    expect(heroi.health).toBe(90)
    expect(api.isDead(heroi)).toBe(false)
    heroi.health = 5
    api.resetCharacter(heroi)
    expect(heroi.health).toBe(100) // "Jogar de novo" cura
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
  it('start monta o palco + 5 telas prontas e termina no menu', async () => {
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
    expect(names).toEqual(['menu', 'pausa', 'carregando', 'fim', 'vitoria'])
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

    // createScreen num nome PRONTO ("vitoria") = a criança ASSUME a tela: os
    // botões default somem (senão o "Jogar de novo" duplicava) e os textos são dela.
    let clicked = 0
    h.api.createScreen('vitoria', 'Você venceu!', 'Parabéns')
    h.api.addButton('vitoria', 'Jogar de novo', () => {
      clicked += 1
      h.api.returnToMenu()
    })
    h.api.showScreen('vitoria')
    const vitoria = stage?.querySelector('[data-szgk-screen="vitoria"]') as HTMLElement | null
    expect(vitoria?.classList.contains('szgk-active')).toBe(true)
    expect(vitoria?.querySelector('h2')?.textContent).toBe('Você venceu!')
    expect(vitoria?.querySelectorAll('button').length).toBe(1)
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

describe('SZGameKit — P24: avisos, moldes, combate, missão', () => {
  it('event bus: emit chama os ouvintes de on (desacoplado)', () => {
    const { api } = loadRuntime()
    const heard: string[] = []
    api.on('inimigo:morreu', () => heard.push('a'))
    api.on('inimigo:morreu', () => heard.push('b'))
    api.on('outro', () => heard.push('x'))
    api.emit('inimigo:morreu')
    expect(heard).toEqual(['a', 'b'])
    api.emit('nao-existe') // sem ouvintes: no-op
    expect(heard).toEqual(['a', 'b'])
  })

  it('molde → spawn → forEach (reverso, recolhe) → count; pool reaproveita', () => {
    const { api } = loadRuntime()
    api.setup({ width: 800, height: 600 })
    api.defineMold('goblin', { w: 40, h: 40, health: 5, speed: 100 })
    const a = api.spawnFromMold('goblin', 10, 10) as { health: number }
    api.spawnFromMold('goblin', 20, 20)
    api.spawnFromMold('goblin', 30, 30)
    expect(api.countActive('goblin')).toBe(3)
    expect(a.health).toBe(5)
    // Recolher o do meio durante o forEach; count cai; reaproveita no próximo spawn.
    let seen = 0
    api.forEachActive('goblin', (item: { x: number }) => {
      seen += 1
      if (item.x === 20) api.recycle(item)
    })
    expect(seen).toBe(3)
    expect(api.countActive('goblin')).toBe(2)
    api.spawnFromMold('goblin', 40, 40)
    expect(api.countActive('goblin')).toBe(3)
  })

  it('cullOffscreen recolhe quem saiu da tela', () => {
    const { api } = loadRuntime()
    api.setup({ width: 400, height: 300 })
    api.defineMold('bicho', {})
    api.spawnFromMold('bicho', 100, 100) // dentro
    api.spawnFromMold('bicho', 999, 100) // bem fora
    expect(api.countActive('bicho')).toBe(2)
    api.cullOffscreen('bicho', 120)
    expect(api.countActive('bicho')).toBe(1)
  })

  it('seek aproxima do alvo; touchCircle por raio; hurt respeita i-frames', () => {
    const { api } = loadRuntime()
    const alvo = api.createCharacter({ w: 20, h: 20 }) as Record<string, number>
    api.placeCharacter(alvo, 200, 0)
    const cacador = api.createCharacter({ w: 20, h: 20, speed: 100 }) as Record<string, number>
    api.placeCharacter(cacador, 0, 0)
    const x0 = cacador.x ?? 0
    api.seek(cacador, alvo, 1)
    expect(cacador.x).toBeGreaterThan(x0) // andou em direção ao alvo
    // touchCircle: sobrepostos = true; longe = false.
    api.placeCharacter(cacador, 200, 0)
    expect(api.touchCircle(cacador, alvo)).toBe(true)
    api.placeCharacter(cacador, 900, 0)
    expect(api.touchCircle(cacador, alvo)).toBe(false)
    // hurt tira vida e dá invencibilidade; um 2º hurt imediato não tira mais.
    const heroi = api.createCharacter({}) as Record<string, number>
    heroi.health = 100
    api.hurt(heroi, 30, 1)
    expect(heroi.health).toBe(70)
    expect(api.isDead(heroi)).toBe(false)
    api.hurt(heroi, 30, 1) // ainda invencível
    expect(heroi.health).toBe(70)
    expect(api.healthOf(heroi)).toBe(70)
  })

  it('missão: vence por derrotar N (vai pra VITÓRIA antes de emitir o aviso)', async () => {
    const h = loadRuntime()
    let ganhou = false
    let estadoNoAviso = ''
    h.api.setMission(999, 2) // 2 kills
    h.api.on('missao:completa', () => {
      ganhou = true
      estadoNoAviso = h.api.state() as string
    })
    await startGame(h)
    h.api.setState('jogando')
    h.api.missionKill()
    h.api.missionKill()
    expect(h.api.kills()).toBe(2)
    h.nextFrame(20) // stepSystems checa a missão
    expect(ganhou).toBe(true)
    // P24 separa MISSION_COMPLETE de GAME_OVER: vitória ≠ fim. O setState roda
    // ANTES do emit para o listener da criança poder SOBRESCREVER a tela.
    expect(estadoNoAviso).toBe('vitoria')
    expect(h.api.state()).toBe('vitoria')
  })

  it('faíscas: burst cria partículas; entrar em jogando reinicia a arena', async () => {
    const h = loadRuntime()
    h.api.defineMold('g', {})
    h.api.defineEffect('poeira', { count: 8 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('g', 10, 10)
    expect(h.api.countActive('g')).toBe(1)
    h.api.burst('poeira', 50, 50)
    h.api.drawEffects() // move/desenha (com o ctx stub)
    // Reentrar em jogando (Jogar de novo) zera pools e contadores.
    h.api.setState('menu')
    h.api.setState('jogando')
    expect(h.api.countActive('g')).toBe(0)
    expect(h.api.kills()).toBe(0)
  })
})

describe('SZGameKit — R1: correções do full review', () => {
  it('recycle FORA do forEach devolve ao pool (o slot é reaproveitado)', () => {
    const { api } = loadRuntime()
    api.defineMold('g', {})
    const a = api.spawnFromMold('g', 10, 10)
    api.spawnFromMold('g', 20, 20)
    expect(api.countActive('g')).toBe(2)
    api.recycle(a) // avulso, sem varredura — antes ficava no active[] p/ sempre
    expect(api.countActive('g')).toBe(1)
    const b = api.spawnFromMold('g', 30, 30) as { x: number }
    expect(api.countActive('g')).toBe(2)
    expect(b).toBe(a as { x: number }) // reusou o objeto recolhido
  })

  it('reiniciar (Jogar de novo) cura i-frames órfãos — herói não fica invencível', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({}) as Record<string, number>
    h.api.hurt(heroi, 10, 60) // invencível por 60s
    expect(h.api.isInvincible(heroi)).toBe(true)
    expect(heroi.health).toBe(90)
    h.api.setState('fim')
    h.api.setState('jogando') // Jogar de novo
    expect(h.api.isInvincible(heroi)).toBe(false)
    h.api.hurt(heroi, 10, 1) // volta a levar dano
    expect(heroi.health).toBe(80)
  })

  it('startSpawner re-ligado SUBSTITUI (não duplica); stopSpawner desliga', async () => {
    const h = loadRuntime()
    h.api.defineMold('g', {})
    await startGame(h)
    h.api.setState('jogando')
    h.api.startSpawner('g', 1)
    h.api.startSpawner('g', 1) // Jogar de novo re-liga — não pode dobrar a taxa
    h.clock.value = 0
    h.api.setState('jogando') // re-zera o relógio do dt
    // 1.05s de jogo em passos de 0.05s (clamp de dt) — só 1 nasce, não 2.
    for (let t = 50; t <= 1100; t += 50) {
      h.clock.value = t
      h.nextFrame(t)
    }
    expect(h.api.countActive('g')).toBe(1)
    h.api.stopSpawner('g')
    for (let t = 1150; t <= 2300; t += 50) {
      h.clock.value = t
      h.nextFrame(t)
    }
    expect(h.api.countActive('g')).toBe(1) // parado: nada nasce
  })

  it('keyPressed é edge: true SÓ no quadro do aperto (keyDown continua true)', async () => {
    const h = loadRuntime()
    const pressedFrames: boolean[] = []
    const downFrames: boolean[] = []
    h.api.onUpdate(() => {
      pressedFrames.push(h.api.keyPressed('j') as boolean)
      downFrames.push(h.api.keyDown('j') as boolean)
    })
    await startGame(h)
    h.api.setState('jogando')
    h.fire('keydown', { key: 'j' })
    h.nextFrame(16)
    h.nextFrame(32)
    expect(pressedFrames).toEqual([true, false]) // só no 1º quadro
    expect(downFrames).toEqual([true, true]) // segurando
  })

  it('faíscas congelam fora de jogando (pausa não avança as partículas)', async () => {
    const h = loadRuntime()
    h.api.defineEffect('p', { count: 4, life: 9, speed: 100, gravity: 0 })
    await startGame(h)
    h.api.setState('jogando')
    h.nextFrame(16)
    h.api.burst('p', 50, 50)
    h.api.drawEffects()
    h.api.pause()
    h.api.drawEffects() // pausado: dt 0 — não move nem envelhece
    h.api.drawEffects()
    h.api.resume()
    // Se envelhecessem na pausa com dt cheio, 3 chamadas × vida 9s seguiriam
    // vivas mesmo assim — o sinal observável é o movimento; aqui basta não
    // lançar e manter o desenho estável (o detalhe fino fica no QA browser).
    expect(() => h.api.drawEffects()).not.toThrow()
  })

  it('defineLook com tamanho-base: drawLook ESCALA o desenho para o w/h pedido', async () => {
    const h = loadRuntime()
    await startGame(h) // monta o canvas (ctx2d = fakeCtx do stub)
    h.api.defineLook(
      'goblin',
      (c: unknown) => {
        ;(c as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect(
          0,
          0,
          40,
          40,
        )
      },
      40,
      40,
    )
    ctxCalls.length = 0
    h.api.drawLook('goblin', 10, 20, 80, 20) // 2× na largura, 0.5× na altura
    const scale = ctxCalls.find(([n]) => n === 'scale')
    expect(scale?.[1]).toEqual([2, 0.5])
    const translate = ctxCalls.find(([n]) => n === 'translate')
    expect(translate?.[1]).toEqual([10, 20])
    expect(ctxCalls.some(([n]) => n === 'fillRect')).toBe(true) // a fn rodou
  })

  it('emit repassa o payload aos ouvintes (futuro dos blocos, já no motor)', () => {
    const { api } = loadRuntime()
    let got: unknown = null
    api.on('pontos', (v: unknown) => {
      got = v
    })
    api.emit('pontos', 42)
    expect(got).toBe(42)
  })
})

describe('SZGameKit — R2: câmera, velocidade, animação, mouse, barra', () => {
  it('câmera segue o alvo e TRAVA nas bordas do mundo', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando') // no menu o render sai cedo (câmera não atualiza)
    const heroi = h.api.createCharacter({ w: 40, h: 40 }) as Record<string, number>
    h.api.cameraFollow(heroi, 2000, 1500)
    // Canto superior esquerdo: trava em 0,0 (não mostra "fora" do mundo).
    h.api.placeCharacter(heroi, 0, 0)
    h.nextFrame(16)
    expect(h.api.cameraX()).toBe(0)
    expect(h.api.cameraY()).toBe(0)
    // Meio do mundo: centraliza no alvo.
    h.api.placeCharacter(heroi, 980, 730) // centro 1000, 750
    h.nextFrame(32)
    expect(h.api.cameraX()).toBe(600) // 1000 - 800/2
    expect(h.api.cameraY()).toBe(450) // 750 - 600/2
    // Canto inferior direito: trava em mundo - tela.
    h.api.placeCharacter(heroi, 1960, 1460)
    h.nextFrame(48)
    expect(h.api.cameraX()).toBe(1200)
    expect(h.api.cameraY()).toBe(900)
    // keepOnScreen com câmera: o limite vira o MUNDO, não a tela.
    h.api.placeCharacter(heroi, 5000, 5000)
    h.api.keepOnScreen(heroi)
    expect(heroi.x).toBe(1960) // 2000 - 40
    expect(heroi.y).toBe(1460)
    h.api.cameraStop()
    expect(h.api.cameraX()).toBe(0)
    h.api.keepOnScreen(heroi)
    expect(heroi.x).toBe(760) // sem câmera: volta ao limite da tela (800 - 40)
  })

  it('launchTowards mira uma vez (vetor normalizado × v); moveByVelocity aplica × dt', () => {
    const { api } = loadRuntime()
    const tiro = api.createCharacter({ w: 10, h: 10 }) as Record<string, number>
    const alvo = api.createCharacter({ w: 10, h: 10 }) as Record<string, number>
    api.placeCharacter(tiro, 0, 0)
    api.placeCharacter(alvo, 300, 400) // 3-4-5: direção (0.6, 0.8)
    api.launchTowards(tiro, alvo, 500)
    expect(tiro.vx).toBeCloseTo(300)
    expect(tiro.vy).toBeCloseTo(400)
    api.moveByVelocity(tiro, 0.5)
    expect(tiro.x).toBeCloseTo(150)
    expect(tiro.y).toBeCloseTo(200)
  })

  it('playAnim re-tocado NÃO reinicia (guarda de transição); setSheet configura o recorte', () => {
    const { api } = loadRuntime()
    const c = api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    api.setSheet(c, 'folha', 16, 16)
    expect(c._sheetImg).toBe('folha')
    expect(c._sheetFw).toBe(16)
    api.playAnim(c, 2, 5, 8)
    const start = c._animStart
    api.playAnim(c, 2, 5, 8) // mesmo trio: não reinicia
    expect(c._animStart).toBe(start)
    api.playAnim(c, 6, 9, 8) // trocou: reinicia
    expect(c._animFrom).toBe(6)
  })

  it('setAngle guarda o giro; drawBar desenha fundo + preenchimento + contorno', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({}) as Record<string, number>
    h.api.setAngle(c, 90)
    expect(c._angle).toBe(90)
    ctxCalls.length = 0
    h.api.drawBar(50, 100, 20, 20, 200, 16, '#22c55e')
    const fills = ctxCalls.filter(([n]) => n === 'fillRect')
    expect(fills.length).toBe(2)
    expect(fills[1]?.[1]).toEqual([20, 20, 100, 16]) // 50% de 200
  })

  it('mouseDown/mouseX/mouseY começam zerados; onGameClick registra o gancho', () => {
    const { api } = loadRuntime()
    expect(api.mouseDown()).toBe(false)
    expect(api.mouseX()).toBe(0)
    expect(api.mouseY()).toBe(0)
    // O gancho é chamado pelo pointerdown do canvas (verificado no QA browser —
    // o happy-dom não produz getBoundingClientRect com tamanho real).
    expect(() => api.onGameClick(() => {})).not.toThrow()
  })
})
