import { afterAll, afterEach, describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import {
  aventuraProfissionalExample,
  batalhaProfissionalExample,
  chuvaProfissionalExample,
  vilaDoDragaoExample,
} from '../examples'
import { gameKitRuntime } from '../runtime'

/**
 * ⭐ A REDE QUE FALTAVA (R17) — testes que JOGAM, em vez de testar o SETUP.
 *
 * O 👾 Kit Monstrinhos foi para produção (v0.17.0) com TRÊS softlocks, e a suíte
 * inteira ficou verde. O motivo é estrutural, não distração:
 *
 *   · runtime.test.ts  testa o SETUP — "a batalha abre", "o estado é batalha",
 *     "o save leva o time", "o reset zera". Nenhum teste jogava uma batalha ATÉ
 *     o desmaio, que é onde os dois softlocks de fase moram;
 *   · o smoke de 200 quadros NÃO renderiza (ctx2d é nulo sem canvas de verdade),
 *     então a tela 100% branca é literalmente invisível para ele;
 *   · wiring.test.ts   tem o ctx espião, mas não tem laço de quadros nem teclado.
 *
 * Este arquivo junta as duas metades que viviam separadas — ctx espião + laço de
 * quadros + teclado — e mede o que a CRIANÇA VÊ:
 *
 *   softlock  →  a batalha nunca sai de 'batalha' (o pkmEndBattle é quem devolve
 *                para 'jogando', então "acabou" é observável de fora);
 *   tela branca → sobra um fillRect da tela INTEIRA por cima de tudo.
 *
 * Ambos falham no código de antes do R17 e passam depois. Regra para o futuro:
 * mecânica de TURNO nova entra aqui jogando até o fim, não só abrindo.
 */

type Listener = (ev: unknown) => void

const canvasProto = (globalThis as { HTMLCanvasElement?: { prototype: object } }).HTMLCanvasElement
  ?.prototype as { getContext?: unknown } | undefined
const originalGetContext = canvasProto?.getContext

/** Todo fillRect com a cor que estava valendo na hora — é o que prova a cobertura. */
let rects: Array<{ x: number; y: number; w: number; h: number; fill: string; alpha: number }> = []
/** R21: fillText/arc também gravam — é como se mede o texto flutuante e a onda. */
let texts: Array<{ text: string; x: number; y: number; alpha: number }> = []
let arcs: Array<{ x: number; y: number; r: number; alpha: number }> = []
const fakeCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  imageSmoothingEnabled: true,
  font: '',
  globalAlpha: 1,
  canvas: { width: 960, height: 540 },
  fillRect(x: number, y: number, w: number, h: number) {
    rects.push({ x, y, w, h, fill: String(fakeCtx.fillStyle), alpha: fakeCtx.globalAlpha })
  },
  strokeRect() {},
  drawImage() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  fill() {},
  arc(x: number, y: number, r: number) {
    arcs.push({ x, y, r, alpha: fakeCtx.globalAlpha })
  },
  closePath() {},
  ellipse() {},
  fillText(t: unknown, x: number, y: number) {
    texts.push({ text: String(t), x, y, alpha: fakeCtx.globalAlpha })
  },
  measureText: () => ({ width: 10 }),
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  clearRect() {},
  setTransform() {},
  createLinearGradient: () => ({ addColorStop() {} }),
}
if (canvasProto) canvasProto.getContext = () => fakeCtx
afterAll(() => {
  if (canvasProto && originalGetContext) canvasProto.getContext = originalGetContext
})

type Fn = (...args: unknown[]) => unknown
interface Api {
  setup: Fn
  start: Fn
  runProject: (factory: () => void) => void
  state: () => string
  setState: Fn
  restartGame: Fn
  onDraw: Fn
  pkmCreature: Fn
  pkmMove: Fn
  pkmTypeChart: Fn
  pkmGive: Fn
  pkmBattleWild: Fn
  pkmTeamSize: () => number
  pkmBallCount: () => number
  pkmCaught: () => boolean
  missionKill: Fn
  tileAt: (map: string, x: number, y: number) => number
  flashScreen: Fn
  createCharacter: Fn
  placeCharacter: Fn
  thrust: Fn
  applyFriction: Fn
  knockback: Fn
  floatText: Fn
  shockwave: Fn
  trailOn: Fn
  trailOff: Fn
  drawEffects: Fn
  naveWave: Fn
  naveWaveShooter: Fn
  naveInvasionLine: Fn
  navePowerup: Fn
  navePowerOf: (c: unknown) => string
  on: Fn
  countActive: (mold: string) => number
  forEachActive: Fn
  recycle: Fn
  endGame: Fn
  lutaMatch: Fn
  lutaMove: Fn
  lutaFighter: Fn
  lutaAttack: Fn
  lutaAI: Fn
  lutaWinner: () => string
  lutaRoundNow: () => number
  lutaWinsOf: (c: unknown) => number
  lutaSpecialOf: (c: unknown) => number
  onUpdate: Fn
  rpgCreateMap: Fn
  rpgOnEnterMap: Fn
  rpgGoMap: Fn
  rpgConnectEdge: Fn
  rpgCurrentMap: () => string
  rpgMoveGrid: Fn
  pkmGrassCells: Fn
  pkmWild: Fn
  pkmEncounterRate: Fn
  defineMold: Fn
  spawnFromMold: Fn
  setHitbox: Fn
  collideGroup: Fn
  // R24 — playthrough Kit Plataforma
  platformerHero: Fn
  setJumpFeel: Fn
  oneWayPlatform: Fn
  movingPlatform: Fn
  rideOn: Fn
  stompKill: Fn
  defineRegion: Fn
  isInside: (who: unknown, region: string) => boolean
  // R24 — playthrough Kit RPG
  rpgBlockCell: Fn
  rpgCreateNpc: Fn
  rpgOnTalk: Fn
  rpgSay: Fn
  rpgAddFlag: Fn
  rpgHasFlag: (flag: string) => boolean
  rpgHasItem: (item: string) => boolean
  rpgSave: Fn
  rpgCreateDoor: Fn
  rpgCell: (n: number) => number
  rpgBattleStats: Fn
  rpgBattleStart: Fn
  rpgAddAlly: Fn
  rpgAddFoe: Fn
  rpgTeachMove: Fn
  rpgOnBattleEnd: Fn
  rpgBattleWon: () => boolean
  rpgBattleReward: Fn
  rpgLevel: () => number
  rpgXp: () => number
  placeCharacterAlias?: Fn
  // 🏰 R26 — playthrough Kit Defesa de Torre
  definePath: Fn
  pathPoint: Fn
  tdSlot: Fn
  tdFreeSlot: Fn
  tdSetCoins: Fn
  tdAddCoins: Fn
  tdCoins: () => number
  tdOnBuy: Fn
  tdWave: Fn
  tdDrawSlots: Fn
  tdDrawRange: Fn
  pickActive: (mold: string, mode: string, prop: string) => unknown
  pathProgress: (c: unknown) => number
  charX: (c: unknown) => number
  charY: (c: unknown) => number
  cooldownReady: Fn
  launchTowards: Fn
  distanceBetween: (a: unknown, b: unknown) => number
  overlapGroups: Fn
  hurt: Fn
  isDead: (c: unknown) => boolean
  drawActive: Fn
}

interface Harness {
  api: Api
  window: Record<string, unknown>
  inspectors: Record<string, () => unknown>
  fire: (name: string, ev?: unknown) => void
  nextFrame: (ts: number) => void
  storage: Map<string, string>
}

function loadRuntime(): Harness {
  const listeners: Record<string, Listener[]> = {}
  const rafQueue: Array<(ts: number) => void> = []
  const clock = { value: 0 }
  const storage = new Map<string, string>()
  const inspectors: Record<string, () => unknown> = {}
  const win = {
    __SZSTUDIO_RUNTIME_INSPECTORS: inspectors,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => clock.value },
    innerWidth: 1200,
    innerHeight: 700,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    SZGameKit: undefined,
  } as unknown as Record<string, unknown>
  const raf = (cb: (ts: number) => void) => {
    rafQueue.push(cb)
    return rafQueue.length
  }
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(win, raf)
  const api = win.SZGameKit as unknown as Api
  if (!api) throw new Error('runtime não montou window.SZGameKit')
  return {
    api,
    window: win,
    inspectors,
    fire: (name, ev = {}) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
    nextFrame: (ts) => {
      clock.value = ts
      const cb = rafQueue.shift()
      if (!cb) throw new Error('nenhum quadro agendado')
      cb(ts)
    },
    storage,
  }
}

async function startGame(h: Harness): Promise<void> {
  h.api.start()
  await Promise.resolve()
  await Promise.resolve()
}

function inspectBattle<T>(h: Harness): T | null {
  return (h.inspectors['game-2d-advanced:battle']?.() as T | null | undefined) ?? null
}

// Cada loadRuntime cria um runtime NOVO, mas todos compartilham o `document`
// global do happy-dom — e o motor reusa o painel por id (#szgk-stage). Sem
// limpar entre testes, a batalha DOM de um teste de RPG acharia o palco de
// outro. Espelho do afterEach do runtime.test.ts.
afterEach(() => {
  for (const el of Array.from(document.querySelectorAll('#szgk-stage, #szgk-style'))) {
    el.remove()
  }
})

/**
 * Um mundinho onde o desmaio ACONTECE: o Fraquinho tem 1 de vida e ataca de
 * planta contra fogo (0,5×), o selvagem bate de fogo contra planta (2×). Ou
 * seja: a MINHA criatura cai primeiro, garantido — que é o caminho que nenhum
 * teste antigo percorria.
 */
async function mundoDoDesmaio(h: Harness) {
  h.api.setup({ width: 960, height: 540 })
  h.api.pkmCreature('Fraquinho', 'planta', 1, 1, 1, 1, '', '')
  h.api.pkmCreature('Reserva', 'planta', 20, 3, 2, 2, '', '')
  h.api.pkmCreature('Brabo', 'fogo', 60, 30, 10, 20, '', '')
  h.api.pkmMove('Folha', 'Fraquinho', 'planta', 1, 100, 'onda', '#0a0')
  h.api.pkmMove('Folha2', 'Reserva', 'planta', 1, 100, 'onda', '#0a0')
  h.api.pkmMove('Labareda', 'Brabo', 'fogo', 40, 100, 'bola', '#f40')
  h.api.pkmTypeChart('fogo', 'planta', 2)
  h.api.pkmTypeChart('planta', 'fogo', 0.5)
  await startGame(h)
  h.api.restartGame()
}

/**
 * Joga: aperta espaço todo quadro (avança fala, confirma menu) até a batalha
 * acabar. Devolve o nº de quadros, ou -1 se travou.
 * ⚠️ O justPressed só é limpo no FIM do quadro — por isso keydown + nextFrame.
 */
function jogarAteAcabar(h: Harness, maxQuadros = 800): number {
  for (let i = 1; i <= maxQuadros; i++) {
    h.fire('keydown', { key: ' ' })
    h.nextFrame(i * 50)
    if (h.api.state() === 'jogando') return i
  }
  return -1
}

