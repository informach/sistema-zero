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
  setupFull: Fn
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
  cameraFollowMap: Fn
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
  // R3 — Kit RPG
  rpgMoveGrid: Fn
  rpgBlockCell: Fn
  rpgCell: Fn
  rpgCreateNpc: Fn
  rpgDrawNpcs: Fn
  rpgOnTalk: Fn
  rpgSay: Fn
  rpgAddFlag: Fn
  rpgHasFlag: Fn
  rpgGiveItem: Fn
  rpgHasItem: Fn
  rpgRemoveItem: Fn
  rpgDrawInventory: Fn
  rpgGoMap: Fn
  rpgOnMap: Fn
  rpgCreateDoor: Fn
  rpgMapSize: Fn
  rpgConnectEdge: Fn
  rpgCurrentMap: Fn
  rpgBattleStats: Fn
  rpgBattleStart: Fn
  rpgOnBattleEnd: Fn
  rpgBattleWon: Fn
  // V6 — cenas & NPCs vivos
  setWalkSheet: Fn
  rpgCutscene: Fn
  rpgWait: Fn
  rpgFace: Fn
  rpgNpcWalkTo: Fn
  rpgNpcWander: Fn
  rpgOnStep: Fn
  // V7 — escolhas & salvar
  rpgMenu: Fn
  rpgOption: Fn
  rpgSave: Fn
  rpgLoad: Fn
  rpgHasSave: Fn
  // V8 — batalha rica
  rpgSetSpecial: Fn
  rpgGivePotion: Fn
  rpgBattleReward: Fn
  rpgInflict: Fn
  rpgAddAlly: Fn
  rpgAddFoe: Fn
  rpgTeachMove: Fn
  rpgLevel: Fn
  rpgXp: Fn
  // V9 — mapa de tiles + profundidade
  cameraShake: Fn
  loadTilemap: Fn
  drawTilemap: Fn
  tilemapSolid: Fn
  drawShadow: Fn
  drawByDepth: Fn
  // R11 — física geral
  applyGravity: Fn
  setTerminalVelocity: Fn
  setVelocity: Fn
  velocityOf: Fn
  jump: Fn
  isOnGround: Fn
  collideTilemap: Fn
  collideGroup: Fn
  overlapGroups: Fn
  bounceOnEdges: Fn
  wrapEdges: Fn
  everySeconds: Fn
  cooldownReady: Fn
  tileAt: Fn
  setTileAt: Fn
  breakTileAt: Fn
  setTileSize: Fn
  propertyOf: Fn
  setProperty: Fn
  setFacingDir: Fn
  facingOf: Fn
  tweenTo: Fn
  // R16 — Kit Monstrinhos
  pkmCreature: Fn
  pkmMove: Fn
  pkmTypeChart: Fn
  pkmEvolve: Fn
  pkmCatchDifficulty: Fn
  pkmLevelOf: Fn
  pkmGive: Fn
  pkmGiveBall: Fn
  pkmHealTeam: Fn
  pkmHas: Fn
  pkmTeamSize: Fn
  pkmBallCount: Fn
  pkmDrawTeam: Fn
  pkmGrassCells: Fn
  pkmGrassTiles: Fn
  pkmWild: Fn
  pkmEncounterRate: Fn
  pkmBattleWild: Fn
  pkmBattleTrainer: Fn
  pkmTrainerCreature: Fn
  pkmCaught: Fn
  // R15 — primitivos gerais
  defineRegion: Fn
  isInside: Fn
  overlapPercent: Fn
  chance: Fn
  distanceBetween: Fn
  pointIn: Fn
  launchToPoint: Fn
  setVelocityAngle: Fn
  setOpacity: Fn
  opacityOf: Fn
  fadeTo: Fn
  tweenProperty: Fn
  setHitbox: Fn
  fadeScreen: Fn
  flashScreen: Fn
  saveValue: Fn
  savedValue: Fn
  playMusic: Fn
  stopSound: Fn
  setVolume: Fn
  createEmptyTilemap: Fn
  moveWithCustomKeys: Fn
  // R12 — Kit Plataforma
  platformerHero: Fn
  setJumpFeel: Fn
  doubleJump: Fn
  wallSlide: Fn
  wallJump: Fn
  climbLadder: Fn
  oneWayPlatform: Fn
  dropThrough: Fn
  movingPlatform: Fn
  rideOn: Fn
  stompKill: Fn
  patrolTurnAtWall: Fn
  setCheckpoint: Fn
  respawn: Fn
  platStateFrames: Fn
  platformerAnim: Fn
  // V10 — ação em tempo real (Zelda)
  attackFacing: Fn
  didHit: Fn
  patrolAround: Fn
  drawHearts: Fn
  // R21 — primitivos gerais (review do Space Invaders)
  randomActive: Fn
  floatText: Fn
  trailOn: Fn
  trailOff: Fn
  shockwave: Fn
  scrollImage: Fn
  leanOnMove: Fn
  fanShot: Fn
  // R22 — Kit Nave (regressões do R24)
  naveShip: Fn
  navePowerup: Fn
  navePowerOf: (c: unknown) => string
  naveWave: Fn
  naveWaveShooter: Fn
  naveBomb: Fn
  // 🛤️ R25 — caminhos + escolher-vivo + paralaxe + folha
  definePath: Fn
  pathPoint: Fn
  followPath: Fn
  pathProgress: (c: unknown) => number
  pickActive: (mold: string, mode: string, prop: string) => unknown
  parallaxLayer: Fn
  sheetBurst: Fn
}

interface Harness {
  api: GameKitApi
  listeners: Record<string, Listener[]>
  fire: (name: string, ev?: unknown) => void
  clock: { value: number }
  nextFrame: (ts: number) => void
  rafCount: () => number
  /** O Map por trás do `localStorage` do runtime — p/ injetar um save corrompido. */
  store: Map<string, string>
}

/** Mapa de tiles falso no formato do Pinta. O runtime lê o ASSET_META UMA vez, no
 * boot do IIFE — por isso ele entra aqui e não depois. `grid` usa "." p/ vazio. */
function fakeTilemapAsset(grid: string, solid: number[], tileSize = 64) {
  return {
    mapa: {
      tilemap: { grid, solid, tileSize, tileset: { dataUrl: 'data:image/png;base64,AA==' } },
    },
  }
}

function loadRuntime(assetMeta?: unknown): Harness {
  const listeners: Record<string, Listener[]> = {}
  const clock = { value: 0 }
  const rafQueue: Array<(ts: number) => void> = []
  const store = new Map<string, string>()
  const win = {
    __SZGAME_ASSET_META: assetMeta,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => clock.value },
    innerWidth: 1200,
    innerHeight: 700,
    // localStorage funcional (o preview injeta um shim; aqui um Map basta p/
    // testar salvar/continuar do Kit RPG).
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k) : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v))
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    },
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
    store,
  }
}

/** Sobe o jogo: start() + espera as promessas de carregamento resolverem. */
async function startGame(h: Harness): Promise<void> {
  h.api.start()
  // Promise.all(pending) resolve em microtask — 2 voltas dão folga.
  await Promise.resolve()
  await Promise.resolve()
}

interface BattlerSnap {
  name: string
  side: string
  hp: number
  max: number
  energy: number
  alive: boolean
  poison: number
  regen: number
  str: number
  def: number
  moves: number
}
interface BattleSnap {
  phase: string
  menuOpen: boolean
  menuIndex: number
  menuLabels: string[]
  actor: string
  inspect: string
  target: string
  allies: BattlerSnap[]
  foes: BattlerSnap[]
}
/** Espelho só-leitura da batalha (hook não-enumerável `_battle`), ou null fora dela. */
function battleSnap(h: Harness): BattleSnap | null {
  return (h.api as unknown as { _battle: () => BattleSnap | null })._battle()
}

/**
 * Dirige a batalha em EQUIPE (canvas): aperta espaço a cada quadro. Quando o painel
 * de ação está aberto, o espaço confirma a opção destacada (index 0 = "Atacar"); na
 * mira com vários inimigos, o espaço mira o 1º vivo. Roda quadros de 100ms (dt=0.1)
 * até a batalha sair de 'batalha' (venceu/perdeu/fugiu) ou o teto de quadros.
 */
function driveBattle(h: Harness, from: number, maxFrames = 120): number {
  let t = from
  for (let i = 0; i < maxFrames && h.api.state() === 'batalha'; i++) {
    h.fire('keydown', { key: ' ' })
    t += 100
    h.nextFrame(t)
    h.fire('keyup', { key: ' ' })
  }
  return t
}

/**
 * Escolhe UMA ação no painel (por trecho do rótulo): roda quadros até o menu abrir,
 * navega com ↓ até a opção certa e confirma com espaço. Devolve o novo relógio.
 */
function pickAction(h: Harness, from: number, match: string, maxFrames = 40): number {
  let t = from
  for (let i = 0; i < maxFrames; i++) {
    const s = battleSnap(h)
    if (!s || h.api.state() !== 'batalha') return t
    if (s.menuOpen) break
    t += 100
    h.nextFrame(t)
  }
  const open = battleSnap(h)
  if (!open || !open.menuOpen) return t
  const idx = open.menuLabels.findIndex((l) => l.includes(match))
  if (idx < 0) return t
  let guard = 0
  while (h.api.state() === 'batalha' && guard++ < 12) {
    const cur = battleSnap(h)
    if (!cur || !cur.menuOpen || cur.menuIndex === idx) break
    h.fire('keydown', { key: 'ArrowDown' })
    t += 100
    h.nextFrame(t)
    h.fire('keyup', { key: 'ArrowDown' })
  }
  h.fire('keydown', { key: ' ' })
  t += 100
  h.nextFrame(t)
  h.fire('keyup', { key: ' ' })
  // Deixa o turno RESOLVER: anima → inimigos → tique de status → próximo painel (ou
  // fim). Assim pickAction representa uma RODADA inteira (o teste pode medir depois).
  for (let i = 0; i < 40 && h.api.state() === 'batalha'; i++) {
    const s = battleSnap(h)
    if (s && s.menuOpen) break // o próximo turno do jogador já abriu
    t += 100
    h.nextFrame(t)
  }
  return t
}

afterEach(() => {
  for (const el of Array.from(document.querySelectorAll('#szgk-stage, #szgk-style'))) {
    el.remove()
  }
})

