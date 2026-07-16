import { afterAll, afterEach, describe, expect, it } from 'bun:test'
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
  state: () => string
  setState: Fn
  onDraw: Fn
  pkmCreature: Fn
  pkmMove: Fn
  pkmTypeChart: Fn
  pkmGive: Fn
  pkmBattleWild: Fn
  pkmTeamSize: () => number
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
  rpgOnMap: Fn
  rpgGoMap: Fn
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
  rpgCreateDoor: Fn
  rpgCell: (n: number) => number
  rpgBattleStats: Fn
  rpgBattleStart: Fn
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
  fire: (name: string, ev?: unknown) => void
  nextFrame: (ts: number) => void
}

function loadRuntime(): Harness {
  const listeners: Record<string, Listener[]> = {}
  const rafQueue: Array<(ts: number) => void> = []
  const clock = { value: 0 }
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => clock.value },
    innerWidth: 1200,
    innerHeight: 700,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
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
    fire: (name, ev = {}) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
    nextFrame: (ts) => {
      clock.value = ts
      const cb = rafQueue.shift()
      if (!cb) throw new Error('nenhum quadro agendado')
      cb(ts)
    },
  }
}

async function startGame(h: Harness): Promise<void> {
  h.api.start()
  await Promise.resolve()
  await Promise.resolve()
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
  h.api.setState('jogando')
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
    h.api.setState('jogando')
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
    h.api.setState('jogando')

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
    h.api.rpgOnMap('quintal', () => {
      h.api.pkmGrassCells(0, 0, 8, 8)
      h.api.pkmWild('Folhinha', 3, 6)
    })
    // …e a caverna NÃO tem grama nem bicho nenhum.
    h.api.rpgOnMap('caverna', () => {})
    h.api.pkmEncounterRate(100) // encontro garantido: o teste fica determinístico
    h.api.onUpdate((dt: number) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.setState('jogando')
    // ⚠️ DEPOIS do setState (que zera o time) e obrigatório: sem monstrinho em pé o
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
    h.api.setState('jogando')
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
    quadros(h, 400)
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
    h.api.setState('jogando') // recomeço de verdade
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
    h.api.rpgOnMap('vila', () => {
      h.api.placeCharacter(heroi, h.api.rpgCell(1), h.api.rpgCell(2))
      h.api.rpgCreateNpc('guarda', 3, 2, '', '')
    })
    h.api.rpgOnMap('salao', () => {
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
    h.api.setState('jogando') // rpgNewGame vai ao 1º mapa (vila) e posiciona
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
  function botaoAtacar(): HTMLButtonElement {
    const scr = document.querySelector('[data-szgk-screen="batalha"]')
    return scr?.querySelector('button') as HTMLButtonElement
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
    // JOGA a batalha: clica Atacar (força 50 mata o chefe de 10 HP no 1º golpe).
    botaoAtacar().click()
    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgBattleWon()).toBe(true)
    // A recompensa (25 XP, teto 20) subiu o nível: playerXp 25→5, nível 1→2.
    expect(h.api.rpgLevel()).toBe(2)
    expect(h.api.rpgXp()).toBe(5)
    void heroi
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
    h.api.setState('jogando')
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
    h.api.setState('jogando')
    expect(h.api.tdCoins()).toBe(100) // moedas voltam ao inicial
    expect(h.api.countActive('torre')).toBe(0) // o reset recolheu a torre antiga
    clickAt(300, 220) // o lugar liberou: comprar de novo cobra de novo
    expect(h.api.tdCoins()).toBe(50)
  })
})