describe('gk — JOGAR a batalha do Kit Monstrinhos até o fim (não só abrir)', () => {
  it('⭐ a criatura desmaia, a criança troca e a batalha ACABA (não congela)', async () => {
    const h = loadRuntime()
    await mundoDoDesmaio(h)
    h.api.pkmGive('Fraquinho', 1)
    h.api.pkmGive('Reserva', 1)
    h.api.pkmBattleWild('Brabo', 5)
    expect(h.api.state()).toBe('batalha')

    // O Fraquinho VAI cair. Aí a fase vira 'trocar-forcado' — e antes do R17
    // NENHUM ramo de topo despachava essa fase: rpg.menu ficava null, o ESC não
    // sai de 'batalha' e o jogo morria de vez (só recarregando a página).
    const quadros = jogarAteAcabar(h)
    expect(quadros).toBeGreaterThan(0) // -1 = congelou
    expect(h.api.state()).toBe('jogando')
  })

  it('⭐ bicho selvagem SEM golpe ensinado não congela a batalha', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    // O esquecimento nº 1 previsível: criou a espécie e não ensinou golpe nenhum.
    h.api.pkmCreature('Mudo', 'normal', 20, 5, 2, 5, '', '')
    h.api.pkmCreature('Meu', 'normal', 30, 8, 3, 9, '', '')
    h.api.pkmMove('Tapa', 'Meu', 'normal', 12, 100, 'investida', '#999')
    await startGame(h)
    h.api.restartGame()
    h.api.pkmGive('Meu', 5)
    h.api.pkmBattleWild('Mudo', 3)

    // Antes do R17: pkmEnemyTurn punha a fase em 'menu' SEM abrir o menu — e
    // 'menu' é fase de REPOUSO (dirigida por evento). Ninguém mais mexia.
    expect(jogarAteAcabar(h)).toBeGreaterThan(0)
    expect(h.api.state()).toBe('jogando')
  })

  it('⭐ o flash NÃO deixa a tela coberta para sempre', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540, background: '#222' })
    await startGame(h)
    h.api.restartGame()

    // É a chamada exata que o pkmBattleWild faz ao abrir toda batalha.
    h.api.flashScreen('#ffffff', 2)
    // 60 quadros = 3 s: MUITO depois dos 2 piscares (0,12 s cada).
    for (let i = 1; i <= 60; i++) h.nextFrame(i * 50)

    rects = []
    h.nextFrame(61 * 50) // um quadro limpo, só para medir
    // O drawScreenFx é o ÚLTIMO desenho do render(): um retângulo branco da tela
    // inteira aqui significa que o mundo, o HUD, a fala e o menu estão TODOS
    // escondidos embaixo dele. Era o que acontecia em TODA batalha do kit.
    const cobrindo = rects.filter(
      (r) =>
        r.x === 0 && r.y === 0 && r.w === 960 && r.h === 540 && r.fill === '#ffffff' && r.alpha > 0,
    )
    expect(cobrindo).toEqual([])
  })

  it('⭐ a grama e os bichos de um mapa não valem no OUTRO mapa', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    h.api.pkmCreature('Folhinha', 'planta', 20, 5, 3, 5, '', '')
    h.api.pkmMove('Chicote', 'Folhinha', 'planta', 10, 100, 'onda', '#0a0')
    const heroi = h.api.createCharacter({ w: 40, h: 48, speed: 200, color: '#00f' }) as object
    // É a FORMA do exemplo oficial: grama e tabela declaradas DENTRO do mapa…
    h.api.rpgCreateMap('quintal', 10, 10, () => {})
    h.api.rpgCreateMap('caverna', 10, 10, () => {})
    h.api.rpgOnEnterMap('quintal', () => {
      h.api.pkmGrassCells(0, 0, 8, 8)
      h.api.pkmWild('Folhinha', 3, 6)
    })
    // …e a caverna NÃO tem grama nem bicho nenhum.
    h.api.pkmEncounterRate(100) // encontro garantido: o teste fica determinístico
    h.api.onUpdate((dt: number) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.restartGame()
    // ⚠️ DEPOIS do restartGame (que zera o time) e obrigatório: sem monstrinho em pé o
    // pkmBattleWild aborta ANTES de olhar a grama — e o teste passaria à toa.
    h.api.pkmGive('Folhinha', 5)

    h.api.rpgGoMap('caverna')
    h.api.placeCharacter(heroi, 128, 128) // célula (2,2)
    // Anda uma célula inteira dentro da CAVERNA. A grama do quintal cobre (3,2) e
    // o pkmWild dele encheu a tabela — se qualquer um dos dois vazar, o encontro
    // dispara aqui. (Era global de verdade: os bichos do quintal apareciam na
    // caverna, apesar do comentário do código prometer "a tabela do mapa".)
    for (let i = 1; i <= 40; i++) {
      h.fire('keydown', { key: 'ArrowRight' })
      h.nextFrame(i * 50)
    }
    expect(h.api.state()).toBe('jogando') // 'batalha' = vazou

    // E no quintal — onde a grama É — o encontro tem que acontecer de verdade,
    // senão o teste de cima passaria com o kit inteiro morto.
    h.api.rpgGoMap('quintal')
    h.api.placeCharacter(heroi, 128, 128)
    for (let i = 41; i <= 90 && h.api.state() === 'jogando'; i++) {
      h.fire('keydown', { key: 'ArrowRight' })
      h.nextFrame(i * 50)
    }
    expect(h.api.state()).toBe('batalha')
  })

  it('⭐ a caixa de colisão vale na colisão SÓLIDA (era só no "encostar")', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('parede', { w: 40, h: 200, color: '#555' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('parede', 300, 0)

    const heroi = h.api.createCharacter({ w: 60, h: 60, speed: 200, color: '#00f' }) as {
      x: number
      y: number
      vx: number
    }
    // A criança diz: "meu desenho tem 60 de largura, mas só os 20 do meio batem"
    // (o resto é cabelo/capa). É o caso que o tooltip do bloco vende.
    h.api.setHitbox(heroi, 20, 0, 20, 60)
    // Desenho em 255..315 ENCOSTA na parede (300..340); a CAIXA (275..295) não.
    h.api.placeCharacter(heroi, 255, 0)
    h.api.collideGroup(heroi, 'parede')

    // Sem o fix, o empurrão usava o desenho: o herói era jogado para trás mesmo
    // com a caixa livre — "botei a caixa e não mudou nada" ao contrário.
    expect(heroi.x).toBe(255)

    // E quando a CAIXA entra de verdade, tem que empurrar — para FORA pelo lado
    // por onde entrou. (Caixa em 300..320: o centro dela, 310, está à esquerda do
    // centro da parede, 320.)
    h.api.placeCharacter(heroi, 280, 0)
    h.api.collideGroup(heroi, 'parede')
    expect(heroi.x).toBeLessThan(280)
  })

  it('o flash ACONTECE mesmo (o teste de cima não passaria com o flash quebrado)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540, background: '#222' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.flashScreen('#ffffff', 2)
    rects = []
    h.nextFrame(50) // no meio do 1º piscar
    expect(rects.some((r) => r.w === 960 && r.h === 540 && r.fill === '#ffffff')).toBe(true)
  })
})

describe('gk — JOGAR uma luta inteira do Kit Luta (a lição do R17)', () => {
  /**
   * O Kit Monstrinhos foi para produção com 3 softlocks porque os testes montavam
   * a batalha e nunca a jogavam. Este não repete: aqui a luta é JOGADA até alguém
   * ganhar a partida.
   */
  interface Lutador {
    x: number
    y: number
    vx: number
    vy: number
    health: number
    maxHealth: number
    onGround: boolean
  }

  async function arena(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    const p1 = h.api.createCharacter({ w: 50, h: 110, speed: 260, color: '#00f' }) as Lutador
    const p2 = h.api.createCharacter({ w: 50, h: 110, speed: 260, color: '#f00' }) as Lutador
    await startGame(h)
    h.api.setState('jogando')
    h.api.placeCharacter(p1, 300, 380)
    h.api.placeCharacter(p2, 500, 380)
    h.api.lutaMatch(p1, p2, 3, 60)
    return { p1, p2 }
  }
  /** Roda N quadros de 50 ms (cada um chama o "A cada quadro" da criança). */
  function quadros(h: Harness, n: number, from = 1) {
    for (let i = from; i < from + n; i++) h.nextFrame(i * 50)
  }

  it('⭐ golpes definidos ANTES de "Luta de" entram na partida sem warning', async () => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      const h = loadRuntime()
      h.api.setup({ width: 960, height: 540 })
      const p1 = h.api.createCharacter({ w: 50, h: 110, speed: 260 }) as Lutador
      const p2 = h.api.createCharacter({ w: 50, h: 110, speed: 260 }) as Lutador
      h.api.lutaMove('soco', p1, 'rápido', 40, 400, true, false)
      await startGame(h)
      h.api.setState('jogando')
      h.api.placeCharacter(p1, 300, 380)
      h.api.placeCharacter(p2, 340, 380)
      h.api.lutaMatch(p1, p2, 1, 10)
      h.api.onUpdate((dt: number) => {
        h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
        h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
        h.api.lutaAttack(p1, 'soco')
      })
      quadros(h, 100)
      expect(p2.health).toBeLessThan(p2.maxHealth)
      expect(warnings).toEqual([])
    } finally {
      console.warn = originalWarn
    }
  })

  it('⭐ o golpe NÃO machuca no quadro do aperto (o recuo existe)', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('pesado', p1, 'pesado', 20, 400, false, false)
    h.api.onUpdate((dt: number) => {
      h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
      h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
    })
    quadros(h, 40) // passa o anúncio do ROUND 1 (1,5 s)
    const vida = p2.health
    h.api.lutaAttack(p1, 'pesado')
    // O "pesado" tem 0,26 s de recuo: 2 quadros (0,1 s) não podem machucar. Antes
    // do R18 o didHit valia desde o 1º quadro e quem apertasse primeiro ganhava.
    quadros(h, 2, 41)
    expect(p2.health).toBe(vida)
    quadros(h, 12, 43) // …e passado o recuo, machuca
    expect(p2.health).toBeLessThan(vida)
  })

  it('⭐ a luta INTEIRA roda até alguém ganhar a partida (não congela)', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('soco', p1, 'rápido', 40, 400, true, false)
    h.api.onUpdate((dt: number) => {
      h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
      h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
      h.api.lutaAttack(p1, 'soco') // martela: o jogo tem que aguentar
    })
    // 3 rounds × (anúncio 1,5 s + luta + K.O. 2 s). Travar em qualquer fase = o
    // estado nunca vira 'fim'.
    quadros(h, 600)
    expect(h.api.state()).toBe('fim')
    expect(h.api.lutaWinner()).toBe('jogador 1')
    expect(h.api.lutaWinsOf(p1)).toBe(2) // melhor de 3
  })

  it('⭐ "Jogar de novo" recomeça do zero, e não no round 3 com 2 a 0', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('soco', p1, 'rápido', 60, 400, true, false)
    h.api.onUpdate((dt: number) => {
      h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
      h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
      h.api.lutaAttack(p1, 'soco')
    })
    quadros(h, 600)
    expect(h.api.state()).toBe('fim')
    // ⚠️ TODO global de jogo entra no reset do setState. Sem isso a luta anterior
    // sobrevive e "Jogar de novo" abre já decidida.
    h.api.restartGame()
    expect(h.api.lutaRoundNow()).toBe(0) // 0 = nenhuma luta declarada
    expect(h.api.lutaWinner()).toBe('')
  })

  it('a defesa segura o golpe comum, e o "atravessa a defesa" passa por ela', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('soco', p1, 'médio', 20, 400, false, false)
    h.api.lutaMove('agarrao', p1, 'médio', 20, 400, true, false)
    h.api.onUpdate((dt: number) => {
      h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
      h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
    })
    quadros(h, 40)
    h.fire('keydown', { key: 'h' }) // p2 segura o defender
    const antes = p2.health
    h.api.lutaAttack(p1, 'soco')
    quadros(h, 16, 41)
    const comDefesa = antes - p2.health
    expect(comDefesa).toBeGreaterThan(0) // raspão: não é zero
    expect(comDefesa).toBeLessThan(8) // …mas é MUITO menos que os 20 do golpe

    const antes2 = p2.health
    h.api.lutaAttack(p1, 'agarrao')
    quadros(h, 16, 60)
    expect(antes2 - p2.health).toBeGreaterThan(comDefesa * 2)
  })

  it('o especial só sai com a barra cheia', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('super', p1, 'médio', 35, 400, true, true)
    h.api.onUpdate((dt: number) => {
      h.api.lutaFighter(p1, 'a', 'd', 'w', 's', 'f', dt)
      h.api.lutaFighter(p2, 'j', 'l', 'i', 'k', 'h', dt)
    })
    quadros(h, 40)
    expect(h.api.lutaSpecialOf(p1)).toBe(0)
    const vida = p2.health
    h.api.lutaAttack(p1, 'super')
    quadros(h, 16, 41)
    expect(p2.health).toBe(vida) // barra vazia: o golpe não sai
  })

  it('o computador joga sozinho (a luta anda sem ninguém apertar nada)', async () => {
    const h = loadRuntime()
    const { p1, p2 } = await arena(h)
    h.api.lutaMove('soco', p1, 'rápido', 10, 60, false, false)
    h.api.lutaMove('soco', p2, 'rápido', 10, 60, false, false)
    h.api.lutaAI(p1, 'difícil')
    h.api.lutaAI(p2, 'difícil')
    h.api.onUpdate(() => {})
    // ⚠️ A decisão da IA sorteia (defender/pular via `chance()` → Math.random): SEM
    // semente, os dois 'difícil' — que MANTÊM distância e defendem 85% — às vezes
    // dançam 400 quadros sem um golpe conectar (flaky ~1/3, saldo 200 = 0×0). Fixo
    // o sorteio ALTO só aqui: nunca defende (85) nem pula (25), então os dois
    // APROXIMAM e ATACAM de verdade. A autonomia (jogar e ferir sozinho) é o que
    // ESTE teste prova; defesa/pulo têm testes próprios. Determinístico: 0 flaky.
    const realRandom = Math.random
    Math.random = () => 0.99
    try {
      quadros(h, 400)
    } finally {
      Math.random = realRandom
    }
    // Os dois se acharam e se bateram: alguém perdeu vida sem nenhum teclado.
    expect(p1.health + p2.health).toBeLessThan(200)
  })
})