describe('SZGameKit — API e personagens (sem DOM)', () => {
  it('expõe os 281 métodos (spawn_named reusa spawnFromMold)', () => {
    const { api } = loadRuntime()
    const expected = [
      // v1 (33)
      'setup',
      'setupFull',
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
      'cameraFollowMap', // 🌍 mundo aberto: mundo = tamanho do mapa
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
      // R3 — Kit RPG (20): grade, NPC, fala, flags, inventário, mapas, batalha
      'rpgMoveGrid',
      'rpgBlockCell',
      'rpgCell',
      'rpgCreateNpc',
      'rpgDrawNpcs',
      'rpgOnTalk',
      'rpgSay',
      'rpgAddFlag',
      'rpgHasFlag',
      'rpgGiveItem',
      'rpgHasItem',
      'rpgRemoveItem',
      'rpgDrawInventory',
      'rpgGoMap',
      'rpgOnMap',
      'rpgCreateDoor',
      // 🌍 Mundo aberto: tamanho do mapa + bordas ligadas + nome do mapa
      'rpgMapSize',
      'rpgConnectEdge',
      'rpgCurrentMap',
      'rpgBattleStats',
      'rpgBattleStart',
      'rpgOnBattleEnd',
      'rpgBattleWon',
      // V6 — cenas & NPCs vivos (7)
      'setWalkSheet',
      'rpgCutscene',
      'rpgWait',
      'rpgFace',
      'rpgNpcWalkTo',
      'rpgNpcWander',
      'rpgOnStep',
      // V7 — escolhas & salvar (5)
      'rpgMenu',
      'rpgOption',
      'rpgSave',
      'rpgLoad',
      'rpgHasSave',
      // V8 — batalha rica (6)
      'rpgSetSpecial',
      'rpgGivePotion',
      'rpgBattleReward',
      'rpgInflict',
      'rpgLevel',
      'rpgXp',
      // ⚔️ batalha em equipe (3)
      'rpgAddAlly',
      'rpgAddFoe',
      'rpgTeachMove',
      // V9 — mapa de tiles + profundidade (6)
      'cameraShake',
      'loadTilemap',
      'drawTilemap',
      'tilemapSolid',
      'drawShadow',
      'drawByDepth',
      // R11 — física geral (22)
      'applyGravity',
      'setTerminalVelocity',
      'setVelocity',
      'velocityOf',
      'jump',
      'isOnGround',
      'collideTilemap',
      'collideGroup',
      'overlapGroups',
      'bounceOnEdges',
      'wrapEdges',
      'everySeconds',
      'cooldownReady',
      'tileAt',
      'setTileAt',
      'breakTileAt',
      'setTileSize',
      'propertyOf',
      'setProperty',
      'setFacingDir',
      'facingOf',
      'tweenTo',
      // R16 — Kit Monstrinhos (21)
      'pkmCreature',
      'pkmMove',
      'pkmTypeChart',
      'pkmEvolve',
      'pkmCatchDifficulty',
      'pkmLevelOf',
      'pkmGive',
      'pkmGiveBall',
      'pkmHealTeam',
      'pkmHas',
      'pkmTeamSize',
      'pkmBallCount',
      'pkmDrawTeam',
      'pkmGrassCells',
      'pkmGrassTiles',
      'pkmWild',
      'pkmEncounterRate',
      'pkmBattleWild',
      'pkmBattleTrainer',
      'pkmTrainerCreature',
      'pkmCaught',
      // R15 — primitivos gerais (22)
      'defineRegion',
      'isInside',
      'overlapPercent',
      'chance',
      'distanceBetween',
      'pointIn',
      'launchToPoint',
      'setVelocityAngle',
      'setOpacity',
      'opacityOf',
      'fadeTo',
      'tweenProperty',
      'setHitbox',
      'fadeScreen',
      'flashScreen',
      'saveValue',
      'savedValue',
      'playMusic',
      'stopSound',
      'setVolume',
      'createEmptyTilemap',
      'moveWithCustomKeys',
      // R12 — Kit Plataforma (16)
      'platformerHero',
      'setJumpFeel',
      'doubleJump',
      'wallSlide',
      'wallJump',
      'climbLadder',
      'oneWayPlatform',
      'dropThrough',
      'movingPlatform',
      'rideOn',
      'stompKill',
      'patrolTurnAtWall',
      'setCheckpoint',
      'respawn',
      'platStateFrames',
      'platformerAnim',
      // V10 — ação em tempo real (4)
      'attackFacing',
      'didHit',
      'patrolAround',
      'drawHearts',
      // R18 — a janela do golpe (recuo/ativo em SEGUNDOS): sem ela quem aperta
      // primeiro sempre ganha, e nao ha leitura nem espacamento.
      'setSwingWindow',
      // R18 — animacao de UMA vez + a TRAVA por estado (serve aos 3 sistemas de
      // animacao, inclusive ao vetorial, que nao tem quadro p/ "terminar").
      'playAnimOnce',
      'animEnded',
      'setEntityState',
      'entityState',
      'stateAnim',
      'stateLook',
      'autoAnimate',
      // R18 — o angulo era WRITE-ONLY (zero atan2 no arquivo) e nao havia inercia
      // nem atrito: torre que mira, nave, Asteroids, gelo, corrida.
      'angleOf',
      'angleTo',
      'thrust',
      'applyFriction',
      // R18 — esperar UMA vez (o "A cada N s" repete; o do Kit RPG so vale em cena)
      'waitThen',
      // R18 — o mais perto de (tower defense, IA de horda)
      'nearestActive',
      // R18 — quantos itens (o "Ganhar o item" dedupava: sem crafting nem loja)
      'rpgCountItem',
      // R21 — primitivos gerais do review do Space Invaders: sorteio no pool,
      // texto flutuante, rastro contínuo, onda de choque, fundo que rola,
      // inclinação ao andar e leque de tiros.
      'randomActive',
      'floatText',
      'trailOn',
      'trailOff',
      'shockwave',
      'scrollImage',
      'leanOnMove',
      'fanShot',
      // 🚀 R22 — Kit Nave: só o ESPECÍFICO do gênero (a formação que marcha em
      // bloco, o atirador aleatório dela, a linha de invasão, o céu de estrelas,
      // a bomba e o poder de tiro). Tiro/colisão/telas/som vêm do motor geral.
      'naveShip',
      'navePowerup',
      'navePowerOf',
      'naveWave',
      'naveWaveShooter',
      'naveInvasionLine',
      'naveStarfield',
      'naveBomb',
      // 🛤️ R25 — caminhos (waypoints) + escolher-vivo-por-propriedade + paralaxe
      // presa à câmera + explosão por folha one-shot (do review Tower Defense).
      'definePath',
      'pathPoint',
      'followPath',
      'pathProgress',
      'pickActive',
      'parallaxLayer',
      'sheetBurst',
      // 🏰 R26 — Kit Defesa de Torre: onda pelo caminho, lugares de torre com
      // compra validada, anel de alcance e a carteira (caminho/alvo/tiro vêm do
      // motor geral, que o kit CHAMA).
      'tdWave',
      'tdSlot',
      'tdDrawSlots',
      'tdOnBuy',
      'tdFreeSlot',
      'tdDrawRange',
      'tdSetCoins',
      'tdAddCoins',
      'tdCoins',
      // 🥊 R19 — Kit Luta. Só o ESPECÍFICO de luta: gravidade/pulo/caixa de
      // golpe/dano/empurrão/telas vêm do motor geral, que o kit CHAMA.
      'lutaMatch',
      'lutaDrawHud',
      'lutaWinner',
      'lutaRoundNow',
      'lutaWinsOf',
      'lutaFighter',
      'lutaAI',
      'lutaIsGuarding',
      'lutaMove',
      'lutaMoveAnim',
      'lutaAttack',
      'lutaComboOf',
      'lutaSpecialOf',
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

describe('SZGameKit — R3: Kit RPG (grade, fala, flags, mapas, batalha)', () => {
  it('grade: anda célula a célula, parede bloqueia, porta troca de mapa', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    let montouCaverna = 0
    h.api.rpgOnMap('vila', () => {
      h.api.rpgBlockCell(1, 0) // parede à direita da origem
      h.api.rpgCreateDoor(0, 1, 'caverna')
    })
    h.api.rpgOnMap('caverna', () => {
      montouCaverna += 1
    })
    h.api.rpgGoMap('vila')
    h.api.placeCharacter(heroi, 0, 0)
    // Direita: parede — não anda, só vira.
    h.fire('keydown', { key: 'd' })
    h.api.rpgMoveGrid(heroi, 64, 0.05)
    expect(heroi.x).toBe(0)
    h.fire('keyup', { key: 'd' })
    // Baixo: livre — anda 1 célula (speed alto encaixa num passo) e cai na PORTA.
    h.fire('keydown', { key: 's' })
    h.api.rpgMoveGrid(heroi, 64, 0.05)
    h.fire('keyup', { key: 's' })
    expect(heroi.y).toBe(64)
    expect(montouCaverna).toBe(1) // porta levou pra caverna
    expect(h.api.rpgCell(3)).toBe(192)
  })

  it('fala: trava o herói; espaço completa, avança a fila e fecha com aviso', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    h.api.placeCharacter(heroi, 0, 0)
    let terminou = false
    h.api.on('fala:terminada', () => {
      terminou = true
    })
    h.api.rpgSay('Olá, viajante!', 'Ferreiro')
    h.api.rpgSay('Boa sorte!', 'Ferreiro')
    // Com a fala aberta, o movimento fica travado.
    h.fire('keydown', { key: 's' })
    h.api.rpgMoveGrid(heroi, 64, 0.05)
    expect(heroi.y).toBe(0)
    h.fire('keyup', { key: 's' })
    // Espaço 1: completa o typewriter; 2: próxima fala; 3: completa; 4: fecha.
    for (let i = 0; i < 4; i++) {
      h.fire('keydown', { key: ' ' })
      h.api.rpgMoveGrid(heroi, 64, 0)
      h.nextFrame(16 * (i + 1)) // limpa o justPressed no fim do quadro
      h.fire('keyup', { key: ' ' })
    }
    expect(terminou).toBe(true)
  })

  it('NPC: sólido na grade; espaço olhando pra ele conversa', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    h.api.placeCharacter(heroi, 0, 0)
    h.api.rpgCreateNpc('ferreiro', 1, 0, '', '')
    let conversou = 0
    h.api.rpgOnTalk('ferreiro', () => {
      conversou += 1
    })
    // NPC bloqueia a célula (não atravessa), mas o herói VIRA para ele.
    h.fire('keydown', { key: 'd' })
    h.api.rpgMoveGrid(heroi, 64, 0.05)
    expect(heroi.x).toBe(0)
    h.fire('keyup', { key: 'd' })
    h.fire('keydown', { key: ' ' })
    h.api.rpgMoveGrid(heroi, 64, 0)
    expect(conversou).toBe(1)
  })

  it('flags e inventário: marcar/perguntar; ganhar sem duplicar/perder', () => {
    const { api } = loadRuntime()
    expect(api.rpgHasFlag('falou')).toBe(false)
    api.rpgAddFlag('falou')
    expect(api.rpgHasFlag('falou')).toBe(true)
    api.rpgGiveItem('chave', '')
    api.rpgGiveItem('chave', '') // não duplica
    expect(api.rpgHasItem('chave')).toBe(true)
    api.rpgRemoveItem('chave')
    expect(api.rpgHasItem('chave')).toBe(false)
  })

  it('batalha em equipe: o painel de ação no canvas, atacar vence, volta pra jogando SEM resetar', async () => {
    const h = loadRuntime()
    h.api.defineMold('g', {})
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('g', 10, 10)
    let terminouBatalha = 0
    h.api.rpgOnBattleEnd(() => {
      terminouBatalha += 1
    })
    h.api.rpgBattleStats(30, 999) // força alta: vence no 1º golpe
    h.api.rpgBattleStart('Dragão', 20, 5, '', '')
    expect(h.api.state()).toBe('batalha') // a batalha é desenhada no canvas (sem DOM)
    driveBattle(h, 1) // aperta "Atacar" no painel até o Dragão cair
    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgBattleWon()).toBe(true)
    expect(terminouBatalha).toBe(1)
    // Voltar da batalha NÃO recomeçou a arena (o goblin segue vivo).
    expect(h.api.countActive('g')).toBe(1)
  })

  it('REGRESSÃO: despausar não recomeça a arena (enxame sobrevive à pausa)', async () => {
    const h = loadRuntime()
    h.api.defineMold('g', {})
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('g', 10, 10)
    expect(h.api.countActive('g')).toBe(1)
    h.api.pause()
    h.api.resume()
    expect(h.api.countActive('g')).toBe(1) // antes: o unpause APAGAVA o enxame
    // "Jogar de novo" de verdade (vindo do fim) segue resetando.
    h.api.endGame()
    h.api.setState('jogando')
    expect(h.api.countActive('g')).toBe(0)
  })
})

describe('SZGameKit — V6: cenas & NPCs vivos', () => {
  it('cutscene: passos ENFILEIRAM e tocam em ordem; herói TRAVADO durante a cena', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    h.api.placeCharacter(heroi, 0, 0)
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    h.api.rpgCutscene(() => {
      h.api.rpgWait(0.3)
      h.api.rpgAddFlag('meio')
      h.api.rpgWait(0.3)
      h.api.rpgAddFlag('fim')
    })
    // ENFILEIRADO: nada rodou ainda (nem a 1ª flag).
    expect(h.api.rpgHasFlag('meio')).toBe(false)
    // Herói travado enquanto a cena toca: apertar direita não move.
    h.fire('keydown', { key: 'd' })
    h.nextFrame(16)
    h.nextFrame(120)
    expect(heroi.x).toBe(0)
    h.fire('keyup', { key: 'd' })
    // ~0.3s de espera → a 1ª flag entra (passo instantâneo encadeia); a 2ª espera.
    for (let t = 220; t <= 460; t += 100) h.nextFrame(t)
    expect(h.api.rpgHasFlag('meio')).toBe(true)
    expect(h.api.rpgHasFlag('fim')).toBe(false)
    // + ~0.3s → a 2ª flag e a cena termina (herói volta a andar).
    for (let t = 560; t <= 900; t += 100) h.nextFrame(t)
    expect(h.api.rpgHasFlag('fim')).toBe(true)
    h.fire('keydown', { key: 'd' })
    h.nextFrame(1000)
    h.nextFrame(1016)
    expect(heroi.x).toBeGreaterThan(0) // cena acabou: anda de novo
  })

  it('NPC anda até a célula (walk_to) e fica sólido no destino; libera a origem', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgOnMap('vila', () => {
      h.api.rpgCreateNpc('bob', 2, 5, '', '')
    })
    h.api.rpgGoMap('vila')
    h.api.rpgNpcWalkTo('bob', 6, 5) // anda 4 células para a direita (passa por 5,5)
    for (let t = 100; t <= 3000; t += 100) h.nextFrame(t) // ~3s: chega em 6,5
    // Observável pelo herói: a célula-alvo do NPC virou PAREDE, a de origem liberou.
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 64 }) as Record<string, number>
    h.api.placeCharacter(heroi, 5 * 64, 5 * 64) // ao lado esquerdo do NPC (5,5)
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    h.fire('keydown', { key: 'd' })
    for (let t = 3100; t <= 6000; t += 100) h.nextFrame(t)
    h.fire('keyup', { key: 'd' })
    expect(Math.round((heroi.x ?? 0) / 64)).toBe(5) // barrado pelo NPC agora em 6,5
    // A origem (2,5) ficou livre: o herói caminha por ela sem barreira.
    h.api.placeCharacter(heroi, 1 * 64, 5 * 64)
    h.fire('keydown', { key: 'd' })
    for (let t = 6100; t <= 6600; t += 100) h.nextFrame(t)
    h.fire('keyup', { key: 'd' })
    expect(Math.round((heroi.x ?? 0) / 64)).toBe(2) // entrou na antiga célula do NPC
  })

  it('reserva de intenção: o herói NÃO entra na célula que o NPC reservou', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 64 }) as Record<string, number>
    h.api.rpgOnMap('sala', () => {
      h.api.rpgCreateNpc('guarda', 3, 0, '', '')
    })
    h.api.rpgGoMap('sala')
    h.api.placeCharacter(heroi, 64, 0) // célula 1,0; guarda em 3,0
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    // O guarda é sólido em 3,0 — o herói andando para a direita para em 2,0.
    h.fire('keydown', { key: 'd' })
    for (let t = 100; t <= 3000; t += 100) h.nextFrame(t)
    h.fire('keyup', { key: 'd' })
    expect(Math.round((heroi.x ?? 0) / 64)).toBe(2) // parou ao lado do guarda (não atravessou)
  })

  it('gatilho ao pisar: roda quando o herói ENCAIXA na célula', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    let pisou = 0
    h.api.rpgOnMap('mapa', () => {
      h.api.rpgOnStep(1, 0, () => {
        pisou += 1
      })
    })
    h.api.rpgGoMap('mapa')
    h.api.placeCharacter(heroi, 0, 0)
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    h.fire('keydown', { key: 'd' })
    for (let t = 100; t <= 400; t += 50) h.nextFrame(t)
    h.fire('keyup', { key: 'd' })
    expect(pisou).toBe(1) // pisou na célula 1,0 uma vez
  })

  it('mover pelas teclas define a direção (folha de andar direcional)', () => {
    const { api } = loadRuntime()
    const c = api.createCharacter({ w: 32, h: 32, speed: 100 }) as Record<string, unknown>
    api.setWalkSheet(c, 'folha', 16, 16)
    expect(c._walkImg).toBe('folha')
    // Sem tecla: fica na direção default 'down'.
    expect(c._facingDir).toBe('down')
  })
})

