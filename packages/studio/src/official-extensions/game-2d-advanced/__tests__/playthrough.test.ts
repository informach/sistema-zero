import { afterAll, describe, expect, it } from 'bun:test'
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
  arc() {},
  closePath() {},
  ellipse() {},
  fillText() {},
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