describe('gk — R20: física DIRIGIDA por quadros (thrust, varredura da luta, empurrão)', () => {
  /**
   * O review #5 achou que thrust/applyFriction só tinham teste de EXISTÊNCIA — e
   * por isso o thrust sem dt (a física de Asteroids mudava com o fps do
   * computador da criança) ficou verde por um lote inteiro. Estes testes DIRIGEM.
   */
  interface Corpo {
    x: number
    y: number
    vx: number
    vy: number
    _prevX: number
    _prevY: number
  }

  /** Empurra a nave por 1 s de jogo em quadros de (1000/fps) ms e devolve o vx. */
  async function corridaDaNave(
    fps: number,
  ): Promise<{ h: Harness; nave: Corpo; solta: () => void }> {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    const nave = h.api.createCharacter({ w: 20, h: 20, speed: 200, color: '#fff' }) as Corpo
    let empurrando = true
    h.api.onUpdate((dt: number) => {
      if (empurrando) h.api.thrust(nave, 0, 6000)
      h.api.applyFriction(nave, 0.5, dt)
    })
    await startGame(h)
    h.api.setState('jogando')
    for (let i = 1; i <= fps; i++) h.nextFrame(i * (1000 / fps))
    return { h, nave, solta: () => (empurrando = false) }
  }

  it('⭐ thrust é px/s²: 1 s a 30 fps e a 60 fps dão a MESMA velocidade', async () => {
    const a = await corridaDaNave(60)
    const b = await corridaDaNave(30)
    // Escala px/s² de verdade (com força 6000 e atrito 0.5, ~4300 depois de 1 s).
    expect(a.nave.vx).toBeGreaterThan(3000)
    // Antes do fix o thrust somava a força POR QUADRO: a 30 fps a nave acelerava
    // a METADE (|vxA − vxB| ≈ 50% de vxA). A folga de 5% cobre a discretização.
    expect(Math.abs(a.nave.vx - b.nave.vx)).toBeLessThan(a.nave.vx * 0.05)
  })

  it('soltar o botão: o atrito freia a nave (0.5 = metade da velocidade em 1 s)', async () => {
    const a = await corridaDaNave(60)
    const cruzeiro = a.nave.vx
    a.solta()
    for (let i = 61; i <= 120; i++) a.h.nextFrame(i * (1000 / 60))
    expect(a.nave.vx).toBeGreaterThan(0)
    expect(a.nave.vx).toBeLessThan(cruzeiro * 0.6)
  })

  it('⭐ o teleporte do round da luta zera a varredura (muro no meio não prende)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    const p1 = h.api.createCharacter({ w: 50, h: 110, speed: 260, color: '#00f' }) as Corpo
    const p2 = h.api.createCharacter({ w: 50, h: 110, speed: 260, color: '#f00' }) as Corpo
    // Um muro sólido entre o "home" do p2 (700) e o canto onde ele lutou (100).
    h.api.defineMold('muro', { w: 40, h: 200, color: '#555' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('muro', 420, 300)
    h.api.placeCharacter(p1, 850, 400)
    h.api.placeCharacter(p2, 700, 400)
    h.api.lutaMatch(p1, p2, 3, 5) // home do p2 = 700
    h.api.placeCharacter(p2, 100, 400) // teleporte LIMPO (placeCharacter zera _prev)
    h.api.onUpdate(() => {
      h.api.collideGroup(p2, 'muro')
    })
    // Ninguém aperta nada: o round 1 acaba por TEMPO (empate) e o lutaNextRound
    // teleporta o p2 de volta ao home — 1,5 s de anúncio + 5 s + 2 s de K.O.
    for (let i = 1; i <= 180; i++) h.nextFrame(i * 50)
    expect(h.api.lutaRoundNow()).toBe(2)
    // Sem o fix, o _prev ficava em 100: o collideGroup varria o caminho 100→700,
    // trombava no muro (420) e o lutador "voltava" preso do lado errado.
    expect(p2.x).toBe(700)
  })

  it('⭐ o empurrão do motor atualiza a varredura junto (padrão carryRiders)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    const heroi = h.api.createCharacter({ w: 60, h: 60, speed: 200, color: '#00f' }) as Corpo
    const brutamontes = h.api.createCharacter({ w: 60, h: 60, speed: 200, color: '#f00' }) as Corpo
    await startGame(h)
    h.api.setState('jogando')
    h.api.placeCharacter(heroi, 100, 400)
    h.api.placeCharacter(brutamontes, 20, 400) // à esquerda: o empurrão vai p/ a direita
    h.api.knockback(heroi, brutamontes, 400)
    h.nextFrame(50) // 1 quadro de 50 ms → anda 400 × 0,05 = 20px
    expect(heroi.x).toBeCloseTo(120)
    // O contrato: deslocamento aplicado pelo MOTOR deixa a varredura consistente
    // (sem isso, um empurrão grande atravessa parede fina no quadro lento).
    expect(heroi._prevX).toBe(heroi.x)
  })
})

describe('gk — R21: o MOTOR desenha o juice (texto flutuante, onda de choque, rastro)', () => {
  async function palco(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    await startGame(h)
    h.api.setState('jogando')
  }

  it('⭐ o "+100" sobe, esmaece e SOME em ~0,75 s (sem a criança desenhar nada)', async () => {
    const h = loadRuntime()
    await palco(h)
    h.api.floatText('+100', 300, 300, '#ffffff', 24)
    texts = []
    h.nextFrame(50) // t = 0,05 s
    const cedo = texts.find((t) => t.text === '+100')
    expect(cedo).toBeDefined()
    expect((cedo as { y: number }).y).toBeLessThan(300) // já subiu
    expect((cedo as { alpha: number }).alpha).toBeGreaterThan(0.8)
    for (let i = 2; i <= 8; i++) h.nextFrame(i * 50)
    texts = []
    h.nextFrame(9 * 50) // t = 0,45 s: mais alto e mais transparente
    const meio = texts.find((t) => t.text === '+100')
    expect(meio).toBeDefined()
    expect((meio as { y: number }).y).toBeLessThan((cedo as { y: number }).y)
    expect((meio as { alpha: number }).alpha).toBeLessThan((cedo as { alpha: number }).alpha)
    for (let i = 10; i <= 16; i++) h.nextFrame(i * 50)
    texts = []
    h.nextFrame(17 * 50) // t = 0,85 s: acabou (e voltou ao pool)
    expect(texts.some((t) => t.text === '+100')).toBe(false)
  })

  it('⭐ a onda de choque cresce até o raio e some sozinha', async () => {
    const h = loadRuntime()
    await palco(h)
    h.api.shockwave(400, 300, 200, 0.4, '#ffffff')
    arcs = []
    h.nextFrame(50) // t = 0,05/0,4 → raio 200 × 0,125 = 25
    const cedo = arcs.filter((a) => a.x === 400 && a.y === 300)
    expect(cedo.length).toBe(1)
    expect((cedo[0] as { r: number }).r).toBeCloseTo(25)
    h.nextFrame(100)
    h.nextFrame(150)
    arcs = []
    h.nextFrame(200) // t = 0,2/0,4 → raio 100, mais transparente
    const meio = arcs.filter((a) => a.x === 400 && a.y === 300)
    expect((meio[0] as { r: number }).r).toBeCloseTo(100)
    expect((meio[0] as { alpha: number }).alpha).toBeLessThan((cedo[0] as { alpha: number }).alpha)
    for (let i = 5; i <= 12; i++) h.nextFrame(i * 50)
    arcs = []
    h.nextFrame(13 * 50) // bem depois de 0,4 s: nada
    expect(arcs.filter((a) => a.x === 400 && a.y === 300).length).toBe(0)
  })

  it('⭐ o rastro emite faíscas contínuas e o desligar seca a cauda', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('cometa', { w: 30, h: 30, color: '#888' })
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.spawnFromMold('cometa', 100, 100)
    h.api.trailOn(c, '#00ffff', 3, 60, 0.2)
    h.api.onDraw(() => h.api.drawEffects())
    for (let i = 1; i <= 10; i++) h.nextFrame(i * 50)
    rects = []
    h.nextFrame(11 * 50)
    // 60/s com vida 0,2 s → ~12 vivas por quadro (banda folgada p/ o arredondo).
    expect(rects.filter((r) => r.fill === '#00ffff').length).toBeGreaterThan(3)
    h.api.trailOff(c)
    for (let i = 12; i <= 20; i++) h.nextFrame(i * 50) // 0,45 s ≫ vida 0,2 s
    rects = []
    h.nextFrame(21 * 50)
    expect(rects.filter((r) => r.fill === '#00ffff').length).toBe(0)
  })
})