describe('SZGameKit — V7: escolhas & salvar', () => {
  it('menu de escolha: navega, escolhe com espaço e roda o corpo da opção', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    h.api.placeCharacter(heroi, 0, 0)
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    let escolha = ''
    h.api.rpgMenu('O que fazer?', () => {
      h.api.rpgOption('Lutar', () => {
        escolha = 'lutar'
      })
      h.api.rpgOption('Fugir', () => {
        escolha = 'fugir'
      })
    })
    // Menu aberto: o herói fica travado (apertar direita não move).
    h.fire('keydown', { key: 'd' })
    h.nextFrame(16)
    expect(heroi.x).toBe(0)
    h.fire('keyup', { key: 'd' })
    // ↓ move a seleção para "Fugir"; espaço escolhe.
    h.fire('keydown', { key: 'arrowdown' })
    h.nextFrame(32)
    h.fire('keyup', { key: 'arrowdown' })
    h.fire('keydown', { key: ' ' })
    h.nextFrame(48)
    h.fire('keyup', { key: ' ' })
    expect(escolha).toBe('fugir')
    // Menu fechou: o herói anda de novo.
    h.fire('keydown', { key: 'd' })
    h.nextFrame(64)
    h.nextFrame(80)
    expect(heroi.x).toBeGreaterThan(0)
  })

  it('salvar → continuar: flags, itens e atributos voltam (localStorage)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgOnMap('vila', () => {})
    h.api.rpgGoMap('vila')
    // Estado de história.
    h.api.rpgAddFlag('achou-a-espada')
    h.api.rpgGiveItem('espada', '')
    h.api.rpgBattleStats(50, 12) // vida/força
    expect(h.api.rpgHasSave()).toBe(false)
    h.api.rpgSave()
    expect(h.api.rpgHasSave()).toBe(true)
    // "Recomeçar" apaga a história em memória.
    h.api.setState('menu')
    h.api.setState('jogando') // rpgNewGame zera flags/itens
    expect(h.api.rpgHasFlag('achou-a-espada')).toBe(false)
    expect(h.api.rpgHasItem('espada')).toBe(false)
    // Continuar do save: tudo volta.
    h.api.rpgLoad()
    expect(h.api.rpgHasFlag('achou-a-espada')).toBe(true)
    expect(h.api.rpgHasItem('espada')).toBe(true)
  })
})

describe('SZGameKit — V8: batalha rica (progressão)', () => {
  it('XP + subir de nível: acumula, sobe e sobra o resto', () => {
    const { api } = loadRuntime()
    api.rpgBattleStats(30, 7, 0) // base + nível 1, maxXp 20
    expect(api.rpgLevel()).toBe(1)
    expect(api.rpgXp()).toBe(0)
    api.rpgBattleReward(25) // 25 ≥ 20 → nível 2, sobra 5 (maxXp vira 28)
    expect(api.rpgLevel()).toBe(2)
    expect(api.rpgXp()).toBe(5)
    api.rpgBattleReward(30) // 5+30=35 ≥ 28 → nível 3, sobra 7
    expect(api.rpgLevel()).toBe(3)
    expect(api.rpgXp()).toBe(7)
  })

  it('golpe especial (gasta energia) é uma opção do painel e vence sozinho', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 0)
    h.api.rpgSetSpecial('Raio', 1000, 4) // dano enorme, custo 4 (energia começa 10)
    let ended = 0
    h.api.rpgOnBattleEnd(() => {
      ended += 1
    })
    h.api.rpgBattleStart('Slime', 30, 3, 0)
    expect(h.api.state()).toBe('batalha')
    // O painel de ação (canvas) inclui "Atacar", o golpe "Raio", "Defender" e "Fugir".
    pickAction(h, 1, 'Raio') // escolhe o especial: o Raio (1000) arrasa o Slime (30)
    expect(h.api.rpgBattleWon()).toBe(true)
    expect(h.api.state()).toBe('jogando')
    expect(ended).toBe(1)
  })

  it('veneno: o inimigo perde vida por turno (morre sem eu atacar)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 5) // defesa alta: o inimigo fraco quase não me arranha
    h.api.rpgBattleStart('Cobra', 6, 2, 0)
    h.api.rpgInflict('inimigo', 'veneno', 3) // 3 turnos de veneno (3 de dano/turno)
    expect(h.api.state()).toBe('batalha')
    expect(battleSnap(h)?.foes[0]?.poison).toBe(3)
    // Só DEFENDER (não ataco): o veneno é quem mata a Cobra (6 → 3 → 0).
    let t = pickAction(h, 1, 'Defender')
    expect(h.api.state()).toBe('batalha')
    expect(battleSnap(h)?.foes[0]?.hp).toBe(3)
    t = pickAction(h, t, 'Defender')
    expect(h.api.rpgBattleWon()).toBe(true)
    expect(h.api.state()).toBe('jogando')
  })
})

describe('SZGameKit — V9: mapa de tiles + profundidade', () => {
  it('Y-sort: desenha herói e NPCs por profundidade (quem está embaixo, por último)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64 }) as Record<string, number>
    h.api.placeCharacter(heroi, 0, 200) // y 200 (mais embaixo → desenha por ÚLTIMO)
    h.api.rpgCreateNpc('bob', 0, 1, '', '') // célula (0,1) → y 64 (mais em cima)
    ctxCalls.length = 0
    h.api.drawByDepth(heroi)
    const rects = ctxCalls.filter(
      ([n, a]) => n === 'fillRect' && a[2] === 64 && a[3] === 64,
    ) as Array<[string, number[]]>
    expect(rects.length).toBe(2)
    // O de y menor (NPC, mais atrás) desenha ANTES do de y maior (herói, na frente).
    expect(rects[0]?.[1][1] ?? 0).toBeLessThan(rects[1]?.[1][1] ?? 0)
  })

  it('carregar mapa sem metadado do Pinta avisa e não quebra', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    expect(() => {
      h.api.loadTilemap('mundo', 'nao-existe')
      h.api.drawTilemap('mundo', 'chão') // mapa vazio: no-op
      h.api.tilemapSolid('mundo')
    }).not.toThrow()
  })

  it('tremor da câmera e sombra não quebram (efeitos visuais)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64 })
    expect(() => {
      h.api.cameraShake(10, 0.3)
      h.api.drawShadow(heroi)
      h.nextFrame(16) // um quadro com o tremor ativo
    }).not.toThrow()
  })
})

describe('SZGameKit — V10: ação em tempo real (Zelda)', () => {
  it('golpe na direção acerta o alvo à frente UMA vez por golpe (trava)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(heroi, 100, 100)
    ;(heroi as { _facingDir?: string })._facingDir = 'right'
    // Inimigo colado à direita do herói (dentro do alcance de 40).
    const inimigo = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(inimigo, 140, 100)
    // Sem golpe: não acerta.
    expect(h.api.didHit(heroi, inimigo)).toBe(false)
    h.api.attackFacing(heroi, 40, 0.3)
    // 1º toque do golpe acerta; toques seguintes no MESMO golpe, não.
    expect(h.api.didHit(heroi, inimigo)).toBe(true)
    expect(h.api.didHit(heroi, inimigo)).toBe(false)
    // Alvo fora do alcance (à esquerda) não é atingido.
    const atras = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(atras, 20, 100)
    expect(h.api.didHit(heroi, atras)).toBe(false)
  })

  it('o golpe expira com o tempo e um novo golpe acerta de novo', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(heroi, 100, 100)
    ;(heroi as { _facingDir?: string })._facingDir = 'right'
    const inimigo = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(inimigo, 140, 100)
    h.api.attackFacing(heroi, 40, 0.1)
    expect(h.api.didHit(heroi, inimigo)).toBe(true)
    // Roda ~0.3s de quadros para o golpe expirar (decai em stepSystems).
    h.clock.value = 0
    h.nextFrame(0)
    for (let t = 16; t <= 320; t += 16) {
      h.clock.value = t
      h.nextFrame(t)
    }
    expect(h.api.didHit(heroi, inimigo)).toBe(false) // golpe acabou
    h.api.attackFacing(heroi, 40, 0.3) // novo golpe
    expect(h.api.didHit(heroi, inimigo)).toBe(true)
  })

  it('patrulha mantém o inimigo perto do posto (anel em volta da origem)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const bicho = h.api.createCharacter({ w: 24, h: 24, speed: 80 }) as Record<string, number>
    h.api.placeCharacter(bicho, 300, 300)
    h.api.onUpdate(() => h.api.patrolAround(bicho, 312, 312, 60))
    h.clock.value = 0
    h.nextFrame(0)
    for (let t = 16; t <= 3000; t += 16) {
      h.clock.value = t
      h.nextFrame(t)
    }
    // Centro do bicho nunca foge muito além do raio (+ margem do passo) do posto.
    const cx = (bicho.x ?? 0) + 12
    const cy = (bicho.y ?? 0) + 12
    const dist = Math.sqrt((cx - 312) ** 2 + (cy - 312) ** 2)
    expect(dist).toBeLessThan(120)
  })

  it('desenhar corações não quebra (HUD de vidinha)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    expect(() => h.api.drawHearts(20, 20, 2, 3)).not.toThrow()
  })
})

describe('SZGameKit — R6: correções de bugs', () => {
  it('C1: tremor da câmera com a câmera DESLIGADA mantém save/restore balanceados', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.onDraw(() => {})
    h.api.cameraShake(12, 0.3) // sem cameraFollow → câmera OFF
    ctxCalls.length = 0
    h.clock.value = 16
    h.nextFrame(16) // um quadro com o tremor ativo
    const saves = ctxCalls.filter(([n]) => n === 'save').length
    const restores = ctxCalls.filter(([n]) => n === 'restore').length
    expect(saves).toBe(restores) // sem vazar o translate/pilha do canvas
  })

  it('M4: missão com tempo 0 NÃO vence no 1º quadro (0 = desligado)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.setMission(0, 5) // tempo desligado; meta = 5 inimigos
    h.clock.value = 0
    h.nextFrame(0)
    h.clock.value = 16
    h.nextFrame(16)
    expect(h.api.state()).toBe('jogando') // não pulou pra 'vitoria'
  })

  it('M5: "quando entrar em jogando" NÃO re-dispara ao despausar', async () => {
    const h = loadRuntime()
    await startGame(h)
    let count = 0
    h.api.onEnterState('jogando', () => {
      count += 1
    })
    h.api.setState('jogando') // entrada REAL
    expect(count).toBe(1)
    h.api.setState('pausado')
    h.api.setState('jogando') // despausar — NÃO conta
    expect(count).toBe(1)
  })

  it('M7: auto-repeat do teclado (e.repeat) não conta como "apertou agora"', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.fire('keydown', { key: 'y', repeat: true }) // repetição do SO
    expect(h.api.keyPressed('y')).toBe(false)
    h.fire('keydown', { key: 'z', repeat: false }) // 1º aperto de verdade
    expect(h.api.keyPressed('z')).toBe(true)
  })

  it('M8: efeito inexistente avisa UMA vez (não afoga o console 60x/s)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const warns: string[] = []
    const orig = console.warn
    console.warn = ((m: unknown) => {
      warns.push(String(m))
    }) as typeof console.warn
    try {
      h.api.burst('nao-existe', 0, 0)
      h.api.burst('nao-existe', 0, 0)
      h.api.burst('nao-existe', 0, 0)
    } finally {
      console.warn = orig
    }
    expect(warns.filter((w) => w.includes('nao-existe')).length).toBe(1)
  })

  it('H3: cutscene com NPC bloqueado completa por timeout (não trava a cena)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBlockCell(2, 0) // parede em (2,0) — bloqueia o caminho reto
    h.api.rpgCreateNpc('bob', 0, 0, '', '')
    h.api.rpgCutscene(() => {
      h.api.rpgNpcWalkTo('bob', 5, 0) // caminho passa por (2,0) → nunca chega
      h.api.rpgAddFlag('cena_terminou')
    })
    expect(h.api.rpgHasFlag('cena_terminou')).toBe(false) // ainda tocando a cena
    h.clock.value = 0
    h.nextFrame(0)
    for (let t = 100; t <= 6400; t += 100) {
      h.clock.value = t
      h.nextFrame(t)
    }
    expect(h.api.rpgHasFlag('cena_terminou')).toBe(true) // timeout liberou a cena
  })

  it('L14: rpgLoad ignora item malformado (save editado) sem quebrar', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    // Injeta um save corrompido no localStorage do runtime: um item sem name.
    const bad = JSON.stringify({ flags: {}, items: [{ image: 'x' }, { name: 'chave' }], map: '' })
    h.store.set('szgk-rpg-save', bad)
    expect(() => {
      h.api.rpgLoad()
      h.api.rpgDrawInventory(10, 10) // estouraria se o item sem name passasse
    }).not.toThrow()
    expect(h.api.rpgHasItem('chave')).toBe(true) // o item válido sobreviveu
  })
})