describe('gk — JOGAR uma invasão inteira do 🚀 Kit Nave (a lição do R17)', () => {
  /**
   * A regra do R17 vale para o kit novo: a FORMAÇÃO entra aqui JOGANDO — marcha,
   * bate na borda, desce, acelera, atira, é limpa e invade — não só nascendo.
   */
  interface Invasor {
    x: number
    y: number
    w: number
    h: number
    vy: number
  }

  async function espaco(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('ovni', { w: 40, h: 30, color: '#0f0' })
    h.api.defineMold('tiro-ovni', { w: 4, h: 12, color: '#fff' })
    await startGame(h)
    h.api.setState('jogando')
  }
  function vivos(h: Harness, mold: string): Invasor[] {
    const out: Invasor[] = []
    h.api.forEachActive(mold, (e: unknown) => out.push(e as Invasor))
    return out
  }

  it('⭐ a onda nasce em grade e MARCHA EM BLOCO: inverte na borda, desce e ACELERA', async () => {
    const h = loadRuntime()
    await espaco(h)
    h.api.naveWave('ovni', 4, 2, 60, 150, 30, 15)
    expect(h.api.countActive('ovni')).toBe(8)
    const ms = vivos(h, 'ovni')
    const x0 = Math.min(...ms.map((m) => m.x))
    const y0 = Math.min(...ms.map((m) => m.y))
    const span0 = Math.max(...ms.map((m) => m.x + m.w)) - x0
    for (let i = 1; i <= 10; i++) h.nextFrame(i * 50)
    // marchou para a direita, SEM deformar o bloco
    const x1 = Math.min(...ms.map((m) => m.x))
    const span1 = Math.max(...ms.map((m) => m.x + m.w)) - x1
    expect(x1).toBeGreaterThan(x0)
    expect(span1).toBeCloseTo(span0)
    // 20 s de jogo: com aceleração de 15% por batida saem ≥5 descidas de 30px;
    // SEM aceleração (a 150 px/s constantes) seriam só 4 (120px). O limiar de
    // 150px separa os dois mundos com folga — é o teste da aceleração.
    for (let i = 11; i <= 400; i++) h.nextFrame(i * 50)
    const y1 = Math.min(...vivos(h, 'ovni').map((m) => m.y))
    expect(y1 - y0).toBeGreaterThanOrEqual(150)
  })

  it('⭐ um invasor SORTEADO atira no ritmo (o tiro nasce descendo)', async () => {
    const h = loadRuntime()
    await espaco(h)
    h.api.naveWave('ovni', 3, 1, 60, 100, 30, 0)
    h.api.naveWaveShooter('ovni', 1, 'tiro-ovni', 300)
    for (let i = 1; i <= 45; i++) h.nextFrame(i * 50) // 2,25 s → tiros em 1 s e 2 s
    expect(h.api.countActive('tiro-ovni')).toBe(2)
    for (const t of vivos(h, 'tiro-ovni')) expect(t.vy).toBe(300)
  })

  it('⭐ derrotar TODOS avisa onda:limpa (e a criança encadeia a onda seguinte)', async () => {
    const h = loadRuntime()
    await espaco(h)
    let limpa = 0
    h.api.on('onda:limpa', () => {
      limpa += 1
    })
    h.api.naveWave('ovni', 3, 1, 60, 100, 30, 0)
    h.nextFrame(50)
    expect(limpa).toBe(0)
    h.api.forEachActive('ovni', (e: unknown) => h.api.recycle(e))
    h.nextFrame(100) // o sweep do stepNave vê a formação vazia
    expect(limpa).toBe(1)
  })

  it('⭐ a formação DESCE até a linha de invasão → onda:invadiu → fim de jogo', async () => {
    const h = loadRuntime()
    await espaco(h)
    h.api.on('onda:invadiu', () => h.api.endGame())
    h.api.naveInvasionLine(200)
    h.api.naveWave('ovni', 3, 1, 60, 1500, 30, 30)
    for (let i = 1; i <= 200 && h.api.state() === 'jogando'; i++) h.nextFrame(i * 50)
    expect(h.api.state()).toBe('fim')
  })

  it('⭐ R24: 12 colunas × gap 120 CABEM na tela — a onda não treme nem despenca', async () => {
    const h = loadRuntime()
    await espaco(h)
    // Pedido "impossível": 11×120 + 40 = 1360px de grade numa tela de 960.
    // Antes do R24 a formação tocava as DUAS bordas, invertia TODO quadro e
    // descia 30px por quadro (600px/s no dt de teste) — invasão instantânea.
    h.api.naveWave('ovni', 12, 1, 120, 150, 30, 0)
    const ms = vivos(h, 'ovni')
    expect(ms.length).toBe(12) // as COLUNAS pedidas são respeitadas
    const span = Math.max(...ms.map((m) => m.x + m.w)) - Math.min(...ms.map((m) => m.x))
    expect(span).toBeLessThanOrEqual(960 * 0.9 + 1) // o ESPAÇO foi espremido
    const y0 = Math.min(...ms.map((m) => m.y))
    for (let i = 1; i <= 20; i++) h.nextFrame(i * 50) // 1 s de jogo
    const y1 = Math.min(...vivos(h, 'ovni').map((m) => m.y))
    expect(y1 - y0).toBeLessThanOrEqual(60) // no máx. 2 descidas legítimas em 1 s
  })

  it('⭐ R24: poder renovado num objeto RECICLADO do pool não decai em dobro', async () => {
    const h = loadRuntime()
    await espaco(h)
    const e1 = h.api.spawnFromMold('ovni', 100, 100)
    h.api.navePowerup(e1, 'metralhadora', 1)
    h.api.recycle(e1)
    const e2 = h.api.spawnFromMold('ovni', 100, 100)
    expect(e2).toBe(e1) // o pool reusa o MESMO objeto (free é LIFO)
    h.api.navePowerup(e2, 'metralhadora', 1)
    // Antes do R24 o objeto entrava 2× em powered[] e o timer decaía em DOBRO:
    // o poder de 1 s morria em ~0,5 s. Em 0,75 s ele tem que estar VIVO…
    for (let i = 1; i <= 15; i++) h.nextFrame(i * 50)
    expect(h.api.navePowerOf(e2)).toBe('metralhadora')
    // …e depois de 1 s inteiro, expirar normal.
    for (let i = 16; i <= 24; i++) h.nextFrame(i * 50)
    expect(h.api.navePowerOf(e2)).toBe('normal')
  })

  it('⭐ "Jogar de novo" limpa ondas e poderes (sem onda:limpa fantasma)', async () => {
    const h = loadRuntime()
    await espaco(h)
    const nave = h.api.createCharacter({ w: 50, h: 30, color: '#00f' })
    let limpa = 0
    h.api.on('onda:limpa', () => {
      limpa += 1
    })
    h.api.naveWave('ovni', 3, 1, 60, 100, 30, 0)
    h.api.navePowerup(nave, 'metralhadora', 99)
    expect(h.api.navePowerOf(nave)).toBe('metralhadora')
    h.api.setState('menu')
    h.api.restartGame()
    expect(h.api.countActive('ovni')).toBe(0) // o releaseAll recolheu o enxame
    expect(h.api.navePowerOf(nave)).toBe('normal') // o poder não sobrevive
    for (let i = 1; i <= 3; i++) h.nextFrame(i * 50)
    // Se o naveNewGame NÃO limpasse as ondas, o registro órfão (agora vazio)
    // emitiria um 'onda:limpa' fantasma no 1º quadro do jogo novo.
    expect(limpa).toBe(0)
  })
})

describe('gk — JOGAR uma fase inteira do 🏃 Kit Plataforma', () => {
  interface Heroi {
    x: number
    y: number
    vx: number
    vy: number
    onGround: boolean
    _coyoteT: number
  }

  // Mundo compartilhado: chão de moldes, ordem canônica no A cada quadro.
  async function fase(h: Harness, groundW = 400) {
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('chao', { w: groundW, h: 40, color: '#3f7d3f' })
    h.api.defineMold('movel', { w: 120, h: 16, color: '#c08040' })
    h.api.defineMold('bicho', { w: 40, h: 40, color: '#8b3a3a' })
    await startGame(h)
    h.api.setState('jogando')
    // coyote 0,15s = 3 quadros de 50ms; pulo alto 0,3s.
    h.api.setJumpFeel(0.15, 0.1, 0.3, 2160)
  }
  function quadros(h: Harness, n: number, from = 1) {
    for (let i = from; i < from + n; i++) h.nextFrame(i * 50)
  }

  it('⭐ o herói CAI, pousa no chão de moldes e FICA (collideGroup marca onGround)', async () => {
    const h = loadRuntime()
    await fase(h)
    const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#2b6cb0' }) as Heroi
    h.api.spawnFromMold('chao', 0, 460) // topo em y=460 (x 0..400)
    h.api.placeCharacter(heroi, 100, 200) // no ar, sobre o chão
    h.api.onUpdate((dt: number) => {
      h.api.platformerHero(heroi, 240, 660, dt)
      h.api.collideGroup(heroi, 'chao')
    })
    quadros(h, 30)
    expect(heroi.onGround).toBe(true)
    expect(heroi.y).toBeCloseTo(412, 0) // 460 − 48
    const yPousado = heroi.y
    quadros(h, 10, 31)
    expect(heroi.y).toBeCloseTo(yPousado, 0) // ficou parado no chão
  })

  it('⭐ pular do chão SOBE (o buffer encontra o coyote)', async () => {
    const h = loadRuntime()
    await fase(h)
    const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#00f' }) as Heroi
    h.api.spawnFromMold('chao', 0, 460)
    h.api.placeCharacter(heroi, 100, 412)
    h.api.onUpdate((dt: number) => {
      h.api.platformerHero(heroi, 240, 660, dt)
      h.api.collideGroup(heroi, 'chao')
    })
    quadros(h, 5) // assenta no chão
    expect(heroi.onGround).toBe(true)
    const yChao = heroi.y
    h.fire('keydown', { key: ' ' })
    quadros(h, 4, 6) // apertou pular
    expect(heroi.y).toBeLessThan(yChao - 20) // subiu
    expect(heroi.vy).toBeLessThan(0)
  })

  it('⭐ coyote: pular LOGO depois de sair da beirada ainda funciona; tarde demais NÃO', async () => {
    // Dois runtimes idênticos: um pula 2 quadros após sair do chão (dentro do
    // coyote de 0,15s = 3 quadros), o outro só no 6º (expirou).
    async function correuEPulou(atrasoQuadros: number): Promise<boolean> {
      const h = loadRuntime()
      await fase(h, 160) // chão estreito x 0..160 (topo 460)
      const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#0a0' }) as Heroi
      h.api.spawnFromMold('chao', 0, 460)
      h.api.placeCharacter(heroi, 40, 412)
      h.api.onUpdate((dt: number) => {
        h.api.platformerHero(heroi, 240, 660, dt)
        h.api.collideGroup(heroi, 'chao')
      })
      quadros(h, 4) // assenta
      // Segura 'd' até SAIR do chão (passa de x=160-32).
      let t = 5
      let saiuEm = -1
      for (; t <= 40; t++) {
        h.fire('keydown', { key: 'd' })
        h.nextFrame(t * 50)
        if (!heroi.onGround && saiuEm < 0) saiuEm = t
        if (saiuEm > 0 && t >= saiuEm + atrasoQuadros) break
      }
      const yAntes = heroi.y
      h.fire('keydown', { key: ' ' }) // tenta pular
      h.nextFrame((t + 1) * 50)
      h.nextFrame((t + 2) * 50)
      return heroi.y < yAntes - 5 // subiu = o pulo saiu
    }
    expect(await correuEPulou(1)).toBe(true) // dentro do coyote
    expect(await correuEPulou(6)).toBe(false) // coyote expirou: só caiu
  })

  it('⭐ pulo variável: soltar cedo pula MAIS BAIXO que segurar', async () => {
    async function pico(segurar: boolean): Promise<number> {
      const h = loadRuntime()
      await fase(h)
      const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#f0f' }) as Heroi
      h.api.spawnFromMold('chao', 0, 460)
      h.api.placeCharacter(heroi, 100, 412)
      h.api.onUpdate((dt: number) => {
        h.api.platformerHero(heroi, 240, 660, dt)
        h.api.collideGroup(heroi, 'chao')
      })
      quadros(h, 4)
      let menor = heroi.y
      for (let i = 5; i <= 30; i++) {
        if (segurar)
          h.fire('keydown', { key: ' ' }) // segura o pulo todo quadro
        else if (i === 5)
          h.fire('keydown', { key: ' ' }) // toca 1x
        else if (i === 6) h.fire('keyup', { key: ' ' }) // e solta cedo
        h.nextFrame(i * 50)
        if (heroi.y < menor) menor = heroi.y
      }
      return menor
    }
    const picoSegurando = await pico(true)
    const picoToque = await pico(false)
    expect(picoSegurando).toBeLessThan(picoToque - 40) // segurar sobe bem mais alto
  })

  it('⭐ a plataforma móvel CARREGA o herói (rideOn, sem escorregar)', async () => {
    const h = loadRuntime()
    await fase(h)
    const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#00f' }) as Heroi
    const plat = h.api.spawnFromMold('movel', 200, 400) as { x: number }
    h.api.placeCharacter(heroi, 240, 336) // sobre a plataforma (topo 400 − 48 = 352… assenta)
    h.api.onUpdate((dt: number) => {
      h.api.platformerHero(heroi, 240, 660, dt)
      h.api.movingPlatform(plat, 200, 400, 400, 400, 2, dt) // desliza p/ a direita
      h.api.collideGroup(heroi, 'movel')
      h.api.rideOn(heroi, 'movel')
    })
    quadros(h, 3) // assenta em cima
    const hx0 = heroi.x
    const px0 = plat.x
    quadros(h, 20, 4)
    const dHeroi = heroi.x - hx0
    const dPlat = plat.x - px0
    expect(dPlat).toBeGreaterThan(30) // a plataforma andou mesmo
    expect(Math.abs(dHeroi - dPlat)).toBeLessThan(8) // o herói foi junto
  })

  it('⭐ pisar no bicho MATA + QUICA, e a bandeira (região) dá a vitória', async () => {
    const h = loadRuntime()
    await fase(h)
    const heroi = h.api.createCharacter({ w: 32, h: 48, speed: 240, color: '#00f' }) as Heroi
    h.api.spawnFromMold('chao', 0, 460)
    h.api.spawnFromMold('bicho', 300, 420) // no chão (topo em 420)
    h.api.placeCharacter(heroi, 300, 300) // acima do bicho
    let pisou = 0
    h.api.on('plataforma:pisou', () => {
      pisou += 1
    })
    h.api.defineRegion('bandeira', 250, 400, 120, 80) // o pouso final, no chão
    h.api.onUpdate((dt: number) => {
      h.api.platformerHero(heroi, 240, 660, dt)
      h.api.collideGroup(heroi, 'chao')
      h.api.stompKill(heroi, 'bicho', 400)
      // A bandeira só conta DEPOIS do bicho (o herói cai atravessando a região
      // no caminho de descida — sem o gate, venceria antes de pisar).
      if (pisou > 0 && h.api.isInside(heroi, 'bandeira')) h.api.setState('vitoria')
    })
    for (let i = 1; i <= 60 && h.api.state() === 'jogando'; i++) h.nextFrame(i * 50)
    expect(pisou).toBe(1) // pisou no bicho
    expect(h.api.countActive('bicho')).toBe(0) // que morreu
    expect(h.api.state()).toBe('vitoria') // e a bandeira deu a vitória
  })
})

describe('gk — JOGAR uma aventura inteira do 🧙 Kit RPG', () => {
  interface Heroi {
    x: number
    y: number
  }

  // Duas telas: vila (guarda + porta p/ o salão) e salão (chefe → batalha).
  // Herói FORTE (força 50 vs chefe de 10 HP) = vence no 1º Atacar, determinístico
  // apesar do ±20% do dano.
  async function mundoRpg(h: Harness): Promise<Heroi> {
    h.api.setup({ width: 960, height: 640 })
    h.api.rpgBattleStats(60, 50, 10)
    const heroi = h.api.createCharacter({ w: 48, h: 48, speed: 640, color: '#2b6cb0' }) as Heroi
    h.api.rpgCreateMap('vila', 10, 10, () => {})
    h.api.rpgCreateMap('salao', 10, 10, () => {})
    h.api.rpgOnEnterMap('vila', () => {
      h.api.placeCharacter(heroi, h.api.rpgCell(1), h.api.rpgCell(2))
      h.api.rpgCreateNpc('guarda', 3, 2, '', '')
    })
    h.api.rpgOnEnterMap('salao', () => {
      h.api.placeCharacter(heroi, h.api.rpgCell(1), h.api.rpgCell(2))
      h.api.rpgCreateNpc('chefe', 2, 2, '', '')
    })
    h.api.rpgOnTalk('guarda', () => {
      h.api.rpgSay('Vá ao salão!', 'Guarda')
      h.api.rpgAddFlag('portao')
      h.api.rpgCreateDoor(2, 3, 'salao') // porta na célula abaixo do herói
    })
    h.api.rpgOnTalk('chefe', () => {
      h.api.rpgBattleStart('Chefão', 10, 1, 0)
    })
    h.api.rpgOnBattleEnd(() => {
      if (h.api.rpgBattleWon()) h.api.rpgBattleReward(25)
    })
    h.api.onUpdate((dt: number) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.restartGame() // a nova partida vai ao mapa inicial e posiciona
    return heroi
  }
  function segura(h: Harness, key: string, n: number, from: number): number {
    let t = from
    for (let i = 0; i < n; i++, t++) {
      h.fire('keydown', { key })
      h.nextFrame(t * 50)
    }
    h.fire('keyup', { key })
    return t
  }
  // A batalha em equipe é no CANVAS: aperta espaço a cada quadro (confirma "Atacar"
  // no painel de ação) até a batalha terminar. Devolve o novo contador de quadros.
  function venceBatalha(h: Harness, from: number): number {
    let t = from
    for (let i = 0; i < 80 && h.api.state() === 'batalha'; i++, t++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(t * 50)
      h.fire('keyup', { key: ' ' })
    }
    return t
  }

  it('⭐ a grade anda por célula e o NPC SEGURA (vira, não entra)', async () => {
    const h = loadRuntime()
    const heroi = await mundoRpg(h)
    expect(heroi.x).toBe(64) // nasceu na célula (1,2)
    segura(h, 'ArrowRight', 16, 1) // tenta ir até a direita
    // De (1,2) anda p/ (2,2); (3,2) é o guarda → BLOQUEIA. Para em x=128 (não 192).
    expect(heroi.x).toBe(128)
  })

  it('⭐ falar (espaço) trava o herói, dá a FLAG e cria a porta', async () => {
    const h = loadRuntime()
    const heroi = await mundoRpg(h)
    const fim = segura(h, 'ArrowRight', 16, 1) // encosta no guarda, virado p/ direita
    expect(h.api.rpgHasFlag('portao')).toBe(false)
    h.fire('keydown', { key: ' ' })
    h.nextFrame(fim * 50) // conversa
    expect(h.api.rpgHasFlag('portao')).toBe(true)
    // A fala está aberta: segurar direção NÃO move o herói.
    const xTravado = heroi.x
    segura(h, 'ArrowDown', 4, fim + 1)
    expect(heroi.x).toBe(xTravado)
  })

  it('⭐ a porta troca de mapa (o hook do salão roda e reposiciona o herói)', async () => {
    const h = loadRuntime()
    const heroi = await mundoRpg(h)
    let t = segura(h, 'ArrowRight', 16, 1)
    h.fire('keydown', { key: ' ' })
    h.nextFrame(t * 50) // fala do guarda (cria a porta em (2,3))
    t += 1
    let trocou = 0
    h.api.on('mapa:salao', () => {
      trocou += 1
    })
    // Fecha a fala (espaço até 'fala:terminada' liberar o herói) e desce à porta.
    for (let i = 0; i < 30 && trocou === 0; i++, t++) {
      h.fire('keydown', { key: i % 2 === 0 ? ' ' : 'ArrowDown' })
      h.nextFrame(t * 50)
    }
    expect(trocou).toBe(1)
    expect(heroi.x).toBe(64) // reposicionado na célula (1,2) do salão
  })

  it('⭐ a batalha joga até VENCER no Atacar → rpgBattleWon → XP sobe o nível', async () => {
    const h = loadRuntime()
    const heroi = await mundoRpg(h)
    // Vai ao salão (fala guarda → porta → descer, até 'mapa:salao').
    let t = segura(h, 'ArrowRight', 16, 1)
    h.fire('keydown', { key: ' ' })
    h.nextFrame(t * 50)
    t += 1
    let trocou = 0
    h.api.on('mapa:salao', () => {
      trocou += 1
    })
    for (let i = 0; i < 30 && trocou === 0; i++, t++) {
      h.fire('keydown', { key: i % 2 === 0 ? ' ' : 'ArrowDown' })
      h.nextFrame(t * 50)
    }
    expect(trocou).toBe(1) // chegou no salão
    // No salão, encosta no chefe (célula 2,2; herói em 1,2 → vira p/ direita) e fala.
    t = segura(h, 'ArrowRight', 6, t + 1)
    h.fire('keydown', { key: ' ' })
    h.nextFrame(t * 50)
    expect(h.api.state()).toBe('batalha')
    // JOGA a batalha no canvas: aperta "Atacar" no painel (força 50 mata o chefe de
    // 10 HP no 1º golpe) até vencer.
    t = venceBatalha(h, t + 1)
    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgBattleWon()).toBe(true)
    // A recompensa (25 XP, teto 20) subiu o nível: playerXp 25→5, nível 1→2.
    expect(h.api.rpgLevel()).toBe(2)
    expect(h.api.rpgXp()).toBe(5)
    void heroi
  })

  it('⭐ Vila do Dragão EXATA: vila → ferreiro → chave → porta → caverna → vitória → novo jogo', async () => {
    const h = loadRuntime()
    const code = generateJS({
      behavior: vilaDoDragaoExample.ir.behavior,
      lifecycle: 'game-2d-advanced',
    })
    new Function('window', 'SZGameKit', code)(h.window, h.api)
    await Promise.resolve()
    await Promise.resolve()

    let tick = 1
    const frame = () => h.nextFrame(tick++ * 100)
    const advance = (count: number) => {
      for (let i = 0; i < count; i++) frame()
    }
    const tap = (key: string) => {
      h.fire('keydown', { key })
      frame()
      h.fire('keyup', { key })
      frame()
    }
    const moveCell = (key: string) => {
      tap(key)
      advance(3)
    }
    const savedPosition = (): { map: string; hx: number; hy: number } => {
      h.api.rpgSave()
      const raw = h.storage.get('szgk-rpg-save')
      if (!raw) throw new Error('Vila do Dragão não produziu save observável')
      return JSON.parse(raw) as { map: string; hx: number; hy: number }
    }

    h.api.restartGame()
    frame() // o primeiro onUpdate registra o personagem como herói do RPG
    expect(h.api.rpgCurrentMap()).toBe('vila')
    expect(savedPosition()).toMatchObject({ map: 'vila', hx: 2, hy: 2 })

    // A vila precisa se explicar visualmente antes de qualquer ação secreta.
    rects = []
    texts = []
    frame()
    expect(rects.some((item) => item.fill === '#5c7f45')).toBe(true)
    expect(texts.some((item) => item.text === 'VILA DO DRAGÃO')).toBe(true)
    expect(texts.some((item) => item.text === 'Objetivo: ouça o Ferreiro')).toBe(true)

    // Termina a abertura. A conversa que a pessoa já viu ENTREGA a missão:
    // não existe uma segunda interação invisível com o ferreiro.
    for (let i = 0; i < 32; i++) tap(' ')
    expect(h.api.rpgHasFlag('aceitou-missao')).toBe(true)
    expect(h.api.rpgHasItem('chave')).toBe(true)
    rects = []
    texts = []
    frame()
    expect(texts.some((item) => item.text === 'Objetivo: entre na caverna')).toBe(true)
    expect(texts.some((item) => item.text === 'PORTA DA CAVERNA')).toBe(true)

    // Caminho real até a porta criada em (9,6), sem chamar rpgGoMap no teste.
    for (let i = 0; i < 4; i++) moveCell('ArrowDown')
    expect(savedPosition()).toMatchObject({ map: 'vila', hx: 2, hy: 6 })
    for (let i = 0; i < 7 && h.api.rpgCurrentMap() === 'vila'; i++) {
      moveCell('ArrowRight')
    }
    expect(h.api.rpgCurrentMap()).toBe('caverna')
    expect(savedPosition()).toMatchObject({ map: 'caverna', hx: 1, hy: 5 })
    rects = []
    texts = []
    frame()
    expect(rects.some((item) => item.fill === '#17131f')).toBe(true)
    expect(texts.some((item) => item.text === 'CAVERNA DO DRAGÃO')).toBe(true)
    expect(texts.some((item) => item.text === 'ESPAÇO: enfrentar o Dragão')).toBe(true)

    // Encosta no dragão em (8,2), conversa e abre a batalha do fixture exato.
    for (let i = 0; i < 3; i++) moveCell('ArrowUp')
    for (let i = 0; i < 6; i++) moveCell('ArrowRight')
    moveCell('ArrowRight')
    tap(' ')
    advance(8)
    expect(h.api.state()).toBe('batalha')

    const battle = () =>
      inspectBattle<{
        menuOpen: boolean
        menuLabels: string[]
        allies: Array<{ energy: number }>
      }>(h)
    const waitForMenu = () => {
      for (let i = 0; i < 30 && h.api.state() === 'batalha'; i++) {
        if (battle()?.menuOpen) return
        frame()
      }
    }
    const choose = (label: string) => {
      waitForMenu()
      const snapshot = battle()
      if (!snapshot?.menuOpen) throw new Error(`menu não abriu para escolher ${label}`)
      const index = snapshot.menuLabels.findIndex((item) => item.includes(label))
      if (index < 0) throw new Error(`ação ${label} não existe: ${snapshot.menuLabels.join(', ')}`)
      for (let i = 0; i < index; i++) tap('ArrowDown')
      tap(' ')
      waitForMenu()
    }

    // Exercita defesa, especial e poção antes de fechar o combate.
    choose('Defender')
    choose('Espada flamejante')
    choose('Item')
    for (let turns = 0; turns < 10 && h.api.state() === 'batalha'; turns++) {
      const snapshot = battle()
      choose((snapshot?.allies[0]?.energy ?? 0) >= 4 ? 'Espada flamejante' : 'Atacar')
    }

    expect(h.api.state()).toBe('vitoria')
    expect(h.api.rpgBattleWon()).toBe(true)
    expect(h.api.rpgLevel()).toBe(2)

    // O botão "Jogar de novo" realiza esta transição e deve zerar tudo.
    h.api.restartGame()
    expect(h.api.rpgCurrentMap()).toBe('vila')
    expect(h.api.rpgHasItem('chave')).toBe(false)
    expect(h.api.rpgHasFlag('aceitou-missao')).toBe(false)
    expect(h.api.rpgLevel()).toBe(1)
    expect(h.api.rpgXp()).toBe(0)
    expect(inspectBattle(h)).toBeNull()
  })
})