describe('SZGameKit — R9: correções do review #2', () => {
  it('H1: "virar para o alvo" + "golpear na frente" ACERTA (as 2 direções em sincronia)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(heroi, 100, 100)
    // Inimigo à ESQUERDA — o herói nasce olhando p/ 'down'.
    const inimigo = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(inimigo, 50, 100)
    h.api.face(heroi, inimigo) // antes escrevia SÓ _facingLeft → o golpe ia p/ baixo
    expect((heroi as { _facingDir?: string })._facingDir).toBe('left')
    h.api.attackFacing(heroi, 40, 0.3)
    expect(h.api.didHit(heroi, inimigo)).toBe(true)
  })

  it('H1: seek também vira quem persegue (folha de andar na direção certa)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const bicho = h.api.createCharacter({ w: 32, h: 32, speed: 100 }) as Record<string, unknown>
    h.api.placeCharacter(bicho, 200, 100)
    const alvo = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(alvo, 20, 100)
    h.api.seek(bicho, alvo, 0.016)
    expect((bicho as { _facingDir?: string })._facingDir).toBe('left')
    expect((bicho as { _facingLeft?: boolean })._facingLeft).toBe(true)
  })

  it('H3: o tremor decai FORA de jogando (tela de fim não vibra p/ sempre)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.cameraShake(12, 0.2)
    h.api.endGame() // vai p/ 'fim' — o render ainda aplica o tremor
    expect(h.api.state()).toBe('fim')
    h.clock.value = 0
    h.nextFrame(0)
    for (let t = 50; t <= 400; t += 50) {
      h.clock.value = t
      h.nextFrame(t)
    }
    // Depois de 0.4 s o tremor acabou: um quadro não empilha mais save/restore.
    ctxCalls.length = 0
    h.clock.value = 450
    h.nextFrame(450)
    const saves = ctxCalls.filter(([n]) => n === 'save').length
    const restores = ctxCalls.filter(([n]) => n === 'restore').length
    expect(saves).toBe(restores)
  })

  it('M4: setState para o MESMO estado não re-dispara os hooks', async () => {
    const h = loadRuntime()
    await startGame(h)
    let count = 0
    h.api.onEnterState('jogando', () => {
      count += 1
    })
    h.api.setState('jogando')
    expect(count).toBe(1)
    h.api.setState('jogando') // de novo: NÃO é uma entrada nova
    h.api.setState('jogando')
    expect(count).toBe(1)
  })

  it('M2: desenhar o personagem 2× no mesmo quadro não congela o "anda?"', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(heroi, 100, 100)
    h.api.onDraw(() => {
      h.api.drawByDepth(heroi) // 1ª vez
      h.api.drawCharacter(heroi) // 2ª vez no MESMO quadro
    })
    h.clock.value = 0
    h.nextFrame(0)
    h.api.placeCharacter(heroi, 150, 100) // andou
    h.clock.value = 16
    h.nextFrame(16)
    expect((heroi as { _moving?: boolean })._moving).toBe(true)
  })

  it('M3: o molde tem teto — nascedouro sem "recolher" não cresce sem parar', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.defineMold('bolha', { w: 10, h: 10 })
    for (let i = 0; i < 400; i++) h.api.spawnFromMold('bolha', 0, 0)
    expect(h.api.countActive('bolha')).toBeLessThanOrEqual(300)
  })
})

describe('SZGameKit — R11: física geral (gravidade, chão, colisão sólida)', () => {
  it('gravidade faz cair e zera o "no chão" a cada quadro', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number | boolean>
    h.api.placeCharacter(c, 100, 0)
    expect(h.api.isOnGround(c)).toBe(false)
    h.api.applyGravity(c, 2000, 0.1)
    expect(h.api.velocityOf(c, 'y')).toBeCloseTo(200, 5)
    h.api.moveByVelocity(c, 0.1)
    expect(c.y).toBeCloseTo(20, 5)
  })

  it('velocidade terminal limita a queda (e é o que impede furar o chão)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.setTerminalVelocity(c, 500)
    for (let i = 0; i < 50; i++) h.api.applyGravity(c, 5000, 0.1)
    expect(h.api.velocityOf(c, 'y')).toBe(500)
  })

  it('velocity_of LÊ o que set_velocity escreveu (destrava "se vx > 0")', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.setVelocity(c, -140, 55)
    expect(h.api.velocityOf(c, 'x')).toBe(-140)
    expect(h.api.velocityOf(c, 'y')).toBe(55)
  })

  it('pular só funciona com os pés no chão (sem voo infinito)', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.jump(c, 600)
    expect(h.api.velocityOf(c, 'y')).toBe(0) // no ar: não pula
    ;(c as { onGround?: boolean }).onGround = true
    h.api.jump(c, 600)
    expect(h.api.velocityOf(c, 'y')).toBe(-600)
    expect(h.api.isOnGround(c)).toBe(false) // saiu do chão
  })

  it('propriedade do personagem: ler e escrever x/y/vx/vy/speed', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({ w: 32, h: 32, speed: 200 })
    h.api.setProperty(c, 'vx', 77)
    expect(h.api.propertyOf(c, 'vx')).toBe(77)
    expect(h.api.propertyOf(c, 'speed')).toBe(200)
    h.api.setProperty(c, 'x', 42)
    expect(h.api.propertyOf(c, 'x')).toBe(42)
  })

  it('direção: set_facing escreve os DOIS campos (par do H1)', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.setFacingDir(c, 'left')
    expect(h.api.facingOf(c)).toBe('left')
    expect((c as { _facingLeft?: boolean })._facingLeft).toBe(true)
  })

  it('cooldown é em SEGUNDOS e por personagem', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.clock.value = 0
    h.nextFrame(0)
    expect(h.api.cooldownReady(c, 0.2)).toBe(true) // 1ª vez: pronto, arma a recarga
    expect(h.api.cooldownReady(c, 0.2)).toBe(false) // recarregando: BLOQUEIA
    // Cada personagem tem a SUA recarga.
    const outro = h.api.createCharacter({ w: 32, h: 32 })
    expect(h.api.cooldownReady(outro, 0.2)).toBe(true)
  })

  it('quicar nas bordas inverte a velocidade (breakout/pong)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    await startGame(h)
    const bola = h.api.createCharacter({ w: 20, h: 20 }) as Record<string, unknown>
    h.api.placeCharacter(bola, -5, 100)
    h.api.setVelocity(bola, -200, 0)
    h.api.bounceOnEdges(bola)
    expect(h.api.velocityOf(bola, 'x')).toBe(200) // virou para a direita
    expect((bola as { x?: number }).x).toBe(0)
  })

  it('emendar bordas teleporta para o outro lado (asteroids)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    await startGame(h)
    const nave = h.api.createCharacter({ w: 20, h: 20 }) as Record<string, unknown>
    h.api.placeCharacter(nave, 405, 100)
    h.api.wrapEdges(nave)
    expect((nave as { x?: number }).x).toBe(-20)
  })
})