describe('gk — ⚔️ JOGAR a batalha em EQUIPE (aliados + vários inimigos)', () => {
  interface BattleSnap {
    phase: string
    allies: Array<{ name: string; alive: boolean }>
    foes: Array<{ name: string; alive: boolean }>
  }
  function snap(h: Harness): BattleSnap | null {
    return inspectBattle<BattleSnap>(h)
  }

  it('⭐ o time (herói + aliado) derrota DOIS inimigos e a vitória dá XP', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(50, 40, 5) // herói forte (vence rápido)
    h.api.rpgAddAlly('Arqueira', 30, 20, 2, '#22c55e') // 1 aliado no time
    h.api.rpgTeachMove('Arqueira', 'Flecha', 18, 2)
    let venceu = 0
    h.api.rpgOnBattleEnd(() => {
      if (h.api.rpgBattleWon()) {
        h.api.rpgBattleReward(30)
        venceu += 1
      }
    })
    h.api.rpgAddFoe('Capanga', 20, 6, 0, '#ef4444') // 2 inimigos (vários contra vários)
    h.api.rpgBattleStart('Chefe', 20, 8, 0)
    expect(h.api.state()).toBe('batalha')
    const s0 = snap(h)
    expect(s0?.allies.length).toBe(2) // herói + Arqueira
    expect(s0?.foes.length).toBe(2) // Chefe + Capanga
    // JOGA no canvas: aperta "Atacar" a cada quadro (com 2 inimigos, o espaço mira o
    // 1º vivo na fase de mira) até o time varrer os dois bandidos.
    let t = 1
    for (let i = 0; i < 200 && h.api.state() === 'batalha'; i++, t++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(t * 50)
      h.fire('keyup', { key: ' ' })
    }
    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgBattleWon()).toBe(true)
    expect(venceu).toBe(1)
    expect(h.api.rpgXp()).toBeGreaterThan(0)
  })

  it('a fila de inimigos é CONSUMIDA: a batalha seguinte não herda o Capanga', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(50, 40, 5)
    h.api.rpgAddFoe('Capanga', 20, 6, 0, '#ef4444')
    h.api.rpgBattleStart('Chefe', 20, 8, 0)
    expect(snap(h)?.foes.length).toBe(2)
    // termina esta batalha
    let t = 1
    for (let i = 0; i < 200 && h.api.state() === 'batalha'; i++, t++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(t * 50)
      h.fire('keyup', { key: ' ' })
    }
    expect(h.api.state()).toBe('jogando')
    // Nova batalha SEM adicionar inimigo: só o nomeado (a fila foi consumida).
    h.api.rpgBattleStart('Outro', 20, 8, 0)
    expect(snap(h)?.foes.length).toBe(1)
  })
})

describe('gk — 🌍 ATRAVESSAR as bordas do mundo aberto (mapas ligados)', () => {
  interface Heroi {
    x: number
    y: number
  }

  // Dois mapas 6×5 ligados: campo (leste→praia) e praia (oeste→campo). O hook da
  // praia coloca o herói LONGE de propósito — a entrada pela borda tem que VENCER.
  async function mundoAberto(h: Harness): Promise<Heroi> {
    h.api.setup({ width: 960, height: 640 })
    const heroi = h.api.createCharacter({ w: 48, h: 48, speed: 640, color: '#2b6cb0' }) as Heroi
    h.api.rpgCreateMap('campo', 6, 5, () => {})
    h.api.rpgCreateMap('praia', 6, 5, () => {})
    h.api.rpgOnEnterMap('campo', () => {
      h.api.rpgConnectEdge('leste', 'praia')
      h.api.placeCharacter(heroi, h.api.rpgCell(4), h.api.rpgCell(2))
    })
    h.api.rpgOnEnterMap('praia', () => {
      h.api.rpgConnectEdge('oeste', 'campo')
      h.api.placeCharacter(heroi, h.api.rpgCell(4), h.api.rpgCell(4)) // LONGE da borda
    })
    h.api.onUpdate((dt: number) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.restartGame() // vai ao mapa inicial (campo)
    return heroi
  }
  function segura(h: Harness, key: string, n: number, from: number): number {
    let t = from
    for (let i = 0; i < n; i++, t++) {
      h.fire('keydown', { key })
      h.nextFrame(t * 50)
    }
    h.fire('keyup', { key })
    return t
  }

  it('⭐ leste → praia na MESMA linha (a borda vence o hook) e oeste volta', async () => {
    const h = loadRuntime()
    const heroi = await mundoAberto(h)
    expect(h.api.rpgCurrentMap()).toBe('campo')
    let praia = 0
    let campo = 0
    h.api.on('mapa:praia', () => {
      praia += 1
    })
    h.api.on('mapa:campo', () => {
      campo += 1
    })
    // De (4,2) até a col 5 e mais um passo: anda ATÉ atravessar a borda LESTE
    // (o padrão do teste da porta — parar de apertar assim que trocar).
    let t = 1
    for (let i = 0; i < 12 && praia === 0; i++, t++) {
      h.fire('keydown', { key: 'ArrowRight' })
      h.nextFrame(t * 50)
    }
    h.fire('keyup', { key: 'ArrowRight' })
    expect(praia).toBe(1)
    expect(h.api.rpgCurrentMap()).toBe('praia')
    // Entrou pela col 0 na MESMA linha (2) — NÃO no (4,4) do placeCharacter do hook.
    expect(heroi.x).toBe(0)
    expect(heroi.y).toBe(128)
    // Voltar pelo OESTE: entra na col 5 do campo (espelhado), mesma linha.
    for (let i = 0; i < 12 && campo === 0; i++, t++) {
      h.fire('keydown', { key: 'ArrowLeft' })
      h.nextFrame(t * 50)
    }
    h.fire('keyup', { key: 'ArrowLeft' })
    expect(campo).toBe(1)
    expect(h.api.rpgCurrentMap()).toBe('campo')
    expect(heroi.x).toBe(320) // col 5 = mapCols-1
    expect(heroi.y).toBe(128)
  })

  it('borda SEM ligação = fim do mundo (herói para; nenhum aviso de mapa)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 640 })
    const heroi = h.api.createCharacter({ w: 48, h: 48, speed: 640, color: '#2b6cb0' }) as {
      x: number
      y: number
    }
    h.api.rpgCreateMap('ilha', 6, 5, () => {})
    h.api.rpgOnEnterMap('ilha', () => {
      h.api.placeCharacter(heroi, h.api.rpgCell(5), h.api.rpgCell(2))
    })
    h.api.onUpdate((dt: number) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.restartGame()
    let eventos = 0
    h.api.on('mapa:ilha', () => {
      eventos += 1
    })
    segura(h, 'ArrowRight', 8, 1)
    expect(heroi.x).toBe(320) // não saiu da col 5
    expect(eventos).toBe(0) // nenhuma re-entrada no mapa
  })
})

describe('gk — JOGAR uma partida inteira do 🏰 Kit Defesa de Torre (R26)', () => {
  interface Inv {
    x: number
    y: number
    w: number
    h: number
  }

  /** O caminho é uma trilha em L: entra pela esquerda (y=120, p/ +x) e sai pela
   *  direita (x~1000). Os moldes são o invasor (com vida), a torre e o tiro. */
  async function arenaTd(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('invasor', { w: 34, h: 34, health: 30, color: '#e0526a' })
    h.api.defineMold('torre', { w: 40, h: 40, health: 1, color: '#4a9eff' })
    h.api.defineMold('tiro', { w: 10, h: 10, health: 1, color: '#ffe066' })
    h.api.definePath('trilha', () => {
      h.api.pathPoint(-40, 120)
      h.api.pathPoint(300, 120)
      h.api.pathPoint(300, 400)
      h.api.pathPoint(660, 400)
      h.api.pathPoint(660, 200)
      h.api.pathPoint(1000, 200)
    })
    await startGame(h)
    h.api.restartGame()
  }

  function vivos(h: Harness, mold: string): Inv[] {
    const out: Inv[] = []
    h.api.forEachActive(mold, (e: unknown) => out.push(e as Inv))
    return out
  }

  /** Dispara um clique REAL no canvas (o pointerdown vive no elemento, não no
   *  window). Rect 0×0 no headless → toGameCoords cai no fallback escala 1, então
   *  clientX/Y = coord do jogo (é o que o fix do toGameCoords do R26 destrava). */
  function clickAt(x: number, y: number) {
    const canvas = document.querySelector('#szgk-canvas')
    if (!canvas) throw new Error('sem canvas para clicar')
    const ev = new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true })
    canvas.dispatchEvent(ev)
  }

  it('⭐ a onda ENTRA pelo caminho, MARCHA ponto a ponto e o vazamento avisa', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    let passou = 0
    h.api.on('invasor:passou', () => {
      passou += 1
    })
    h.api.tdWave('trilha', 3, 'invasor', 150, 90)
    expect(h.api.countActive('invasor')).toBe(3)
    // o líder é o da frente (maior x no 1º trecho horizontal p/ +x)
    const lider = vivos(h, 'invasor').reduce((a, b) => (a.x >= b.x ? a : b))
    const x0 = lider.x
    for (let i = 1; i <= 20; i++) h.nextFrame(i * 50)
    expect(lider.x).toBeGreaterThan(x0) // andou o caminho
    // deixa TODOS chegarem ao fim (saem pela direita) → vazam e são recolhidos
    for (let i = 21; i <= 800 && h.api.countActive('invasor') > 0; i++) h.nextFrame(i * 50)
    expect(passou).toBeGreaterThanOrEqual(1)
    expect(h.api.countActive('invasor')).toBe(0)
  })

  it('⭐ comprar: paga e ocupa o lugar; clicar de novo no MESMO lugar não faz nada', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    h.api.tdSetCoins(100)
    h.api.tdSlot(300, 220, 60)
    h.api.tdOnBuy(50, (lugarX: unknown, lugarY: unknown) => {
      h.api.spawnFromMold('torre', (lugarX as number) - 20, (lugarY as number) - 20)
    })
    expect(h.api.tdCoins()).toBe(100)
    clickAt(300, 220)
    expect(h.api.countActive('torre')).toBe(1)
    expect(h.api.tdCoins()).toBe(50) // pagou 50
    clickAt(300, 220) // lugar ocupado → nada
    expect(h.api.countActive('torre')).toBe(1)
    expect(h.api.tdCoins()).toBe(50)
  })

  it('um clique executa uma única compra mesmo se o evento foi duplicado', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    h.api.tdSetCoins(100)
    h.api.tdSlot(300, 220, 60)
    let primeira = 0
    let segunda = 0
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
    try {
      h.api.tdOnBuy(50, () => {
        primeira += 1
      })
      h.api.tdOnBuy(25, () => {
        segunda += 1
      })
      clickAt(300, 220)
    } finally {
      console.warn = originalWarn
    }

    expect({ primeira, segunda, moedas: h.api.tdCoins() }).toEqual({
      primeira: 1,
      segunda: 0,
      moedas: 50,
    })
    expect(warnings.some((warning) => warning.includes('um bloco'))).toBe(true)
  })

  it('runProject recria os registros de torre sem duplicar slots nem compras', async () => {
    const h = loadRuntime()

    h.api.runProject(() => {
      h.api.setup({ width: 960, height: 540 })
      h.api.defineMold('torre', { w: 40, h: 40, health: 1, color: '#4a9eff' })
      h.api.tdSetCoins(100)
      h.api.tdSlot(300, 220, 60)
      h.api.tdOnBuy(50, (lugarX: unknown, lugarY: unknown) => {
        h.api.spawnFromMold('torre', (lugarX as number) - 20, (lugarY as number) - 20)
      })
    })

    await startGame(h)
    h.api.restartGame()
    clickAt(300, 220)

    expect(h.api.countActive('torre')).toBe(1)
    expect(h.api.tdCoins()).toBe(50)
  })

  it('⭐ sem moedas: a compra é NEGADA (avisa) e nada nasce', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    h.api.tdSetCoins(30) // menos que o custo de 50
    h.api.tdSlot(300, 220, 60)
    let negada = 0
    h.api.on('compra:negada', () => {
      negada += 1
    })
    h.api.tdOnBuy(50, () => {
      h.api.spawnFromMold('torre', 280, 200)
    })
    clickAt(300, 220)
    expect(negada).toBe(1)
    expect(h.api.countActive('torre')).toBe(0)
    expect(h.api.tdCoins()).toBe(30) // não gastou
  })

  it('⭐ a torre mira o invasor MAIS avançado no caminho (pickActive maior/progresso)', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    h.api.tdWave('trilha', 3, 'invasor', 150, 90)
    for (let i = 1; i <= 40; i++) h.nextFrame(i * 50) // espalha os progressos
    const invs = vivos(h, 'invasor')
    const alvo = h.api.pickActive('invasor', 'maior', 'pathProgress')
    expect(alvo).not.toBeNull()
    // o alvo é o de MAIOR progresso na trilha (o líder) — a trilha vira, então
    // NÃO dá p/ comparar por x: comparo pelo MESMO medidor de progresso do motor.
    const maxProg = Math.max(...invs.map((e) => h.api.pathProgress(e)))
    expect(h.api.pathProgress(alvo)).toBeCloseTo(maxProg)
    expect(maxProg).toBeGreaterThan(0) // andaram mesmo
  })

  it('⭐ onda:limpa ao esvaziar; "Jogar de novo" devolve moedas e libera os lugares', async () => {
    const h = loadRuntime()
    await arenaTd(h)
    let limpa = 0
    h.api.on('onda:limpa', () => {
      limpa += 1
    })
    h.api.tdSetCoins(100)
    h.api.tdSlot(300, 220, 60)
    h.api.tdOnBuy(50, (lugarX: unknown, lugarY: unknown) => {
      h.api.spawnFromMold('torre', (lugarX as number) - 20, (lugarY as number) - 20)
    })
    h.api.tdWave('trilha', 2, 'invasor', 150, 90)
    h.nextFrame(50)
    expect(limpa).toBe(0)
    h.api.forEachActive('invasor', (e: unknown) => h.api.recycle(e))
    h.nextFrame(100) // o stepTd vê a onda vazia
    expect(limpa).toBe(1)
    clickAt(300, 220) // compra uma torre, gasta 50
    expect(h.api.tdCoins()).toBe(50)
    expect(h.api.countActive('torre')).toBe(1)
    // "Jogar de novo" passa por outro estado (o gate do reset é prev !== jogando)
    h.api.setState('fim')
    h.api.restartGame()
    expect(h.api.tdCoins()).toBe(100) // moedas voltam ao inicial
    expect(h.api.countActive('torre')).toBe(0) // o reset recolheu a torre antiga
    clickAt(300, 220) // o lugar liberou: comprar de novo cobra de novo
    expect(h.api.tdCoins()).toBe(50)
  })
})