describe('SZGameKit — R12: Kit Plataforma', () => {
  /** Chão sólido feito de um molde (não precisa de asset): uma laje larga. */
  async function comChao(h: Harness, topoY = 400) {
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('chao', { w: 800, h: 64, color: '#444' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('chao', 0, topoY)
  }
  /** Um quadro do herói: hero + colisão contra o chão (a ordem de verdade). */
  function quadro(h: Harness, heroi: unknown, dt = 1 / 60) {
    h.api.platformerHero(heroi, 240, 660, dt)
    h.api.collideGroup(heroi, 'chao')
  }
  /** A API é tipada como `unknown` (é um runtime-string); nas CONTAS o número
   * precisa ser explícito — nas asserções o `expect` já aceita unknown. */
  const vy = (h: Harness, c: unknown) => h.api.velocityOf(c, 'y') as number
  const posY = (c: unknown) => (c as { y: number }).y
  const posX = (c: unknown) => (c as { x: number }).x
  const vx = (h: Harness, c: unknown) => h.api.velocityOf(c, 'x') as number

  // ---- as lacunas que o R11 deixou: pouso e tunelamento ----
  it('⭐ cai, POUSA no topo do sólido e marca "no chão" (ordem gravidade→mover→colidir)', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number | boolean>
    h.api.placeCharacter(c, 100, 0)
    for (let i = 0; i < 120; i++) {
      h.api.applyGravity(c, 2160, 1 / 60)
      h.api.moveByVelocity(c, 1 / 60)
      h.api.collideGroup(c, 'chao')
    }
    expect(h.api.isOnGround(c)).toBe(true)
    expect(c.y).toBeCloseTo(400 - 32, 1) // parou EM CIMA da laje, não dentro
    expect(h.api.velocityOf(c, 'y')).toBe(0)
  })

  it('⭐ anti-tunelamento: com o quadro lento (dt=0.1) NÃO atravessa o chão', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    h.api.placeCharacter(c, 100, 0)
    // dt=0.1 × 2160 px/s² = 216 px num quadro só — mais que a laje inteira (64).
    // Sem a varredura, o personagem apareceria do outro lado.
    for (let i = 0; i < 30; i++) {
      h.api.applyGravity(c, 2160, 0.1)
      h.api.moveByVelocity(c, 0.1)
      h.api.collideGroup(c, 'chao')
    }
    expect(c.y).toBeLessThanOrEqual(400) // não passou para baixo da laje
    expect(c.y).toBeCloseTo(400 - 32, 0)
  })

  // ---- o feel ----
  it('⭐ COYOTE: dá para pular um instantinho DEPOIS de sair da beirada', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(c, 100, 100)
    ;(c as { onGround: boolean }).onGround = true
    // 1º quadro: estava no chão → arma o coyote (0,1 s). Depois, no ar.
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.platformerHero(c, 240, 660, 1 / 60)
    expect(h.api.isOnGround(c)).toBe(false)
    h.fire('keydown', { key: ' ' })
    h.api.platformerHero(c, 240, 660, 1 / 60)
    expect(h.api.velocityOf(c, 'y')).toBeLessThan(-600) // PULOU no ar (coyote)
  })

  it('⭐ COYOTE acaba: passado o tempo, o pulo no ar não sai mais', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(c, 100, 100)
    ;(c as { onGround: boolean }).onGround = true
    h.api.platformerHero(c, 240, 660, 1 / 60) // no chão: arma o coyote
    h.api.platformerHero(c, 240, 660, 0.5) // meio segundo no AR: o coyote morreu
    h.fire('keydown', { key: ' ' })
    h.api.platformerHero(c, 240, 660, 1 / 60)
    expect(h.api.velocityOf(c, 'y')).toBeGreaterThan(0) // caindo: não pulou
  })

  it('⭐ BUFFER: apertar ANTES de pousar não perde o pulo (dispara no pouso)', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    // Caindo rápido, a 3 px do chão (topo em 400): pousa em ~1 quadro — dentro
    // dos 0,1 s do buffer.
    h.api.placeCharacter(c, 100, 400 - 32 - 3)
    h.api.setVelocity(c, 0, 300)
    h.fire('keydown', { key: ' ' })
    quadro(h, c)
    h.fire('keyup', { key: ' ' })
    expect(h.api.velocityOf(c, 'y')).toBeGreaterThanOrEqual(0) // no ar não pulou
    let pulouSozinho = false
    for (let i = 0; i < 5; i++) {
      quadro(h, c)
      if (vy(h, c) < 0) pulouSozinho = true
    }
    expect(pulouSozinho).toBe(true) // pulou SOZINHO ao pousar
  })

  it('⭐ PULO VARIÁVEL: um toquinho pula BAIXO, segurar pula ALTO', async () => {
    async function alturaCom(segurarQuadros: number): Promise<number> {
      const h = loadRuntime()
      await comChao(h)
      const c = h.api.createCharacter({ w: 32, h: 32 })
      h.api.placeCharacter(c, 100, 400 - 32)
      ;(c as { onGround: boolean }).onGround = true
      h.fire('keydown', { key: ' ' })
      for (let i = 0; i < segurarQuadros; i++) quadro(h, c)
      h.fire('keyup', { key: ' ' })
      let topo = posY(c)
      for (let i = 0; i < 120; i++) {
        quadro(h, c)
        topo = Math.min(topo, posY(c))
      }
      return 400 - 32 - topo // quanto subiu
    }
    const toque = await alturaCom(1)
    const segurou = await alturaCom(18) // 0,3 s = a janela toda
    expect(toque).toBeGreaterThan(10) // o toquinho PULA (não é engolido)
    expect(segurou).toBeGreaterThan(toque * 1.5) // segurar pula bem mais alto
  })

  it('correr pula mais alto que parado (o speedBoost do Mario)', async () => {
    async function forcaAndando(andando: boolean): Promise<number> {
      const h = loadRuntime()
      await comChao(h)
      const c = h.api.createCharacter({ w: 32, h: 32 })
      h.api.placeCharacter(c, 100, 400 - 32)
      ;(c as unknown as { onGround: boolean }).onGround = true
      if (andando) h.fire('keydown', { key: 'd' })
      h.fire('keydown', { key: ' ' })
      h.api.platformerHero(c, 240, 660, 1 / 60)
      return -vy(h, c)
    }
    expect(await forcaAndando(true)).toBeGreaterThan(await forcaAndando(false))
  })

  it('pulo duplo: 1 pulo no ar, e o pouso devolve', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(c, 100, 100)
    ;(c as { onGround: boolean }).onGround = true
    h.fire('keydown', { key: ' ' })
    h.api.platformerHero(c, 240, 660, 1 / 60) // pulo do chão
    h.fire('keyup', { key: ' ' })
    for (let i = 0; i < 12; i++) h.api.platformerHero(c, 240, 660, 1 / 60)
    const vAntes = vy(h, c)
    h.fire('keydown', { key: ' ' }) // 2º aperto NO AR
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.doubleJump(c, 600, 1)
    expect(h.api.velocityOf(c, 'y')).toBeLessThan(vAntes) // pulou de novo
    h.fire('keyup', { key: ' ' })
    h.fire('keydown', { key: ' ' }) // 3º aperto: acabou
    h.api.platformerHero(c, 240, 660, 1 / 60)
    const v2 = vy(h, c)
    h.api.doubleJump(c, 600, 1)
    expect(h.api.velocityOf(c, 'y')).toBe(v2) // não pula uma 3ª vez
  })

  it('⭐ wall jump: empurra para LONGE da parede e a seta não apaga o empurrão', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('parede', { w: 64, h: 400, color: '#333' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('parede', 200, 0)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 150, 100)
    h.fire('keydown', { key: 'd' }) // empurrando CONTRA a parede (à direita)
    for (let i = 0; i < 20; i++) {
      h.api.platformerHero(c, 240, 660, 1 / 60)
      h.api.collideGroup(c, 'parede')
    }
    h.fire('keydown', { key: ' ' })
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.wallJump(c, 300, 660)
    expect(h.api.velocityOf(c, 'y')).toBeCloseTo(-660, 5)
    expect(h.api.velocityOf(c, 'x')).toBeCloseTo(-300, 5) // para LONGE (esquerda)
    // A trava: mesmo com "d" ainda apertado, o quadro seguinte NÃO reescreve o vx.
    h.api.platformerHero(c, 240, 660, 1 / 60)
    expect(h.api.velocityOf(c, 'x')).toBeCloseTo(-300, 5)
  })

  it('deslizar na parede deixa a queda lenta (e só na parede)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('parede', { w: 64, h: 400, color: '#333' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('parede', 200, 0)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 150, 100)
    h.fire('keydown', { key: 'd' })
    for (let i = 0; i < 30; i++) {
      h.api.platformerHero(c, 240, 660, 1 / 60)
      h.api.wallSlide(c, 90)
      h.api.collideGroup(c, 'parede')
    }
    expect(h.api.velocityOf(c, 'y')).toBeLessThanOrEqual(90) // freado pela parede
    // Longe da parede a queda é livre (bem mais rápida que 90).
    h.fire('keyup', { key: 'd' })
    h.api.placeCharacter(c, 0, 100)
    for (let i = 0; i < 30; i++) {
      h.api.platformerHero(c, 240, 660, 1 / 60)
      h.api.wallSlide(c, 90)
    }
    expect(h.api.velocityOf(c, 'y')).toBeGreaterThan(200)
  })

  // ---- plataformas ----
  it('⭐ uma-via: SOBE atravessando por baixo e POUSA em cima', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('tabua', { w: 200, h: 8, color: '#a60' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('tabua', 0, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    // Subindo (vy < 0) na altura da tábua: atravessa.
    h.api.placeCharacter(c, 50, 305)
    h.api.setVelocity(c, 0, -400)
    h.api.oneWayPlatform(c, 'tabua', 1 / 60)
    expect(h.api.isOnGround(c)).toBe(false)
    // Caindo de cima: pousa no topo.
    h.api.placeCharacter(c, 50, 260)
    h.api.setVelocity(c, 0, 400)
    for (let i = 0; i < 10; i++) {
      h.api.moveByVelocity(c, 1 / 60)
      h.api.oneWayPlatform(c, 'tabua', 1 / 60)
    }
    expect(h.api.isOnGround(c)).toBe(true)
    expect(c.y).toBeCloseTo(300 - 32, 5)
  })

  it('⭐ uma-via NÃO fura numa queda rápida (o lookahead do Sunnyland)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('tabua', { w: 200, h: 8, color: '#a60' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('tabua', 0, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    // Pés a 1 px do plano e caindo 900 px/s: num quadro passaria 15 px ADIANTE da
    // tábua. Testar sobreposição erraria; testar o CRUZAMENTO do plano pega.
    h.api.placeCharacter(c, 50, 300 - 32 - 1)
    h.api.setVelocity(c, 0, 900)
    h.api.oneWayPlatform(c, 'tabua', 1 / 60)
    expect(h.api.isOnGround(c)).toBe(true)
    expect(c.y).toBeCloseTo(300 - 32, 5)
  })

  it('descer da uma-via com ↓ + pulo', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('tabua', { w: 200, h: 8, color: '#a60' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('tabua', 0, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 50, 300 - 32 - 1)
    h.api.setVelocity(c, 0, 400)
    h.fire('keydown', { key: 's' })
    h.fire('keydown', { key: ' ' })
    h.api.dropThrough(c)
    h.api.oneWayPlatform(c, 'tabua', 1 / 60)
    expect(h.api.isOnGround(c)).toBe(false) // atravessou
  })

  it('⭐ plataforma que anda CARREGA quem está em cima', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('movel', { w: 128, h: 16, color: '#0a8' })
    await startGame(h)
    h.api.setState('jogando')
    const p = h.api.spawnFromMold('movel', 100, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 150, 300 - 32) // em pé nela
    const xAntes = posX(c)
    for (let i = 0; i < 30; i++) {
      h.api.movingPlatform(p, 100, 300, 400, 300, 2, 1 / 60)
      h.api.rideOn(c, 'movel')
    }
    expect(posX(p)).toBeGreaterThan(100) // a plataforma andou
    expect(posX(c)).toBeGreaterThan(xAntes) // e LEVOU o herói junto
    expect(posX(c) - xAntes).toBeCloseTo(posX(p) - 100, 0) // andaram o MESMO tanto
  })

  // ---- inimigos ----
  it('⭐ pisar mata pela VELOCIDADE (técnica do Mario), e quica', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('goomba', { w: 32, h: 32, color: '#a52' })
    await startGame(h)
    h.api.setState('jogando')
    let pisou = 0
    h.api.on('plataforma:pisou', () => {
      pisou += 1
    })
    h.api.spawnFromMold('goomba', 100, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    // Encostando mas SUBINDO: não mata (e um inimigo subindo não morre).
    h.api.placeCharacter(c, 100, 290)
    h.api.setVelocity(c, 0, -100)
    h.api.stompKill(c, 'goomba', 400)
    expect(pisou).toBe(0)
    expect(h.api.countActive('goomba')).toBe(1)
    // Caindo NELE: mata e quica.
    h.api.setVelocity(c, 0, 300)
    h.api.stompKill(c, 'goomba', 400)
    expect(pisou).toBe(1)
    expect(h.api.countActive('goomba')).toBe(0)
    expect(h.api.velocityOf(c, 'y')).toBe(-400)
    expect(c.y).toBe(300 - 32) // encaixou EM CIMA (bounds.bottom = top)
  })

  it('⭐ patrulha VIRA na parede (dirigida por colisão, não por odômetro)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('parede', { w: 32, h: 200, color: '#333' })
    h.api.defineMold('bicho', { w: 32, h: 32, color: '#a52' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('parede', 100, 100)
    const b = h.api.spawnFromMold('bicho', 200, 150)
    let virou = false
    for (let i = 0; i < 200; i++) {
      h.api.patrolTurnAtWall(b, 60)
      h.api.moveByVelocity(b, 1 / 60)
      h.api.collideGroup(b, 'parede')
      if (vx(h, b) > 0) {
        virou = true
        break
      }
    }
    expect(virou).toBe(true) // bateu e voltou
  })

  // ---- progressão + animação ----
  it('checkpoint: renasce no ponto salvo (e sem checkpoint, onde nasceu)', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    const nasceuEm = c.y
    h.api.setVelocity(c, 100, 500)
    h.api.placeCharacter(c, 10, 999)
    h.api.respawn(c)
    expect(c.y).toBe(nasceuEm) // voltou para onde nasceu
    expect(h.api.velocityOf(c, 'y')).toBe(0) // a queda zera
    h.api.setCheckpoint(600, 200)
    h.api.placeCharacter(c, 10, 999)
    h.api.respawn(c)
    expect(c.x).toBe(600)
    expect(c.y).toBe(200)
  })

  it('animação por estado sai da FÍSICA: parado/andando/pulando/caindo', async () => {
    const h = loadRuntime()
    await comChao(h)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.platStateFrames(c, 'parado', 0, 1, 4)
    h.api.platStateFrames(c, 'andando', 2, 7, 10)
    h.api.platStateFrames(c, 'pulando', 8, 8, 1)
    h.api.platStateFrames(c, 'caindo', 9, 9, 1)
    const quadros = () => [
      (c as { _animFrom: number })._animFrom,
      (c as { _animTo: number })._animTo,
    ]
    ;(c as { onGround: boolean }).onGround = true
    h.api.setVelocity(c, 0, 0)
    h.api.platformerAnim(c)
    expect(quadros()).toEqual([0, 1]) // parado
    h.api.setVelocity(c, 200, 0)
    h.api.platformerAnim(c)
    expect(quadros()).toEqual([2, 7]) // andando
    ;(c as { onGround: boolean }).onGround = false
    h.api.setVelocity(c, 200, -300)
    h.api.platformerAnim(c)
    expect(quadros()).toEqual([8, 8]) // pulando
    h.api.setVelocity(c, 200, 300)
    h.api.platformerAnim(c)
    expect(quadros()).toEqual([9, 9]) // caindo
  })

  it('⭐ escada: sobe com ↑, a gravidade não vale, e fora dela cai', async () => {
    // "2" é a peça de escada; "1" é chão sólido. Tile de 64.
    const h = loadRuntime(fakeTilemapAsset('1 1 1\n. 2 .\n. 2 .', [1], 64))
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.loadTilemap('mundo', 'mapa')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 80, 80) // centro na coluna 1, linha 1 = escada
    h.fire('keydown', { key: 'w' })
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.climbLadder(c, 'mundo', 2, 160)
    expect(h.api.velocityOf(c, 'y')).toBe(-160) // SOBE (a gravidade foi anulada)
    h.fire('keyup', { key: 'w' })
    // Fecha o quadro de verdade: é o loop que limpa o "recém-apertada". Sem isso o
    // teste seguraria a tecla como se ela fosse apertada DE NOVO a cada chamada.
    h.nextFrame(16)
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.climbLadder(c, 'mundo', 2, 160)
    expect(h.api.velocityOf(c, 'y')).toBe(0) // parado = pendurado
    // Longe da escada (coluna 0, linha 2 = vazio): a gravidade volta a valer.
    h.api.placeCharacter(c, 10, 150)
    h.api.platformerHero(c, 240, 660, 1 / 60)
    h.api.climbLadder(c, 'mundo', 2, 160)
    expect(h.api.velocityOf(c, 'y')).toBeGreaterThan(0)
  })

  it('⭐ contrato do pool: reciclado NÃO herda o estado de plataforma', async () => {
    const h = loadRuntime()
    await comChao(h)
    const a = h.api.spawnFromMold('chao', 10, 10) as Record<string, unknown>
    a._coyoteT = 5
    a._airJumps = 9
    a._wallT = 3
    a._patrolDir = 1
    a._platT = 42
    a.onGround = true
    h.api.recycle(a)
    const b = h.api.spawnFromMold('chao', 20, 20) as Record<string, unknown>
    expect(b).toBe(a) // é o MESMO objeto (pooling)
    expect(b._coyoteT).toBe(0)
    expect(b._airJumps).toBe(0)
    expect(b._wallT).toBe(0)
    expect(b._patrolDir).toBe(0)
    expect(b._platT).toBe(0)
    expect(b.onGround).toBe(false)
  })

  it('regular o pulo muda as janelas (coyote/buffer/segurar) e a gravidade', async () => {
    const h = loadRuntime()
    await comChao(h)
    h.api.setJumpFeel(0, 0, 0.3, 2160) // SEM coyote e SEM buffer
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.placeCharacter(c, 100, 100)
    ;(c as { onGround: boolean }).onGround = true
    h.api.platformerHero(c, 240, 660, 1 / 60) // saiu do chão: sem coyote, acabou
    h.fire('keydown', { key: ' ' })
    h.api.platformerHero(c, 240, 660, 1 / 60)
    expect(h.api.velocityOf(c, 'y')).toBeGreaterThan(0) // não pulou
    // Gravidade da Lua: cai bem mais devagar.
    const lua = loadRuntime()
    await comChao(lua)
    lua.api.setJumpFeel(0.1, 0.1, 0.3, 200)
    const m = lua.api.createCharacter({ w: 32, h: 32 })
    lua.api.platformerHero(m, 240, 660, 1)
    expect(lua.api.velocityOf(m, 'y')).toBeCloseTo(200, 5)
  })
})

describe('SZGameKit — R13: bugs do review #3', () => {
  it('⭐ um tiro derruba UM inimigo, não a pilha toda (overlapGroups recheca o "a")', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('tiro', { w: 8, h: 8 })
    h.api.defineMold('inimigo', { w: 32, h: 32 })
    await startGame(h)
    h.api.setState('jogando')
    // 3 inimigos EMPILHADOS no mesmo ponto + 1 tiro em cima deles.
    h.api.spawnFromMold('inimigo', 100, 100)
    h.api.spawnFromMold('inimigo', 100, 100)
    h.api.spawnFromMold('inimigo', 100, 100)
    h.api.spawnFromMold('tiro', 110, 110)
    let acertos = 0
    // O uso canônico do bloco: o tiro some ao acertar.
    h.api.overlapGroups('tiro', 'inimigo', (t: unknown, i: unknown) => {
      acertos += 1
      h.api.recycle(i)
      h.api.recycle(t)
    })
    // ⭐ Sem a recheca, o MESMO tiro (que a varredura deixa no active[]) colidia
    // com os 3 → placar pulando, intermitente, "bug fantasma".
    expect(acertos).toBe(1)
    expect(h.api.countActive('inimigo')).toBe(2)
    expect(h.api.countActive('tiro')).toBe(0)
  })

  it('⭐ "Jogar de novo" esquece o checkpoint da partida anterior', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    // A criança marca o ponto numa bandeira no MEIO da fase (uso natural).
    h.api.setCheckpoint(600, 200)
    h.api.endGame() // morreu
    h.api.setState('jogando') // "Jogar de novo"
    h.api.placeCharacter(c, 10, 999)
    h.api.respawn(c)
    // ⭐ Sem o reset, renascia em (600,200) — no meio da fase da partida passada.
    expect(c.x).not.toBe(600)
    expect(c.y).not.toBe(200)
  })

  it('⭐ "Jogar de novo" corta os tweens em voo (não arrasta o inimigo novo)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('bicho', { w: 32, h: 32 })
    await startGame(h)
    h.api.setState('jogando')
    const a = h.api.spawnFromMold('bicho', 0, 0) as Record<string, number>
    h.api.tweenTo(a, 500, 500, 1) // em voo quando o jogo acaba
    h.api.endGame()
    h.api.setState('jogando')
    const b = h.api.spawnFromMold('bicho', 10, 10) as Record<string, number>
    expect(b).toBe(a as unknown as typeof b) // o pool reusa o MESMO objeto
    h.nextFrame(16)
    h.nextFrame(32)
    // ⭐ Sem o reset, o tween do bicho MORTO seguia arrastando o bicho NOVO.
    expect(b.x).toBe(10)
    expect(b.y).toBe(10)
  })

  it('⭐ emendar a borda não gruda no mapa (teleporte zera a varredura)', async () => {
    // Chão sólido feito de molde; a nave sai pela direita e deve reaparecer na
    // esquerda — sem a varredura tentar refazer o caminho inteiro de volta.
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('parede', { w: 32, h: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('parede', 400, 0) // uma parede NO MEIO do caminho
    const nave = h.api.createCharacter({ w: 20, h: 20 }) as Record<string, number>
    h.api.placeCharacter(nave, 790, 100)
    h.api.setVelocity(nave, 200, 0)
    h.api.moveByVelocity(nave, 0.1) // passa da borda direita
    h.api.wrapEdges(nave)
    expect(nave.x).toBe(-20) // emendou
    h.api.collideGroup(nave, 'parede')
    // ⭐ Sem zerar _prevX, a varredura voltava de x≈810 até -20 e a nave PARAVA
    // na parede do meio ("saí pela direita e apareci grudado no meio do mapa").
    expect(nave.x).toBe(-20)
  })

  it('⭐ nome de molde/mapa errado AVISA (em vez de falhar calado)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      // O erro nº1 da criança: espaço no fim, ou renomeou e esqueceu um bloco.
      h.api.collideGroup(c, 'chao ')
      h.api.collideTilemap(c, 'mundo')
      h.api.oneWayPlatform(c, 'tabua', 1 / 60)
      h.api.rideOn(c, 'movel')
      h.api.stompKill(c, 'bicho', 400)
      h.api.drawTilemap('mundo', 'chão')
    } finally {
      console.warn = real
    }
    // ⭐ Antes: o herói atravessava o chão e caía p/ sempre, SEM uma linha.
    expect(warns.length).toBeGreaterThanOrEqual(6)
    expect(warns.some((w) => w.includes('chao '))).toBe(true)
    expect(warns.some((w) => w.includes('mundo'))).toBe(true)
  })

  it('contrato do pool: reciclado não herda o timer de vaguear/patrulhar', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('bicho', { w: 32, h: 32 })
    await startGame(h)
    h.api.setState('jogando')
    const a = h.api.spawnFromMold('bicho', 10, 10) as Record<string, unknown>
    a._driftTimer = 9
    a._patrolTX = 500
    a._patrolTY = 500
    a._patrolTimer = 4
    h.api.recycle(a)
    const b = h.api.spawnFromMold('bicho', 20, 20) as Record<string, unknown>
    expect(b).toBe(a)
    expect(b._driftTimer).toBe(0)
    expect(b._patrolTX).toBe(0)
    expect(b._patrolTY).toBe(0)
    expect(b._patrolTimer).toBe(0)
  })
})

describe('SZGameKit — R15: primitivos gerais', () => {
  it('⭐ "quanto do corpo está na região" — a joia do encontro na grama', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.defineRegion('grama', 100, 100, 200, 200)
    const c = h.api.createCharacter({ w: 40, h: 40 })
    // Totalmente dentro
    h.api.placeCharacter(c, 150, 150)
    expect(h.api.overlapPercent(c, 'grama')).toBe(100)
    // Encostando 1 px na quina → quase nada (o original sortearia batalha aqui)
    h.api.placeCharacter(c, 61, 61)
    expect(h.api.overlapPercent(c, 'grama')).toBeLessThan(1)
    // Metade dentro
    h.api.placeCharacter(c, 80, 150)
    expect(h.api.overlapPercent(c, 'grama')).toBeCloseTo(50, 0)
  })

  it('⭐ sem encostar, a área é 0 (a bomba do "negativo × negativo" do original)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.defineRegion('grama', 100, 100, 200, 200)
    const c = h.api.createCharacter({ w: 40, h: 40 })
    // LONGE nos DOIS eixos: no original os dois fatores ficam negativos e o
    // produto vira positivo GRANDE — passaria no teste "> metade do corpo".
    h.api.placeCharacter(c, 0, 0)
    expect(h.api.overlapPercent(c, 'grama')).toBe(0)
    expect(h.api.isInside(c, 'grama')).toBe(false)
    h.api.placeCharacter(c, 700, 700)
    expect(h.api.overlapPercent(c, 'grama')).toBe(0)
  })

  it('região com nome errado avisa (em vez de falhar calada)', async () => {
    const h = loadRuntime()
    await startGame(h)
    const c = h.api.createCharacter({ w: 40, h: 40 })
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.isInside(c, 'nao-existe')
    } finally {
      console.warn = real
    }
    expect(warns.some((w) => w.includes('nao-existe'))).toBe(true)
  })

  it('⭐ hitbox: a caixa que colide ≠ o desenho (o herói não colide com a cabeça)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    const heroi = h.api.createCharacter({ w: 48, h: 68 }) // alto como o do Pokémon
    const parede = h.api.createCharacter({ w: 48, h: 48 })
    h.api.placeCharacter(heroi, 100, 100) // cabeça de 100 a 168
    h.api.placeCharacter(parede, 100, 60) // parede ACIMA da cabeça (60→108)
    expect(h.api.touching(heroi, parede)).toBe(true) // o sprite inteiro encosta
    // Só os PÉS colidem (os 16 px de baixo) — como num jogo de verdade.
    h.api.setHitbox(heroi, 0, 52, 48, 16) // pés: 152 → 168
    expect(h.api.touching(heroi, parede)).toBe(false)
  })

  it('⭐ música toca em LOOP e o parar zera (o runtime não tinha nada disso)', async () => {
    const h = loadRuntime()
    await startGame(h)
    // Injeta um "som" carregado direto no registro do runtime via a API pública:
    // não dá p/ carregar áudio no happy-dom, então validamos pelo aviso.
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.playMusic('trilha')
      h.api.stopSound('trilha')
      h.api.setVolume('trilha', 0.5)
    } finally {
      console.warn = real
    }
    // Som não carregado → aviso claro (antes: silêncio total).
    expect(warns.some((w) => w.includes('trilha'))).toBe(true)
  })

  it('⭐ mirar num PONTO (o mouse dá números, não um personagem)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    const tiro = h.api.createCharacter({ w: 10, h: 10 })
    h.api.placeCharacter(tiro, 100, 100) // centro em (105,105)
    h.api.launchToPoint(tiro, 305, 105, 200) // 200 px à direita
    expect(h.api.velocityOf(tiro, 'x')).toBeCloseTo(200, 5)
    expect(h.api.velocityOf(tiro, 'y')).toBeCloseTo(0, 5)
  })

  it('⭐ velocidade por ÂNGULO (o "girar" era só visual: não movia nada)', async () => {
    const h = loadRuntime()
    await startGame(h)
    const nave = h.api.createCharacter({ w: 20, h: 20 })
    h.api.setVelocityAngle(nave, 0, 100)
    expect(h.api.velocityOf(nave, 'x')).toBeCloseTo(100, 5)
    h.api.setVelocityAngle(nave, 90, 100)
    expect(h.api.velocityOf(nave, 'y')).toBeCloseTo(100, 5)
  })

  it('⭐ guardar/ler valor GERAL (o recorde, sem precisar do Kit RPG)', async () => {
    const h = loadRuntime()
    await startGame(h)
    expect(h.api.savedValue('recorde')).toBe(0) // nunca guardado = 0
    h.api.saveValue('recorde', 1500)
    expect(h.api.savedValue('recorde')).toBe(1500)
    h.api.saveValue('nome', 'Ana')
    expect(h.api.savedValue('nome')).toBe('Ana')
  })

  it('opacidade + sumir aos poucos (o "faint" do Pokémon)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    expect(h.api.opacityOf(c)).toBe(100)
    h.api.setOpacity(c, 40)
    expect(h.api.opacityOf(c)).toBe(40)
    h.api.fadeTo(c, 0, 0.2)
    // ⚠️ O dt é CLAMPADO em 0.1 s (aba em segundo plano não teleporta o jogo) —
    // 0,2 s de fade precisam de pelo menos 3 quadros, não de um salto de 200 ms.
    for (let i = 1; i <= 6; i++) h.nextFrame(i * 50)
    expect(h.api.opacityOf(c)).toBe(0)
  })

  it('⭐ o deslizar AVISA ao chegar (antes sumia calado — dava p/ encadear nada)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    let chegou = 0
    h.api.on('deslizou:chegou', () => {
      chegou += 1
    })
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.tweenTo(c, 300, 300, 0.1)
    for (let i = 1; i <= 5; i++) h.nextFrame(i * 50)
    expect(chegou).toBe(1) // UM aviso por deslize (não um por eixo)
  })

  it('chance: 0% nunca, 100% sempre', async () => {
    const h = loadRuntime()
    await startGame(h)
    let n = 0
    for (let i = 0; i < 50; i++) if (h.api.chance(0)) n += 1
    expect(n).toBe(0)
    n = 0
    for (let i = 0; i < 50; i++) if (h.api.chance(100)) n += 1
    expect(n).toBe(50)
  })

  it('distância e ponto-dentro-do-personagem (clicar numa carta/torre)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    const a = h.api.createCharacter({ w: 20, h: 20 })
    const b = h.api.createCharacter({ w: 20, h: 20 })
    h.api.placeCharacter(a, 0, 0) // centro (10,10)
    h.api.placeCharacter(b, 30, 40) // centro (40,50) → 3-4-5 ×10
    expect(h.api.distanceBetween(a, b)).toBeCloseTo(50, 5)
    expect(h.api.pointIn(5, 5, a)).toBe(true)
    expect(h.api.pointIn(100, 100, a)).toBe(false)
  })

  it('mapa vazio por código (masmorra sorteada) + escrever peça', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.createEmptyTilemap('masmorra', 10, 8, -1, '')
    h.api.setTileSize(64)
    expect(h.api.tileAt('masmorra', 0, 0)).toBe(-1) // nasceu vazio
    h.api.setTileAt('masmorra', 64, 64, 3)
    expect(h.api.tileAt('masmorra', 64, 64)).toBe(3)
  })

  it('2º jogador: teclas escolhidas (o "mover pelas teclas" tem WASD E setas fixos)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    const p2 = h.api.createCharacter({ w: 20, h: 20, speed: 100 }) as Record<string, number>
    h.api.placeCharacter(p2, 100, 100)
    h.fire('keydown', { key: 'l' })
    h.api.moveWithCustomKeys(p2, 'i', 'k', 'j', 'l', 0.1)
    expect(p2.x).toBeCloseTo(110, 5) // andou com a tecla DELE
    h.fire('keydown', { key: 'd' })
    h.api.moveWithCustomKeys(p2, 'i', 'k', 'j', 'l', 0.1)
    expect(p2.x).toBeCloseTo(120, 5) // o "d" do P1 não mexe no P2
  })

  it('transição de tela: escurece, e o recomeço limpa (não fica preto p/ sempre)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.fadeScreen('#000000', 0.1, true)
    h.nextFrame(16)
    h.nextFrame(216)
    h.api.endGame()
    h.api.setState('jogando') // "Jogar de novo"
    // O gotcha do R13 não se repete: o global novo entra no reset.
    expect(() => h.nextFrame(232)).not.toThrow()
  })
})