describe('gk — playthrough mínimo: Batalha de Monstrinhos Profissional (rede pré-e2e)', () => {
  /** Roda o exemplo EXATO (IR embutida → generateJS → runtime real). */
  async function bootBatalha(h: Harness): Promise<void> {
    const code = generateJS({
      behavior: batalhaProfissionalExample.ir.behavior,
      lifecycle: 'game-2d-advanced',
    })
    new Function('window', 'SZGameKit', code)(h.window, h.api)
    await Promise.resolve()
    await Promise.resolve()
    h.api.restartGame()
  }

  it('⭐ o pátio leva à rival e a batalha de treinador é JOGADA até o fim', async () => {
    const h = loadRuntime()
    await bootBatalha(h)
    expect(h.api.state()).toBe('jogando')
    expect(h.api.pkmTeamSize()).toBe(3) // o time nasce montado (pkmGive x3)

    let tick = 0
    // Sobe primeiro (contorna o mato fundo) e depois vai para a direita até a
    // rival Alice, apertando ESPAÇO — o desafio é touching + keyPressed.
    h.fire('keydown', { key: 'ArrowUp' })
    for (let i = 0; i < 14; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowUp' })
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 70 && h.api.state() === 'jogando'; i++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
    }
    h.fire('keyup', { key: 'ArrowRight' })
    expect(h.api.state()).toBe('batalha')

    // Martela espaço: menus do kit (Lutar → 1º golpe) até a batalha ACABAR —
    // vitória OU derrota devolvem 'jogando'; travar em qualquer fase é softlock.
    for (let i = 1; i <= 900 && h.api.state() === 'batalha'; i++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame((tick + i) * 50)
    }
    expect(h.api.state()).toBe('jogando')
  })

  it('⭐ capturar o Faiscolosso no mato fundo vira a tela de vitória', async () => {
    const h = loadRuntime()
    await bootBatalha(h)

    let tick = 0
    // Anda para a direita até o meio do mato fundo (overlapPercent > 50).
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 48; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })
    expect(h.api.state()).toBe('jogando')

    // Sorte fixa BAIXA: o encontro dispara no próximo tique de 1 s e a bola
    // SEMPRE captura (chance(x) = random*100 < x). Igual ao teste da lutaAI.
    const realRandom = Math.random
    Math.random = () => 0.001
    try {
      for (let i = 0; i < 80 && h.api.state() === 'jogando'; i++) {
        h.nextFrame(++tick * 50)
      }
      expect(h.api.state()).toBe('batalha')
      // ↓ e ESPAÇO no MESMO quadro: o stepUiInput move o índice ANTES de
      // selecionar, então com o menu aberto isto escolhe SEMPRE "Bola" (índice
      // 1, nunca o "Lutar" do índice 0); com a fala aberta, o espaço só avança
      // o texto. Capturou → fim da batalha → 'jogando' → 'vitoria'.
      for (let i = 0; i < 400 && h.api.state() !== 'vitoria'; i++) {
        h.fire('keydown', { key: 'ArrowDown' })
        h.fire('keydown', { key: ' ' })
        h.nextFrame(++tick * 50)
      }
    } finally {
      Math.random = realRandom
    }
    expect(h.api.state()).toBe('vitoria')
    expect(h.api.pkmCaught()).toBe(true)
    expect(h.api.pkmTeamSize()).toBe(4) // o lendário ENTROU para o time
  })

  it('⭐ regressão: queimar as 5 bolas não tranca a vitória — a fonte repõe 3 e a captura sai', async () => {
    // O review provou o softlock com um playthrough temporário: a captura é a
    // ÚNICA vitória e, sem reposição, 5 bolas falhadas (lendário difícil =
    // ~11-32% por arremesso) tornavam vencer IMPOSSÍVEL para sempre. Este é o
    // mesmo roteiro INVERTIDO como regressão permanente.
    const h = loadRuntime()
    await bootBatalha(h)
    let tick = 0
    // Anda até o meio do mato fundo (overlapPercent > 50).
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 48; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })
    expect(h.api.pkmBallCount()).toBe(5)

    const realRandom = Math.random
    try {
      // Sorte BAIXA só para o encontro nascer no próximo tique do mato.
      Math.random = () => 0.001
      for (let i = 0; i < 80 && h.api.state() === 'jogando'; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('batalha')

      // Sorte 0,9: a bola SEMPRE falha (~10,8%), o Trovão de Fogo (90) SEMPRE
      // erra e a Brasa (95) SEMPRE acerta. ↓+ESPAÇO escolhe "Bola" (índice 1)
      // até a mochila ZERAR.
      Math.random = () => 0.9
      for (let i = 0; i < 600 && h.api.pkmBallCount() > 0; i++) {
        h.fire('keydown', { key: 'ArrowDown' })
        h.fire('keydown', { key: ' ' })
        h.nextFrame(++tick * 50)
      }
      expect(h.api.pkmBallCount()).toBe(0)

      // Sem bola no menu, ESPAÇO puro = Lutar → Brasa até a batalha ACABAR
      // (vitória por nocaute; o pátio volta com a mochila ainda vazia).
      for (let i = 0; i < 900 && h.api.state() === 'batalha'; i++) {
        h.fire('keydown', { key: ' ' })
        h.nextFrame(++tick * 50)
      }
      // Solta as teclas marteladas na batalha, senão o pátio anda sozinho.
      h.fire('keyup', { key: ' ' })
      h.fire('keyup', { key: 'ArrowDown' })
      expect(h.api.state()).toBe('jogando')
      expect(h.api.pkmBallCount()).toBe(0)

      // Pré-fix, este era o fim da linha. Agora a fonte cura E repõe 3 bolas.
      // Do mato (x≈716, y≈420) até a fonte (região 50..180 × 40..150).
      h.fire('keydown', { key: 'ArrowLeft' })
      for (let i = 0; i < 53; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowLeft' })
      h.fire('keydown', { key: 'ArrowUp' })
      for (let i = 0; i < 32; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowUp' })
      for (let i = 0; i < 40; i++) h.nextFrame(++tick * 50) // tique de 1,5s da cura
      expect(h.api.pkmBallCount()).toBe(3)

      // Volta ao mato fundo e captura com sorte baixa: a vitória VOLTOU.
      Math.random = () => 0.001
      h.fire('keydown', { key: 'ArrowRight' })
      for (let i = 0; i < 55; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowRight' })
      h.fire('keydown', { key: 'ArrowDown' })
      for (let i = 0; i < 35; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowDown' })
      for (let i = 0; i < 80 && h.api.state() === 'jogando'; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('batalha')
      for (let i = 0; i < 400 && h.api.state() !== 'vitoria'; i++) {
        h.fire('keydown', { key: 'ArrowDown' })
        h.fire('keydown', { key: ' ' })
        h.nextFrame(++tick * 50)
      }
    } finally {
      Math.random = realRandom
    }
    expect(h.api.state()).toBe('vitoria')
    expect(h.api.pkmCaught()).toBe(true)
  })

  it('⭐ regressão: time desmaiado não vira spam de fala no mato; a fonte reabre o encontro', async () => {
    const h = loadRuntime()
    await bootBatalha(h)
    let tick = 0
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 48; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })

    const realRandom = Math.random
    try {
      Math.random = () => 0.001
      for (let i = 0; i < 80 && h.api.state() === 'jogando'; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('batalha')

      // Sorte 0,5: ↓+ESPAÇO nunca ataca (Bola falha → Trocar troca → Fugir
      // falha em 50) enquanto o Trovão de Fogo SEMPRE acerta: o time inteiro
      // desmaia e a batalha termina em derrota.
      Math.random = () => 0.5
      for (let i = 0; i < 1500 && h.api.state() === 'batalha'; i++) {
        h.fire('keydown', { key: 'ArrowDown' })
        h.fire('keydown', { key: ' ' })
        h.nextFrame(++tick * 50)
      }
      // Solta as teclas marteladas na batalha, senão o pátio anda sozinho.
      h.fire('keyup', { key: ' ' })
      h.fire('keyup', { key: 'ArrowDown' })
      expect(h.api.state()).toBe('jogando')

      // Parado no MESMO mato com sorte que sortearia encontro todo tique:
      // nada de batalha e nada do aviso repetido (o gate timeCaido segura).
      Math.random = () => 0.001
      texts = []
      for (let i = 0; i < 100; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('jogando')
      expect(texts.some((t) => t.text.includes('monstrinho em pé'))).toBe(false)

      // A fonte cura o time (e zera o gate); o mato volta a sortear encontro.
      h.fire('keydown', { key: 'ArrowLeft' })
      for (let i = 0; i < 53; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowLeft' })
      h.fire('keydown', { key: 'ArrowUp' })
      for (let i = 0; i < 32; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowUp' })
      for (let i = 0; i < 40; i++) h.nextFrame(++tick * 50)
      h.fire('keydown', { key: 'ArrowRight' })
      for (let i = 0; i < 55; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowRight' })
      h.fire('keydown', { key: 'ArrowDown' })
      for (let i = 0; i < 35; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowDown' })
      for (let i = 0; i < 80 && h.api.state() === 'jogando'; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('batalha')
    } finally {
      Math.random = realRandom
    }
  })
})

describe('gk — playthrough mínimo: Aventura do Herói Profissional (rede pré-e2e)', () => {
  interface Bicho {
    x: number
    y: number
  }

  async function bootAventura(h: Harness): Promise<void> {
    const code = generateJS({
      behavior: aventuraProfissionalExample.ir.behavior,
      lifecycle: 'game-2d-advanced',
    })
    new Function('window', 'SZGameKit', code)(h.window, h.api)
    await Promise.resolve()
    await Promise.resolve()
    h.api.restartGame()
  }

  function vivos(h: Harness, mold: string): Bicho[] {
    const out: Bicho[] = []
    h.api.forEachActive(mold, (e: unknown) => out.push(e as Bicho))
    return out
  }

  it('o campo nasce vivo: enxames, árvores, HUD de contagem e mato no mapa', async () => {
    const h = loadRuntime()
    await bootAventura(h)
    expect(h.api.state()).toBe('jogando')
    expect(h.api.countActive('javali')).toBe(4)
    expect(h.api.countActive('lobo')).toBe(3)
    expect(h.api.countActive('arvore')).toBe(6)
    expect(h.api.tileAt('campo', 928, 736)).toBe(1) // a fileira de mato existe
    texts = []
    h.nextFrame(50)
    expect(texts.some((item) => item.text === 'Javalis: 4')).toBe(true)
    expect(texts.some((item) => item.text === 'Lobos: 3')).toBe(true)

    // Parado longe, ninguém atravessa o mapa: os javalis PATRULHAM o posto.
    for (let i = 2; i <= 30; i++) h.nextFrame(i * 50)
    for (const javali of vivos(h, 'javali')) expect(javali.x).toBeGreaterThan(1000)
  })

  it('⭐ cortar o mato REMOVE a peça do mapa (breakTileAt de verdade)', async () => {
    const h = loadRuntime()
    await bootAventura(h)
    let tick = 0
    // Diagonal até a altura da fileira e depois reto até o primeiro tufo.
    h.fire('keydown', { key: 'ArrowRight' })
    h.fire('keydown', { key: 'ArrowDown' })
    for (let i = 0; i < 25; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowDown' })
    for (let i = 0; i < 40; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })
    expect(h.api.tileAt('campo', 943, 729)).toBe(1) // pisou no mato, peça viva
    h.fire('keydown', { key: ' ' }) // golpe de espada em cima do tufo
    h.nextFrame(++tick * 50)
    expect(h.api.tileAt('campo', 943, 729)).toBe(-1) // cortou: sumiu do MAPA
  })

  it('⭐ FSM por distância: chegar perto acorda o bando e o golpe deles derruba o herói', async () => {
    const h = loadRuntime()
    await bootAventura(h)
    let tick = 0
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 90; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })
    expect(h.api.state()).toBe('jogando')
    // Parado no meio do bando: perseguir → golpe → toque com i-frames tira 12
    // por vez (o dano vem do MOLDE via propertyOf) até o fim de jogo.
    for (let i = 0; i < 600 && h.api.state() === 'jogando'; i++) {
      h.nextFrame(++tick * 50)
    }
    expect(h.api.state()).toBe('fim')
  })

  it('⭐ a espada com janela derrota javali de verdade (didHit + recycle)', async () => {
    const h = loadRuntime()
    await bootAventura(h)
    let caiu = 0
    h.api.on('inimigo:caiu', () => {
      caiu += 1
    })
    let tick = 0
    h.fire('keydown', { key: 'ArrowRight' })
    for (let i = 0; i < 90; i++) h.nextFrame(++tick * 50)
    h.fire('keyup', { key: 'ArrowRight' })
    // Martela o golpe virado para o bando que chega pela direita.
    for (let i = 0; i < 400 && caiu === 0 && h.api.state() === 'jogando'; i++) {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
      h.fire('keyup', { key: ' ' })
    }
    expect(caiu).toBeGreaterThan(0)
    // Quem chega primeiro na espada depende da patrulha (javali OU lobo): o
    // que importa é que o bando ENCOLHEU de verdade (didHit → hurt → recycle).
    expect(h.api.countActive('javali') + h.api.countActive('lobo')).toBeLessThan(7)
  })

  it('a missão de derrotar todos liga a tela de vitória pronta', async () => {
    const h = loadRuntime()
    await bootAventura(h)
    // setMission(0, 7): a contagem de derrotados é quem decide (rede do motor —
    // os playthroughs acima provam que missionKill roda no didHit real).
    for (let i = 0; i < 7; i++) h.api.missionKill()
    h.nextFrame(50)
    expect(h.api.state()).toBe('vitoria')
  })
})

describe('gk — playthrough mínimo: Chuva de Meteoros Profissional (rede pré-e2e)', () => {
  interface Corpo {
    x: number
    y: number
    vx?: number
    vy?: number
    _angle?: number
  }

  /** Roda o exemplo EXATO (IR embutida → generateJS → runtime real). */
  async function bootChuva(h: Harness): Promise<void> {
    const code = generateJS({
      behavior: chuvaProfissionalExample.ir.behavior,
      lifecycle: 'game-2d-advanced',
    })
    new Function('window', 'SZGameKit', code)(h.window, h.api)
    await Promise.resolve()
    await Promise.resolve()
    h.api.restartGame()
  }

  function vivos(h: Harness, mold: string): Corpo[] {
    const out: Corpo[] = []
    h.api.forEachActive(mold, (e: unknown) => out.push(e as Corpo))
    return out
  }

  /** O placar que a criança VÊ ("Pontos: N" do onDrawHud), ou -1. */
  function pontosNoHud(): number {
    const linha = texts.find((t) => t.text.startsWith('Pontos: '))
    return linha ? Number(linha.text.slice('Pontos: '.length)) : -1
  }

  it('⭐ espaço atira 1 laser por recarga e a nave voa nas 4 direções', async () => {
    const h = loadRuntime()
    await bootChuva(h)
    expect(h.api.state()).toBe('jogando')
    // Sorte fixa BAIXA: a chuva de fundo nasce colada na borda ESQUERDA e
    // deriva para fora — nunca alcança a nave (o roteiro fica determinístico).
    const realRandom = Math.random
    Math.random = () => 0.05
    let tick = 0
    try {
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
      expect(h.api.countActive('laser')).toBe(1)
      const [primeiro] = vivos(h, 'laser')
      expect(primeiro).toBeDefined()
      if (!primeiro) return
      const spawnX = primeiro.x
      const spawnY = primeiro.y
      // Martelar espaço no quadro seguinte NÃO cria outro (recarga de 0,25s)...
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
      expect(h.api.countActive('laser')).toBe(1)
      // ...e o laser SOBE (vy negativo, como o Laser original).
      expect(primeiro.y).toBeLessThan(spawnY)

      // 4 direções: voa para a ESQUERDA e para CIMA; o próximo laser nasce
      // deslocado nos DOIS eixos (o tiro sai da nave, que se moveu na diagonal).
      h.fire('keydown', { key: 'ArrowLeft' })
      h.fire('keydown', { key: 'ArrowUp' })
      for (let i = 0; i < 10; i++) h.nextFrame(++tick * 50)
      h.fire('keyup', { key: 'ArrowLeft' })
      h.fire('keyup', { key: 'ArrowUp' })
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
      // O forEachActive itera em ordem REVERSA: acha o laser NOVO pelo x (o
      // laser voa reto, então só o tiro da nave deslocada tem outro x).
      expect(h.api.countActive('laser')).toBe(2)
      const segundo = vivos(h, 'laser').find((laser) => laser.x !== spawnX)
      expect(segundo).toBeDefined()
      if (!segundo) return
      expect(segundo.x).toBeLessThan(spawnX - 60)
      expect(segundo.y).toBeLessThan(spawnY - 60)
    } finally {
      Math.random = realRandom
    }
  })

  it('⭐ a chuva nasce sozinha, cai GIRANDO e o laser destrói com bônus de pontos', async () => {
    const h = loadRuntime()
    await bootChuva(h)
    const realRandom = Math.random
    Math.random = () => 0.05
    let tick = 0
    try {
      // Cadência inicial de 0,9s: em ~1,5s o primeiro meteoro nasce no topo.
      for (let i = 0; i < 30 && h.api.countActive('meteoro') === 0; i++) {
        h.nextFrame(++tick * 50)
      }
      expect(h.api.countActive('meteoro')).toBe(1)
      const [pedra] = vivos(h, 'meteoro')
      expect(pedra).toBeDefined()
      if (!pedra) return
      const y0 = pedra.y
      const angulo0 = pedra._angle ?? 0
      h.nextFrame(++tick * 50)
      expect(pedra.y).toBeGreaterThan(y0) // cai do topo
      expect(pedra._angle ?? 0).toBeGreaterThan(angulo0) // gira (setAngle+angleOf)

      // Atira e TELEPORTA o meteoro para cima do laser parado: overlap →
      // explosão por efeito + recycle dos DOIS + bônus de 2 pontos no HUD.
      h.fire('keydown', { key: ' ' })
      h.nextFrame(++tick * 50)
      const tiro = vivos(h, 'laser').at(-1)
      expect(tiro).toBeDefined()
      if (!tiro) return
      texts = []
      h.nextFrame(++tick * 50)
      const antes = pontosNoHud()
      expect(antes).toBeGreaterThanOrEqual(0)
      tiro.vx = 0
      tiro.vy = 0
      pedra.vx = 0
      pedra.vy = 0
      pedra.x = tiro.x
      pedra.y = tiro.y
      texts = []
      h.nextFrame(++tick * 50)
      expect(h.api.countActive('meteoro')).toBe(0)
      expect(h.api.countActive('laser')).toBe(0)
      expect(pontosNoHud()).toBeGreaterThanOrEqual(antes + 2)
    } finally {
      Math.random = realRandom
    }
  })

  it('⭐ meteoro na nave encerra o jogo, guarda o RECORDE e o reinício zera a partida', async () => {
    const h = loadRuntime()
    await bootChuva(h)
    const realRandom = Math.random
    Math.random = () => 0.05
    let tick = 0
    try {
      // ~3,5s de sobrevivência: o placar por tempo já vale pontos.
      for (let i = 0; i < 70; i++) h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('jogando')
      for (let i = 0; i < 30 && h.api.countActive('meteoro') === 0; i++) {
        h.nextFrame(++tick * 50)
      }
      const [pedra] = vivos(h, 'meteoro')
      expect(pedra).toBeDefined()
      if (!pedra) return
      // Teleporta o meteoro para cima da nave (452, 420): fim na hora.
      pedra.x = 452
      pedra.y = 410
      pedra.vx = 0
      pedra.vy = 0
      h.nextFrame(++tick * 50)
      expect(h.api.state()).toBe('fim')
      // O recorde foi GUARDADO de verdade (saveValue → localStorage).
      const bruto = h.storage.get('szgk-val-recorde')
      expect(bruto).toBeDefined()
      expect(JSON.parse(bruto ?? '0')).toBeGreaterThanOrEqual(3)

      // Reinício limpo: pools zerados, placar 0 e o recorde persiste no HUD.
      h.api.restartGame()
      expect(h.api.state()).toBe('jogando')
      expect(h.api.countActive('meteoro')).toBe(0)
      expect(h.api.countActive('laser')).toBe(0)
      texts = []
      h.nextFrame(++tick * 50)
      expect(pontosNoHud()).toBe(0)
      const recordeNoHud = texts.find((t) => t.text.startsWith('Recorde: '))
      expect(recordeNoHud).toBeDefined()
      expect(Number(recordeNoHud?.text.slice('Recorde: '.length))).toBeGreaterThanOrEqual(3)
    } finally {
      Math.random = realRandom
    }
  })
})