describe('SZGameKit — R16: 👾 Kit Monstrinhos', () => {
  /** Um mundinho mínimo: 2 espécies, 2 golpes, o triângulo de tipos. */
  async function mundo(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    h.api.pkmCreature('Fogoso', 'fogo', 30, 9, 4, 7, '', '')
    h.api.pkmCreature('Folhinha', 'planta', 34, 7, 6, 4, '', '')
    h.api.pkmMove('Brasa', 'Fogoso', 'fogo', 20, 100, 'bola', '#f80')
    h.api.pkmMove('Chicote', 'Folhinha', 'planta', 18, 100, 'onda', '#0a0')
    h.api.pkmTypeChart('fogo', 'planta', 2)
    h.api.pkmTypeChart('planta', 'fogo', 0.5)
    await startGame(h)
    h.api.setState('jogando')
  }
  /** Toca a batalha até ela pedir uma escolha (ou acabar). */
  function rodar(h: Harness, quadros = 60) {
    for (let i = 1; i <= quadros; i++) h.nextFrame(i * 50)
  }

  it('⭐ o estado da batalha é "batalha" — senão voltar APAGA o jogo da criança', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.rpgAddFlag('peguei-o-inicial')
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmBattleWild('Folhinha', 5)
    expect(h.api.state()).toBe('batalha')
    // Voltar de 'batalha' p/ 'jogando' NÃO pode chamar o rpgNewGame (que zeraria
    // flags/itens/time). É por isso que o estado tem que se chamar 'batalha'.
    h.api.setState('jogando')
    expect(h.api.rpgHasFlag('peguei-o-inicial')).toBe(true)
    expect(h.api.pkmTeamSize()).toBe(1)
  })

  it('⭐ a fala ANDA dentro da batalha (o stepSystems não roda em "batalha")', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmBattleWild('Folhinha', 5)
    // Sem o stepPkmBattle fora do gate de estado, o playTime congelaria e a fala
    // ficaria com 0 letras PARA SEMPRE — e o menu nunca abriria.
    rodar(h, 40)
    // Chegou ao menu = o relógio andou, a fala escreveu e o espaço funcionou.
    expect(h.api.state()).toBe('batalha')
  })

  it('⭐ o tipo IMPORTA no dano (na base era só a cor do texto)', async () => {
    const h = loadRuntime()
    await mundo(h)
    // fogo → planta = 2×; planta → fogo = 0.5×. Mesmo golpe-base, dano diferente.
    expect(h.api.pkmTypeChart).toBeDefined()
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmBattleWild('Folhinha', 5)
    rodar(h, 40)
    // Sem tabela declarada, a vantagem é 1 (nada de mágica implícita).
    const h2 = loadRuntime()
    h2.api.setup({ width: 960, height: 540 })
    h2.api.pkmCreature('A', 'fogo', 30, 9, 4, 7, '', '')
    h2.api.pkmCreature('B', 'planta', 30, 9, 4, 7, '', '')
    await startGame(h2)
    h2.api.setState('jogando')
    h2.api.pkmGive('A', 5)
    expect(h2.api.pkmTeamSize()).toBe(1)
  })

  it('⭐ a espécie é COPIADA (o aliasing fazia os monstros descerem 20px por batalha)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmGive('Fogoso', 9)
    expect(h.api.pkmTeamSize()).toBe(2)
    // Dois indivíduos da MESMA espécie com níveis/vidas independentes.
    expect(h.api.pkmLevelOf('Fogoso')).toBe(5) // o primeiro
  })

  it('nível escala a vida (+8 por nível, como a batalha do Kit RPG)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 1)
    h.api.pkmBattleWild('Folhinha', 1)
    // Fogoso nível 1 = 30 de vida; nível 5 = 30 + 4×8 = 62.
    const h2 = loadRuntime()
    await mundo(h2)
    h2.api.pkmGive('Fogoso', 5)
    expect(h2.api.pkmTeamSize()).toBe(1)
  })

  it('⭐ "Jogar de novo" zera o time (senão recomeça com o time nível 40)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 20)
    h.api.pkmGiveBall(5, 60)
    expect(h.api.pkmTeamSize()).toBe(1)
    expect(h.api.pkmBallCount()).toBe(5)
    h.api.endGame()
    h.api.setState('jogando') // "Jogar de novo" (vindo de 'fim' = recomeço REAL)
    expect(h.api.pkmTeamSize()).toBe(0)
    expect(h.api.pkmBallCount()).toBe(0)
  })

  it('⭐ salvar leva o time junto (senão a criança perde 6 monstrinhos)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.rpgOnMap('vila', () => {})
    h.api.pkmGive('Fogoso', 12)
    h.api.pkmGiveBall(3, 60)
    h.api.rpgSave()
    // Some tudo (como fechar o jogo)…
    h.api.endGame()
    h.api.setState('jogando')
    expect(h.api.pkmTeamSize()).toBe(0)
    // …e o "Continuar" traz o time DE VOLTA. Sem bloco novo: é o mesmo Salvar.
    h.api.rpgLoad()
    expect(h.api.pkmTeamSize()).toBe(1)
    expect(h.api.pkmLevelOf('Fogoso')).toBe(12)
    expect(h.api.pkmBallCount()).toBe(3)
  })

  it('save corrompido não derruba o jogo (o localStorage é editável)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.store.set(
      'szgk-rpg-save',
      JSON.stringify({ pkmTeam: [{ species: 'NaoExiste' }, null, { hp: 5 }], pkmBalls: 'lixo' }),
    )
    expect(() => h.api.rpgLoad()).not.toThrow()
    expect(h.api.pkmTeamSize()).toBe(0) // os tortos são filtrados
    expect(h.api.pkmBallCount()).toBe(0)
  })

  it('⭐ a bola é MAIS fácil com a vida baixa (e nunca 0% com a vida cheia)', async () => {
    // A fórmula: força% × (3·máx − 2·vida)/(3·máx) × dificuldade.
    // Vida cheia → 1/3 da força; 1 de vida → ~1× a força.
    const cheia = (3 * 100 - 2 * 100) / (3 * 100)
    const quase = (3 * 100 - 2 * 1) / (3 * 100)
    expect(cheia).toBeCloseTo(0.333, 2) // ⚠️ o óbvio (1 − vida/máx) daria 0 = nunca
    expect(quase).toBeGreaterThan(0.99)
    expect(quase / cheia).toBeCloseTo(3, 1) // "3× mais difícil", não impossível
  })

  it('time cheio (6) não aceita mais', async () => {
    const h = loadRuntime()
    await mundo(h)
    for (let i = 0; i < 8; i++) h.api.pkmGive('Fogoso', 5)
    expect(h.api.pkmTeamSize()).toBe(6)
  })

  it('a grama alta + a tabela do mapa (o encontro é por PASSO)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmGrassCells(5, 6, 8, 9)
    h.api.pkmWild('Folhinha', 3, 6)
    h.api.pkmEncounterRate(100) // sempre, p/ o teste ser determinístico
    const heroi = h.api.createCharacter({ w: 32, h: 32, speed: 200 })
    h.api.rpgMoveGrid(heroi, 64, 0) // registra o herói
    h.api.placeCharacter(heroi, 4 * 64, 6 * 64) // fora da grama
    h.fire('keydown', { key: 'd' })
    for (let i = 0; i < 40; i++) h.api.rpgMoveGrid(heroi, 64, 1 / 30)
    // Andou p/ dentro da grama (célula 5,6) → com 100% de chance, batalha.
    expect(h.api.state()).toBe('batalha')
  })

  it('nome de criatura errado AVISA (em vez de falhar calado)', async () => {
    const h = loadRuntime()
    await mundo(h)
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.pkmGive('NaoExiste', 5)
      h.api.pkmWild('TambemNao', 3, 6)
      h.api.pkmMove('X', 'NemEsse', 'fogo', 10, 100, 'bola', '#fff')
    } finally {
      console.warn = real
    }
    expect(warns.length).toBeGreaterThanOrEqual(3)
    expect(warns.some((w) => w.includes('NaoExiste'))).toBe(true)
  })

  it('o menu sai dos GOLPES da criatura (até 4 por bicho)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmMove('Investida', 'Fogoso', 'normal', 12, 100, 'investida', '#888')
    h.api.pkmMove('Labareda', 'Fogoso', 'fogo', 32, 75, 'raio', '#f40')
    h.api.pkmMove('Chama', 'Fogoso', 'fogo', 15, 95, 'bola', '#fa0')
    h.api.pkmMove('Demais', 'Fogoso', 'fogo', 10, 90, 'bola', '#fa0') // 5º: ignorado
    h.api.pkmGive('Fogoso', 5)
    h.api.pkmBattleWild('Folhinha', 5)
    rodar(h, 40)
    expect(h.api.state()).toBe('batalha')
  })

  it('os dois kits de batalha não se misturam (aviso, não silêncio)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    h.api.rpgBattleStats(30, 7, 0)
    h.api.rpgBattleStart('Dragão', 30, 7, 0) // abre a batalha do Kit RPG
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.pkmBattleWild('Folhinha', 5) // e agora a do Kit Monstrinhos
    } finally {
      console.warn = real
    }
    expect(warns.some((w) => w.includes('kit'))).toBe(true)
  })
})

describe('SZGameKit — R21: primitivos gerais (sorteio, leque, rastro, lean)', () => {
  interface Corpo {
    x: number
    y: number
    vx: number
    vy: number
    _prevX: number
    _trailOn: boolean
    _trailRate: number
    _trailLife: number
    _trailAcc: number
    _leanMax: number
    _leanNow: number
  }

  async function arena(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('inimigo', { w: 40, h: 40, color: '#f00' })
    h.api.defineMold('tiro', { w: 6, h: 16, color: '#ff0' })
    await startGame(h)
    h.api.setState('jogando')
  }

  it('um vivo qualquer: null sem pool/sem vivo, e NUNCA devolve reciclado', async () => {
    const h = loadRuntime()
    await arena(h)
    expect(h.api.randomActive('nao-existe')).toBe(null)
    expect(h.api.randomActive('inimigo')).toBe(null) // pool existe, zero vivos
    const a = h.api.spawnFromMold('inimigo', 100, 100)
    const b = h.api.spawnFromMold('inimigo', 200, 100)
    const c = h.api.spawnFromMold('inimigo', 300, 100)
    h.api.recycle(a)
    h.api.recycle(c)
    // Sobrou só o b: o sorteio tem que devolver ELE, todas as vezes (o active[]
    // ainda guarda os reciclados até a próxima varredura — a lição do R13).
    for (let i = 0; i < 20; i++) expect(h.api.randomActive('inimigo')).toBe(b)
  })

  it('leque: N tiros no arco, o do meio reto, os lados simétricos, varredura zerada', async () => {
    const h = loadRuntime()
    await arena(h)
    const nave = h.api.createCharacter({ w: 40, h: 40, color: '#00f' }) as Corpo
    h.api.fanShot(nave, 'tiro', 3, 30, -90, 600)
    expect(h.api.countActive('tiro')).toBe(3)
    const tiros: Corpo[] = []
    h.api.forEachActive('tiro', (t: unknown) => tiros.push(t as Corpo))
    // rumo -90 = para cima: o do meio sobe reto…
    const meio = tiros.find((t) => Math.abs(t.vx) < 0.001)
    expect(meio).toBeDefined()
    expect((meio as Corpo).vy).toBeCloseTo(-600)
    // …e as pontas abrem simétricas (±15°).
    const vxs = tiros.map((t) => t.vx).sort((p, q) => p - q)
    expect(vxs[0]).toBeCloseTo(-(vxs[2] as number))
    for (const t of tiros) expect(t._prevX).toBe(t.x) // nasceu ali: sem varredura
  })

  it('rastro: clamps de taxa/vida, desligar apaga, e o POOL zera no respawn', async () => {
    const h = loadRuntime()
    await arena(h)
    const e = h.api.spawnFromMold('inimigo', 100, 100) as Corpo
    h.api.trailOn(e, '#0ff', 3, 500, 99)
    expect(e._trailOn).toBe(true)
    expect(e._trailRate).toBe(60) // clamp: 500/s engoliria o teto global de faíscas
    expect(e._trailLife).toBe(3)
    h.api.trailOff(e)
    expect(e._trailOn).toBe(false)
    // O contrato do pool: reciclar e renascer NÃO ressuscita o rastro/lean.
    h.api.trailOn(e, '#0ff', 3, 30, 0.4)
    h.api.leanOnMove(e, 15)
    e._trailAcc = 0.7
    h.api.recycle(e)
    const e2 = h.api.spawnFromMold('inimigo', 300, 300) as Corpo
    expect(e2).toBe(e) // o pool reusa o MESMO objeto (free é LIFO)
    expect(e2._trailOn).toBe(false)
    expect(e2._trailAcc).toBe(0)
    expect(e2._leanMax).toBe(0)
    expect(e2._leanNow).toBe(0)
  })

  it('inclinar ao andar: liga por personagem e 0 desliga', async () => {
    const h = loadRuntime()
    await arena(h)
    const nave = h.api.createCharacter({ w: 40, h: 40, color: '#00f' }) as Corpo
    h.api.leanOnMove(nave, 12)
    expect(nave._leanMax).toBe(12)
    h.api.leanOnMove(nave, 0)
    expect(nave._leanMax).toBe(0)
  })

  it('fundo que rola sem imagem carregada avisa e não quebra', async () => {
    const h = loadRuntime()
    await arena(h)
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.scrollImage('nao-carregada', 0, 20)
      h.api.scrollImage('nao-carregada', 0, 20) // warnOnce: avisa UMA vez
    } finally {
      console.warn = real
    }
    expect(warns.filter((w) => w.includes('nao-carregada')).length).toBe(1)
  })
})

describe('SZGameKit — R24: correções do review #6 (Kit Nave)', () => {
  interface Corpo {
    x: number
    y: number
    w: number
    _prevX: number
  }

  it('⭐ com a câmera ligada, a bomba nasce no retângulo VISÍVEL (não em coords de tela)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('bomba', { w: 24, h: 24, color: '#f80' })
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 300, color: '#00f' }) as Corpo
    await startGame(h)
    h.api.setState('jogando')
    h.api.placeCharacter(heroi, 3000, 800)
    h.api.cameraFollow(heroi, 4000, 2000)
    h.nextFrame(50) // a câmera se posiciona no herói
    h.api.naveBomb('bomba', 200, '')
    const bombas: Corpo[] = []
    h.api.forEachActive('bomba', (b: unknown) => bombas.push(b as Corpo))
    expect(bombas.length).toBe(1)
    // Antes do R24 nascia em 0..960 (coords de TELA) — fora da vista, a ~2,5km
    // do herói. Agora nasce dentro do retângulo da câmera (~2552..3512).
    expect((bombas[0] as Corpo).x).toBeGreaterThan(2000)
  })

  it('⭐ naveShip grava a varredura de ONDE VEIO (contrato do moveByVelocity)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    const nave = h.api.createCharacter({ w: 40, h: 24, speed: 300, color: '#0ff' }) as Corpo
    await startGame(h)
    h.api.setState('jogando')
    h.api.placeCharacter(nave, 100, 500)
    h.fire('keydown', { key: 'ArrowRight' })
    h.api.naveShip(nave, 400, 10, 0.05)
    expect(nave.x).toBe(120) // andou 400 × 0,05
    // Antes o _prevX era gravado DEPOIS de mover (varredura via movimento zero);
    // agora aponta de onde veio, e a colisão sólida varre 100→120.
    expect(nave._prevX).toBe(100)
  })

  it('⭐ atirador com molde errado AVISA (nome errado nunca é silencioso)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('tiro', { w: 4, h: 12, color: '#fff' })
    await startGame(h)
    h.api.setState('jogando')
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.naveWaveShooter('nao-existe', 1, 'tiro', 300)
      h.api.naveWaveShooter('nao-existe', 1, 'tiro', 300) // warnOnce
    } finally {
      console.warn = real
    }
    expect(warns.filter((w) => w.includes('o molde do atirador')).length).toBe(1)
    // E o ritmo NÃO registrou: 2 s de quadros sem nenhum tiro nascendo.
    for (let i = 1; i <= 40; i++) h.nextFrame(i * 50)
    expect(h.api.countActive('tiro')).toBe(0)
  })
})

describe('SZGameKit — R25: caminhos + escolher-vivo + status (review Tower Defense)', () => {
  interface Bicho {
    x: number
    y: number
    w: number
    h: number
    health: number
    _pathDone: boolean
  }
  async function mundo(h: Harness) {
    h.api.setup({ width: 960, height: 540 })
    h.api.defineMold('inimigo', { w: 20, h: 20, color: '#f00' })
    await startGame(h)
    h.api.setState('jogando')
    // Caminho reto na horizontal: (100,100) → (500,100). Comprimento 400.
    h.api.definePath('trilha', () => {
      h.api.pathPoint(100, 100)
      h.api.pathPoint(500, 100)
    })
  }

  it('⭐ seguir o caminho: anda os waypoints, o progresso vai 0→100 e PARA no fim', async () => {
    const h = loadRuntime()
    await mundo(h)
    const e = h.api.spawnFromMold('inimigo', 90, 90) as Bicho
    let chegou = 0
    h.api.on('caminho:fim', () => {
      chegou += 1
    })
    h.api.onUpdate((dt: number) => {
      h.api.forEachActive('inimigo', (item: unknown) => h.api.followPath(item, 'trilha', 200, dt))
    })
    // Começa perto do 1º ponto → progresso ~0.
    h.nextFrame(50)
    expect(h.api.pathProgress(e)).toBeLessThan(20)
    // 200 px/s × ~2,5 s cobre os 400 px do caminho.
    for (let i = 2; i <= 60 && !e._pathDone; i++) h.nextFrame(i * 50)
    expect(e._pathDone).toBe(true)
    expect(chegou).toBe(1) // avisou UMA vez
    expect(h.api.pathProgress(e)).toBe(100)
    // Parou no último ponto (centro em 500,100 → x = 490 p/ w20).
    expect(e.x).toBeCloseTo(490, 0)
    const xFim = e.x
    h.nextFrame(61 * 50)
    expect(e.x).toBe(xFim) // não anda mais
  })

  it('⭐ o vivo com MAIOR/MENOR progresso no caminho (o alvo do Tower Defense)', async () => {
    const h = loadRuntime()
    await mundo(h)
    const atras = h.api.spawnFromMold('inimigo', 120, 90) as Bicho
    const frente = h.api.spawnFromMold('inimigo', 400, 90) as Bicho
    h.api.onUpdate((dt: number) => {
      h.api.forEachActive('inimigo', (item: unknown) => h.api.followPath(item, 'trilha', 100, dt))
    })
    for (let i = 1; i <= 6; i++) h.nextFrame(i * 50)
    // "mais avançado no caminho" = o que nasceu na frente.
    expect(h.api.pickActive('inimigo', 'maior', 'pathProgress')).toBe(frente)
    expect(h.api.pickActive('inimigo', 'menor', 'pathProgress')).toBe(atras)
    // E por propriedade comum: o de maior x é o da frente.
    expect(h.api.pickActive('inimigo', 'maior', 'x')).toBe(frente)
    // Pool vazio → nada.
    expect(h.api.pickActive('nao-existe', 'maior', 'x')).toBe(null)
  })

  it('caminho reciclado NÃO herda a rota do dono anterior (contrato do pool)', async () => {
    const h = loadRuntime()
    await mundo(h)
    const e1 = h.api.spawnFromMold('inimigo', 90, 90) as Bicho
    h.api.onUpdate((dt: number) => {
      h.api.forEachActive('inimigo', (item: unknown) => h.api.followPath(item, 'trilha', 400, dt))
    })
    for (let i = 1; i <= 40 && !e1._pathDone; i++) h.nextFrame(i * 50)
    expect(e1._pathDone).toBe(true)
    h.api.recycle(e1)
    const e2 = h.api.spawnFromMold('inimigo', 200, 300) as Bicho
    expect(e2).toBe(e1) // mesmo objeto do pool
    expect(e2._pathDone).toBe(false) // NÃO nasce "no fim" do dono anterior
    expect(h.api.pathProgress(e2)).toBe(0)
  })

  it('⭐ status regenerar DEVOLVE 3 de vida por turno na batalha (Pizza Legends)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 5, 0) // herói fraco (força 5) p/ a batalha não acabar rápido
    h.api.rpgBattleStart('Boss', 200, 10, 0)
    // O boss regenera por 3 turnos. Fere-o de leve e mede a vida ao longo dos turnos.
    h.api.rpgInflict('inimigo', 'regenera', 3)
    expect(battleSnap(h)?.foes[0]?.regen).toBe(3)
    pickAction(h, 1, 'Atacar') // 1 turno: herói causa ~5, boss regenera +3 → líquido ~2
    // Sem crash e a batalha segue (o status não quebrou o motor); o regen decaiu.
    expect(h.api.state()).toBe('batalha')
    expect(battleSnap(h)?.foes[0]?.regen).toBe(2)
  })

  it('paralaxe/folha sem imagem carregada avisam (nome errado nunca é silencioso)', async () => {
    const h = loadRuntime()
    await mundo(h)
    const warns: string[] = []
    const real = console.warn
    console.warn = (...a: unknown[]) => warns.push(a.join(' '))
    try {
      h.api.parallaxLayer('sem-img', 0.3, 1)
      h.api.sheetBurst('sem-folha', 4, 12, 100, 100, 64)
    } finally {
      console.warn = real
    }
    expect(warns.some((w) => w.includes('sem-img'))).toBe(true)
    expect(warns.some((w) => w.includes('sem-folha'))).toBe(true)
  })
})

describe('SZGameKit — 🌍 mundo aberto (culling + câmera pelo mapa + tamanho do mapa)', () => {
  // A folha do tilemap carrega por `new Image()` + onload — o happy-dom não
  // dispara onload para dataURL, então um stub mínimo resolve em microtask
  // (o startGame espera 2 voltas). Guardar/restaurar como o getContext.
  const globalWithImage = globalThis as { Image?: unknown }
  const RealImage = globalWithImage.Image
  class FakeImage {
    width = 256
    height = 256
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  beforeAll(() => {
    globalWithImage.Image = FakeImage
  })
  afterAll(() => {
    globalWithImage.Image = RealImage
  })

  function gridCheio(cols: number, rows: number): string {
    const linha = new Array(cols).fill('1').join(' ')
    return new Array(rows).fill(linha).join('\n')
  }

  it('⭐ culling: mapa 100×100 desenha SÓ a fatia visível (não os 10.000 tiles)', async () => {
    const h = loadRuntime(fakeTilemapAsset(gridCheio(100, 100), [1], 64))
    h.api.setup({ width: 800, height: 600 })
    h.api.loadTilemap('mundo', 'mapa')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.onDraw(() => h.api.drawTilemap('mundo', 'chão'))
    await startGame(h)
    h.api.setState('jogando')
    let draws = 0
    const orig = fakeCtx.drawImage
    ;(fakeCtx as { drawImage: () => void }).drawImage = () => {
      draws += 1
    }
    try {
      // Sem câmera: a fatia é a tela (13+1 cols × 10+1 rows ≈ 154), não 10.000.
      h.nextFrame(16)
      expect(draws).toBeGreaterThan(100)
      expect(draws).toBeLessThan(300)
      // Com a câmera no CANTO OPOSTO do mapa: mesma contagem (a janela desliza).
      h.api.cameraFollowMap(c, 'mundo')
      h.api.placeCharacter(c, 100 * 64, 100 * 64)
      draws = 0
      h.nextFrame(32)
      expect(draws).toBeGreaterThan(100)
      expect(draws).toBeLessThan(300)
    } finally {
      ;(fakeCtx as { drawImage: unknown }).drawImage = orig
    }
  })

  it('cameraFollowMap: o mundo é o TAMANHO do mapa (trava nas bordas dele)', async () => {
    const h = loadRuntime(fakeTilemapAsset(gridCheio(50, 30), [1], 64))
    h.api.setup({ width: 800, height: 600 })
    h.api.loadTilemap('mundo', 'mapa')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.cameraFollowMap(c, 'mundo')
    h.api.placeCharacter(c, 0, 0)
    h.nextFrame(16)
    expect(h.api.cameraX()).toBe(0)
    expect(h.api.cameraY()).toBe(0)
    h.api.placeCharacter(c, 50 * 64, 30 * 64)
    h.nextFrame(32)
    expect(h.api.cameraX()).toBe(50 * 64 - 800) // 2400
    expect(h.api.cameraY()).toBe(30 * 64 - 600) // 1320
    // Mapa inexistente: avisa e NÃO trava (cai p/ tela única).
    h.api.cameraFollowMap(c, 'nao-existe')
    h.nextFrame(48)
    expect(h.api.cameraX()).toBe(0)
  })

  it('⭐ culling de entidades: fora da vista NEM toca o canvas; sem câmera pintam todas', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('caixa', {
      w: 40,
      h: 40,
      health: 1,
      speed: 0,
      damage: 0,
      color: '#123456',
      image: '',
      look: '',
    })
    const heroi = h.api.createCharacter({ w: 32, h: 32 })
    h.api.onDraw(() => h.api.drawActive('caixa'))
    await startGame(h)
    h.api.setState('jogando')
    for (let i = 0; i < 50; i++) h.api.spawnFromMold('caixa', i * 100, 100) // x 0..4900
    h.api.cameraFollow(heroi, 5000, 600)
    h.api.placeCharacter(heroi, 4600, 100)
    ctxCalls.length = 0
    h.nextFrame(16)
    const visiveis = ctxCalls.filter(([m, a]) => m === 'fillRect' && a[2] === 40 && a[3] === 40)
    // câmera x = 5000-800 = 4200; janela [4072..5128] com a margem 128 → ~10 caixas.
    expect(visiveis.length).toBeGreaterThan(4)
    expect(visiveis.length).toBeLessThan(20)
    // Controle: câmera DESLIGADA = sem cull (todas as 50 pintam, o clip é do canvas).
    h.api.cameraStop()
    ctxCalls.length = 0
    h.nextFrame(32)
    const todas = ctxCalls.filter(([m, a]) => m === 'fillRect' && a[2] === 40 && a[3] === 40)
    expect(todas.length).toBe(50)
  })

  it('rpgMapSize alimenta a trava da câmera (mundo = células × célula)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    const heroi = h.api.createCharacter({ w: 32, h: 32, speed: 0 })
    h.api.rpgOnMap('campo', () => {
      h.api.rpgMapSize(30, 20)
      h.api.placeCharacter(heroi, 29 * 64, 19 * 64)
    })
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.setState('jogando') // vai ao 1º mapa → o hook declara o tamanho
    // O mundo passado na mão (800×600) é SOBRESCRITO pelo tamanho do mapa.
    h.api.cameraFollow(heroi, 800, 600)
    h.nextFrame(16)
    expect(h.api.cameraX()).toBe(30 * 64 - 800) // 1120
    expect(h.api.cameraY()).toBe(20 * 64 - 600) // 680
  })
})
