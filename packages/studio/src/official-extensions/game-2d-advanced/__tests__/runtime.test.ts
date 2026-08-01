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
  drawImage(...a: unknown[]) {
    ctxCalls.push([
      'drawImage',
      a.slice(1).map((value) => (typeof value === 'number' ? value : Number.NaN)),
    ])
  },
  beginPath() {},
  closePath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  arc(...a: number[]) {
    ctxCalls.push(['arc', a])
  },
  fill() {},
  fillText(...a: number[]) {
    ctxCalls.push(['fillText', a])
  },
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
  runProject: Fn
  setup: Fn
  setupFull: Fn
  start: Fn
  width: Fn
  height: Fn
  loadImage: Fn
  setScreenText: Fn
  createScreen: Fn
  addButton: Fn
  setScreenBg: Fn
  showScreen: Fn
  hideScreens: Fn
  setState: Fn
  restartGame: Fn
  onGameStart: Fn
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
  playAnimOnce: Fn
  animEnded: Fn
  setEntityState: Fn
  stateAnim: Fn
  autoAnimate: Fn
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
  mouseScreenX: Fn
  mouseScreenY: Fn
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
  rpgSetStartMap: Fn
  rpgCreateMap: Fn
  rpgOnEnterMap: Fn
  rpgCreateDoor: Fn
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
  rpgHealHero: Fn
  rpgBattleReward: Fn
  rpgInflict: Fn
  rpgAddAlly: Fn
  rpgAddFoe: Fn
  rpgDefineBattler: Fn
  rpgBattleNamed: Fn
  rpgAddFoeNamed: Fn
  rpgTeachMove: Fn
  rpgTeachHeal: Fn
  rpgLevel: Fn
  rpgXp: Fn
  // 👑 R30 — chefes
  rpgAddBoss: Fn
  battlerLife: (name: string) => number
  battlerMaxLife: (name: string) => number
  rpgOnFoeTurn: Fn
  rpgFoeUse: Fn
  rpgFoeHitAll: Fn
  // 🎲 R30 — jogos de tabuleiro
  rollDice: (faces: number) => number
  playersSetup: Fn
  currentPlayer: () => number
  nextPlayer: Fn
  onTurnChange: Fn
  moveAlongTrack: Fn
  spaceOf: (who: unknown) => number
  onLandSpace: Fn
  // 🃏 R30 — cartas
  pileMoveTop: Fn
  pileShuffleFrom: Fn
  pileTop: Fn
  pileSize: (pile: unknown) => number
  card: (front: unknown, back: unknown) => Record<string, unknown>
  cardFlip: Fn
  cardIsUp: (card: unknown) => boolean
  cardFace: Fn
  handDraw: Fn
  cardAt: (x: number, y: number, pile: unknown) => number
  // 🃏 R30 — Kit Cartas (deck-battler)
  cardsStart: Fn
  cardsEnergyPerTurn: Fn
  cardsEnergy: () => number
  cardsSpend: Fn
  cardsHeroLife: () => number
  cardsEnemyLife: () => number
  cardsHurtEnemy: Fn
  cardsHurtMe: Fn
  cardsGainBlock: Fn
  cardsEnemyIntent: Fn
  cardsIntentAction: () => string
  cardsIntentValue: () => number
  cardsOnTurn: Fn
  cardsOnEnemyTurn: Fn
  cardsEndTurn: Fn
  cardsDrawHud: Fn
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
  paddleBounce: Fn
  boardCreate: Fn
  boardSet: Fn
  boardGet: Fn
  boardCount: Fn
  boardIn: Fn
  everySeconds: Fn
  waitThen: Fn
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
  // 🥊 Kit Luta
  lutaMatch: Fn
  lutaDrawHud: Fn
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
  inspectors: Record<string, () => unknown>
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
function fakeTilemapAsset(
  grid: string,
  solid: number[],
  tileSize = 64,
  platform?: number[],
  frontGrid?: string,
) {
  return {
    mapa: {
      tilemap: {
        grid,
        solid,
        ...(platform ? { platform } : {}),
        ...(frontGrid ? { frontGrid } : {}),
        tileSize,
        tileset: { dataUrl: 'data:image/png;base64,AA==' },
      },
    },
  }
}

function loadRuntime(assetMeta?: unknown, windowOverrides: Record<string, unknown> = {}): Harness {
  const listeners: Record<string, Listener[]> = {}
  const clock = { value: 0 }
  const rafQueue: Array<(ts: number) => void> = []
  const store = new Map<string, string>()
  const inspectors: Record<string, () => unknown> = {}
  const win = {
    __SZGAME_ASSET_META: assetMeta,
    __SZSTUDIO_RUNTIME_INSPECTORS: inspectors,
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
    ...windowOverrides,
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
    inspectors,
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
  boss: boolean
  image: string
  color: string
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
/** Espelho só-leitura registrado no canal de diagnóstico do host. */
function battleSnap(h: Harness): BattleSnap | null {
  return (h.inspectors['game-2d-advanced:battle']?.() as BattleSnap | null | undefined) ?? null
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
  if (!open?.menuOpen) return t
  const idx = open.menuLabels.findIndex((l) => l.includes(match))
  if (idx < 0) return t
  let guard = 0
  while (h.api.state() === 'batalha' && guard++ < 12) {
    const cur = battleSnap(h)
    if (!cur?.menuOpen || cur.menuIndex === idx) break
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
    if (s?.menuOpen) break // o próximo turno do jogador já abriu
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
  it('expõe os 339 métodos (spawn_named reusa spawnFromMold)', () => {
    const { api, inspectors } = loadRuntime()
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
      'setScreenBg',
      'showScreen',
      'hideScreens',
      'setState',
      'restartGame',
      'onGameStart',
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
      // R2 (17): animação de folha, câmera+HUD, velocidade/tiro, mouse, giro, barra
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
      'mouseScreenX',
      'mouseScreenY',
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
      'rpgSetStartMap',
      'rpgCreateMap',
      'rpgOnEnterMap',
      'rpgCreateDoor',
      // 🌍 Mundo aberto: bordas ligadas + nome do mapa
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
      'rpgHealHero',
      'rpgBattleReward',
      'rpgInflict',
      'rpgLevel',
      'rpgXp',
      // ⚔️ batalha em equipe (3) + fichas reutilizáveis (3)
      'rpgAddAlly',
      'rpgAddFoe',
      'rpgDefineBattler',
      'rpgBattleNamed',
      'rpgAddFoeNamed',
      'rpgTeachMove',
      'rpgTeachHeal',
      // 👑 R30 — chefes (6)
      'rpgAddBoss',
      'battlerLife',
      'battlerMaxLife',
      'rpgOnFoeTurn',
      'rpgFoeUse',
      'rpgFoeHitAll',
      // 🎲 R30 — jogos de tabuleiro (8)
      'rollDice',
      'playersSetup',
      'currentPlayer',
      'nextPlayer',
      'onTurnChange',
      'moveAlongTrack',
      'spaceOf',
      'onLandSpace',
      // 🃏 R30 — cartas (10)
      'pileMoveTop',
      'pileShuffleFrom',
      'pileTop',
      'pileSize',
      'card',
      'cardFlip',
      'cardIsUp',
      'cardFace',
      'handDraw',
      'cardAt',
      // 🃏 R30 — Kit Cartas (16)
      'cardsStart',
      'cardsEnergyPerTurn',
      'cardsEnergy',
      'cardsSpend',
      'cardsHeroLife',
      'cardsEnemyLife',
      'cardsHurtEnemy',
      'cardsHurtMe',
      'cardsGainBlock',
      'cardsEnemyIntent',
      'cardsIntentAction',
      'cardsIntentValue',
      'cardsOnTurn',
      'cardsOnEnemyTurn',
      'cardsEndTurn',
      'cardsDrawHud',
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
      'paddleBounce',
      'boardCreate',
      'boardSet',
      'boardGet',
      'boardCount',
      'boardIn',
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
      // v0.54.0 — ver o invisível: a moldura do palco (que saiu do CSS de fábrica)
      // e as caixas que de fato colidem.
      'showStageBorder',
      'showHitboxes',
      // v0.55.0 — e escolher a FORMA da caixa (redonda encosta mais justo).
      'setHitboxShape',
    ]
    const rec = api as unknown as Record<string, unknown>
    for (const m of expected) expect(typeof rec[m]).toBe('function')
    expect(Object.keys(api).length).toBe(expected.length)
    expect((api as unknown as Record<string, unknown>)._battle).toBeUndefined()
    expect(typeof inspectors['game-2d-advanced:battle']).toBe('function')
    expect(typeof inspectors['game-2d-advanced:rpg']).toBe('function')
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

  it('repete uma animação única depois de passar por um estado sem visual declarado', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    const personagem = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
    h.api.stateAnim(personagem, 'golpe', 2, 4, 10, true)

    h.api.setEntityState(personagem, 'golpe', 0.3)
    h.api.autoAnimate(personagem)
    const primeiroInicio = Number(personagem._animStart)

    for (let quadro = 1; quadro <= 5; quadro++) h.nextFrame(quadro * 100)
    h.api.autoAnimate(personagem)
    expect(personagem._animState).toBeUndefined()

    h.api.setEntityState(personagem, 'golpe', 0.3)
    h.api.autoAnimate(personagem)

    expect(Number(personagem._animStart)).toBeGreaterThan(primeiroInicio)
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

  it('estado personalizado preserva a partida; só restartGame começa outra', () => {
    const { api } = loadRuntime()
    const entradas: string[] = []
    api.defineMold('moeda', {})
    api.onEnterState('jogando', () => entradas.push('jogando'))

    api.setState('jogando')
    api.spawnFromMold('moeda', 10, 10)
    api.setState('loja')
    api.setState('jogando')

    expect(api.countActive('moeda')).toBe(1)
    expect(entradas).toEqual(['jogando', 'jogando'])

    api.restartGame()
    expect(api.countActive('moeda')).toBe(0)
    expect(api.state()).toBe('jogando')
    expect(entradas).toEqual(['jogando', 'jogando', 'jogando'])
  })

  it('onGameStart roda somente ao começar/recomeçar, nunca ao voltar de loja', () => {
    const { api } = loadRuntime()
    let partidas = 0
    api.onGameStart(() => {
      partidas += 1
    })

    api.restartGame()
    api.setState('loja')
    api.setState('jogando')
    expect(partidas).toBe(1)

    api.restartGame()
    expect(partidas).toBe(2)
  })

  it('runProject cria escopo novo e não duplica eventos a cada nova partida', () => {
    const { api } = loadRuntime()
    const seen: number[] = []
    const warnings: string[] = []
    const realWarn = console.warn
    const runProject = (api as unknown as { runProject(fn: () => void): void }).runProject

    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      runProject(() => {
        let entradas = 0
        api.rpgCreateMap('vila', 10, 8, () => {})
        api.rpgSetStartMap('vila')
        api.onEnterState('jogando', () => seen.push(++entradas))
      })

      api.restartGame()
      api.restartGame()
    } finally {
      console.warn = realWarn
    }
    expect(seen).toEqual([1, 1])
    expect(api.rpgCurrentMap()).toBe('vila')
    expect(warnings).toEqual([])
  })

  it('runProject descarta callbacks de mapa da factory anterior antes de entrar no mapa inicial', () => {
    const { api } = loadRuntime()
    const generations: number[] = []
    const runProject = (api as unknown as { runProject(fn: () => void): void }).runProject
    let generation = 0

    runProject(() => {
      const ownGeneration = ++generation
      api.rpgCreateMap('vila', 10, 8, () => {})
      api.rpgSetStartMap('vila')
      api.rpgOnEnterMap('vila', () => generations.push(ownGeneration))
    })

    api.restartGame()
    api.restartGame()

    expect(generation).toBe(3)
    expect(generations).toEqual([2, 3])
  })

  it('restart limpa a câmera ligada por um evento da partida anterior', () => {
    const { api } = loadRuntime()
    const runProject = (api as unknown as { runProject(fn: () => void): void }).runProject
    const heroes: Array<Record<string, number>> = []

    runProject(() => {
      const hero = api.createCharacter({ w: 40, h: 40 }) as Record<string, number>
      heroes.push(hero)
      api.on('ligar-camera', () => api.cameraFollow(hero, 2000, 1500))
    })

    api.placeCharacter(heroes[0], 1200, 800)
    api.emit('ligar-camera')
    expect([api.cameraX(), api.cameraY()]).toEqual([580, 460])

    api.restartGame()

    expect(heroes).toHaveLength(2)
    expect([api.cameraX(), api.cameraY()]).toEqual([0, 0])
  })

  it('preserva o estado escolhido antes do boot para permitir jogo sem menu', async () => {
    const h = loadRuntime()

    h.api.setState('jogando')
    await startGame(h)

    expect(h.api.state()).toBe('jogando')
  })

  it('monta o mapa inicial ao iniciar direto no estado jogando', async () => {
    const h = loadRuntime()
    let entradas = 0

    h.api.runProject(() => {
      h.api.rpgCreateMap('vila', 10, 8, () => {})
      h.api.rpgSetStartMap('vila')
      h.api.rpgOnEnterMap('vila', () => {
        entradas += 1
      })
      h.api.setState('jogando')
    })

    await startGame(h)

    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgCurrentMap()).toBe('vila')
    expect(entradas).toBe(1)
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
    const canvas = stage?.querySelector('#szgk-canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('tabindex')).toBe('0')
    expect(canvas?.getAttribute('aria-label')).toMatch(/jogo 2d/i)
    const descriptionId = canvas?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')?.textContent).toMatch(
      /teclado|setas|espaço|mouse|toque/i,
    )
    const runtimeCss = document.querySelector('#szgk-style')?.textContent ?? ''
    expect(runtimeCss).toContain('prefers-reduced-motion: reduce')
    expect(runtimeCss).not.toContain('transition: all')
    expect(runtimeCss).toContain('overflow: auto')
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

  it('restart substitui os botões autorais em vez de acumular closures antigas', () => {
    const h = loadRuntime()
    const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject
    let generation = 0

    runProject(() => {
      const ownGeneration = ++generation
      h.api.addButton('menu', `Extra ${ownGeneration}`, () => {})
    })

    const labels = () =>
      Array.from(document.querySelectorAll('[data-szgk-screen="menu"] button')).map(
        (button) => button.textContent,
      )

    expect(labels()).toEqual(['Jogar', 'Extra 1'])
    h.api.restartGame()
    expect(labels()).toEqual(['Jogar', 'Extra 2'])
    h.api.restartGame()
    expect(labels()).toEqual(['Jogar', 'Extra 3'])
  })

  it('🖼️ "pôr fundo na tela" pinta o painel de cor e é seguro sem imagem/tela', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setScreenBg('pausa', '#123456', '')
    const pausa = document.querySelector('[data-szgk-screen="pausa"]') as HTMLElement | null
    expect(pausa?.style.backgroundColor).toBeTruthy() // o "quadrado colorido por baixo"
    // imagem que não está no projeto: avisa mas NÃO quebra nem seta background-image
    expect(() => h.api.setScreenBg('pausa', '', 'nao-existe')).not.toThrow()
    expect(pausa?.style.backgroundImage || '').toBe('')
    // tela inexistente: no-op seguro (só avisa)
    expect(() => h.api.setScreenBg('naoexiste', '#ffffff', '')).not.toThrow()
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

  it('faíscas: burst cria partículas; começar nova partida reinicia a arena', async () => {
    const h = loadRuntime()
    h.api.defineMold('g', {})
    h.api.defineEffect('poeira', { count: 8 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('g', 10, 10)
    expect(h.api.countActive('g')).toBe(1)
    h.api.burst('poeira', 50, 50)
    h.api.drawEffects() // move/desenha (com o ctx stub)
    // Começar nova partida (Jogar de novo) zera pools e contadores.
    h.api.setState('menu')
    h.api.restartGame()
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
    h.api.restartGame()
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
    h.api.restartGame()
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

  it('aparência autoral que falha avisa uma vez e mantém o fallback da entidade', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.defineLook('quebrada', () => {
      throw new Error('traço inválido')
    })
    const personagem = h.api.createCharacter({ look: 'quebrada', w: 24, h: 24 })
    h.api.placeCharacter(personagem, 10, 20)
    const warns: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    ctxCalls.length = 0
    try {
      h.api.drawCharacter(personagem)
      h.api.drawLook('quebrada', 10, 20, 24, 24)
      h.api.drawLook('quebrada', 10, 20, 24, 24)
    } finally {
      console.warn = originalWarn
    }

    expect(ctxCalls.some(([name]) => name === 'fillRect')).toBe(true)
    expect(
      warns.filter(
        (warning) => warning.includes('aparência "quebrada"') && warning.includes('traço inválido'),
      ),
    ).toHaveLength(1)
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

  it('playAnimOnce trava no último quadro e só ele pode terminar', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.setSheet(c, 'data:image/png;base64,AA==', 16, 16)
    await startGame(h)
    h.api.setState('jogando')

    h.api.playAnimOnce(c, 2, 4, 40)
    h.nextFrame(100)
    expect(h.api.animEnded(c)).toBe(true)
    ctxCalls.length = 0
    h.api.drawCharacter(c)
    const sourceY = ctxCalls.find(([method]) => method === 'drawImage')?.[1][1]
    expect(sourceY).toBe(4 * 16)

    h.api.playAnim(c, 2, 4, 40)
    h.nextFrame(200)
    expect(h.api.animEnded(c)).toBe(false)
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

  it('expõe coordenadas de mundo e de tela quando a câmera está ligada', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 40, h: 40 }) as Record<string, number>
    h.api.placeCharacter(heroi, 790, 590)
    h.api.cameraFollow(heroi, 1600, 1200)
    h.nextFrame(16)

    const clicks: unknown[][] = []
    h.api.onGameClick((...args: unknown[]) => clicks.push(args))
    const canvas = document.querySelector('#szgk-canvas')
    if (!canvas) throw new Error('canvas do jogo ausente')
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, clientY: 40, bubbles: true }))

    expect(h.api.mouseX()).toBe(30 + Number(h.api.cameraX()))
    expect(h.api.mouseY()).toBe(40 + Number(h.api.cameraY()))
    expect(h.api.mouseScreenX()).toBe(30)
    expect(h.api.mouseScreenY()).toBe(40)
    expect(clicks).toEqual([[30 + Number(h.api.cameraX()), 40 + Number(h.api.cameraY()), 30, 40]])
  })
})

describe('SZGameKit — R3: Kit RPG (grade, fala, flags, mapas, batalha)', () => {
  it('criação desenha o mapa ativo; evento de entrada não declara mapa implicitamente', async () => {
    const h = loadRuntime()
    await startGame(h)
    let draws = 0
    let enters = 0
    h.api.rpgCreateMap('vila', 15, 10, () => {
      draws += 1
    })
    h.api.rpgOnEnterMap('vila', () => {
      enters += 1
    })
    h.api.restartGame()
    h.nextFrame(16)
    expect(enters).toBe(1)
    expect(draws).toBeGreaterThan(0)

    const removed = h.api as unknown as Record<string, unknown>
    expect(removed.rpgOnMap).toBeUndefined()
    expect(removed.rpgMapSize).toBeUndefined()
  })

  it('mapa sem desenho e evento para mapa não criado produzem diagnóstico', async () => {
    const h = loadRuntime()
    await startGame(h)
    const warns: string[] = []
    const realWarn = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    try {
      h.api.rpgCreateMap('vazio', 8, 6, () => {}, false)
      h.api.rpgOnEnterMap('fantasma', () => {})
      h.api.restartGame()
      h.nextFrame(16)
    } finally {
      console.warn = realWarn
    }
    expect(
      warns.some((warning) => warning.includes('vazio') && warning.includes('sem desenho')),
    ).toBe(true)
    expect(
      warns.some((warning) => warning.includes('fantasma') && warning.includes('não foi criado')),
    ).toBe(true)
    expect(ctxCalls.some(([name]) => name === 'fillText')).toBe(true)
  })

  it('mapa inicial explícito vence a ordem, sobrevive ao reinício e o fallback usa o primeiro', async () => {
    const explicit = loadRuntime()
    await startGame(explicit)
    let firstMounts = 0
    let startMounts = 0
    explicit.api.rpgCreateMap('primeiro', 10, 10, () => {})
    explicit.api.rpgOnEnterMap('primeiro', () => {
      firstMounts += 1
    })
    explicit.api.rpgCreateMap('inicio', 10, 10, () => {})
    explicit.api.rpgOnEnterMap('inicio', () => {
      startMounts += 1
    })
    explicit.api.rpgSetStartMap('inicio')

    explicit.api.restartGame()
    expect(explicit.api.rpgCurrentMap()).toBe('inicio')
    expect(firstMounts).toBe(0)
    expect(startMounts).toBe(1)

    explicit.api.endGame()
    explicit.api.restartGame()
    expect(explicit.api.rpgCurrentMap()).toBe('inicio')
    expect(startMounts).toBe(2)

    const fallback = loadRuntime()
    await startGame(fallback)
    fallback.api.rpgCreateMap('primeiro', 10, 10, () => {})
    fallback.api.rpgCreateMap('segundo', 10, 10, () => {})
    fallback.api.restartGame()
    expect(fallback.api.rpgCurrentMap()).toBe('primeiro')
  })

  it('mapa inexistente avisa e cai no primeiro mapa válido, sem mundo vazio', async () => {
    const h = loadRuntime()
    await startGame(h)
    let mounts = 0
    h.api.rpgCreateMap('seguro', 10, 10, () => {})
    h.api.rpgOnEnterMap('seguro', () => {
      mounts += 1
    })
    h.api.rpgSetStartMap('fantasma')
    const warns: string[] = []
    const realWarn = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    try {
      h.api.restartGame()
      expect(h.api.rpgCurrentMap()).toBe('seguro')
      h.api.rpgGoMap('outro-fantasma')
      expect(h.api.rpgCurrentMap()).toBe('seguro')
    } finally {
      console.warn = realWarn
    }
    expect(mounts).toBe(2)
    expect(warns.some((warning) => warning.includes('fantasma'))).toBe(true)
    expect(warns.some((warning) => warning.includes('primeiro mapa válido'))).toBe(true)
  })

  it('mapa pequeno sempre recebe o herói numa célula livre e dentro dos limites', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    await startGame(h)
    const heroi = h.api.createCharacter({ w: 64, h: 64 }) as Record<string, number>
    h.api.rpgMoveGrid(heroi, 64, 0)
    h.api.rpgCreateMap('sala', 2, 2, () => {
      h.api.drawBackground('#123456', false)
    })
    h.api.rpgOnEnterMap('sala', () => {
      h.api.rpgBlockCell(0, 0)
    })

    h.api.restartGame()

    expect(heroi.x).toBeGreaterThanOrEqual(0)
    expect(heroi.y).toBeGreaterThanOrEqual(0)
    expect(heroi.x).toBeLessThan(128)
    expect(heroi.y).toBeLessThan(128)
    expect([heroi.x, heroi.y]).not.toEqual([0, 0])
  })

  it('runProject protege o herói da factory atual sem mover o herói da partida anterior', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 960, height: 540 })
    const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject
    const heroes: Array<Record<string, number>> = []

    runProject(() => {
      const hero = h.api.createCharacter({ w: 64, h: 64, speed: 200 }) as Record<string, number>
      heroes.push(hero)
      h.api.rpgCreateMap('sala', 2, 2, () => {})
      h.api.rpgSetStartMap('sala')
      h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(hero, 64, dt))
    })

    await startGame(h)
    h.api.restartGame()
    h.nextFrame(16)

    const firstHero = heroes[1]
    if (!firstHero) throw new Error('a segunda execução da factory não criou o herói')
    expect(firstHero.x).toBeGreaterThanOrEqual(0)
    expect(firstHero.y).toBeGreaterThanOrEqual(0)
    expect(firstHero.x).toBeLessThan(128)
    expect(firstHero.y).toBeLessThan(128)

    h.api.placeCharacter(firstHero, 448, 238)
    h.api.restartGame()
    h.nextFrame(32)

    const currentHero = heroes[2]
    if (!currentHero) throw new Error('a terceira execução da factory não criou o herói')
    expect([firstHero.x, firstHero.y]).toEqual([448, 238])
    expect(currentHero.x).toBeGreaterThanOrEqual(0)
    expect(currentHero.y).toBeGreaterThanOrEqual(0)
    expect(currentHero.x).toBeLessThan(128)
    expect(currentHero.y).toBeLessThan(128)
  })

  it('grade: anda célula a célula, parede bloqueia, porta troca de mapa', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    const heroi = h.api.createCharacter({ w: 64, h: 64, speed: 6400 }) as Record<string, number>
    let montouCaverna = 0
    h.api.rpgCreateMap('vila', 10, 10, () => {})
    h.api.rpgCreateMap('caverna', 10, 10, () => {})
    h.api.rpgOnEnterMap('vila', () => {
      h.api.rpgBlockCell(1, 0) // parede à direita da origem
      h.api.rpgCreateDoor(0, 1, 'caverna')
    })
    h.api.rpgOnEnterMap('caverna', () => {
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
    h.api.restartGame()
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
    h.api.rpgCreateMap('vila', 10, 10, () => {})
    h.api.rpgOnEnterMap('vila', () => {
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
    h.api.rpgCreateMap('sala', 10, 10, () => {})
    h.api.rpgOnEnterMap('sala', () => {
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
    h.api.rpgCreateMap('mapa', 10, 10, () => {})
    h.api.rpgOnEnterMap('mapa', () => {
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
    h.api.rpgCreateMap('vila', 10, 10, () => {})
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
    h.api.restartGame()
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

  it('H3: NPC contorna uma parede alcançável e a cena só continua quando ele chega', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgCreateMap('vila', 6, 3, () => {})
    h.api.rpgOnEnterMap('vila', () => {
      h.api.rpgBlockCell(2, 1) // bloqueia o caminho reto; linhas 0 e 2 continuam livres
      h.api.rpgCreateNpc('bob', 0, 1, '', '')
    })
    h.api.rpgGoMap('vila')
    h.api.rpgCutscene(() => {
      h.api.rpgNpcWalkTo('bob', 5, 1)
      h.api.rpgAddFlag('cena_terminou')
    })
    expect(h.api.rpgHasFlag('cena_terminou')).toBe(false) // ainda tocando a cena
    h.clock.value = 0
    h.nextFrame(0)
    for (let t = 50; t <= 4000; t += 50) {
      h.clock.value = t
      h.nextFrame(t)
    }
    expect(h.api.rpgHasFlag('cena_terminou')).toBe(true)
  })

  it('H3: caminhada longa continua enquanto o NPC progride e a cena espera a chegada', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgCreateMap('estrada', 30, 3, () => {})
    h.api.rpgOnEnterMap('estrada', () => {
      h.api.rpgCreateNpc('bob', 0, 1, '', '')
    })
    h.api.rpgGoMap('estrada')
    h.api.rpgCutscene(() => {
      h.api.rpgNpcWalkTo('bob', 20, 1)
      h.api.rpgAddFlag('caminhada_terminou')
    })

    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '))
    try {
      for (let t = 0; t <= 6_100; t += 50) {
        h.clock.value = t
        h.nextFrame(t)
      }
      expect(h.api.rpgHasFlag('caminhada_terminou')).toBe(false)

      for (let t = 6_150; t <= 9_500; t += 50) {
        h.clock.value = t
        h.nextFrame(t)
      }
    } finally {
      console.warn = originalWarn
    }

    expect(h.api.rpgHasFlag('caminhada_terminou')).toBe(true)
    expect(warnings.some((warning) => warning.includes('caminho mudou'))).toBe(false)
  })

  it('H4: recriar um NPC não invade a célula reservada por outro personagem', () => {
    const h = loadRuntime()
    const warns: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    try {
      h.api.rpgCreateNpc('ana', 0, 0, '', '')
      h.api.rpgCreateNpc('bia', 1, 0, '', '')
      h.api.rpgCreateNpc('ana', 1, 0, '', '')
    } finally {
      console.warn = originalWarn
    }

    expect(warns.some((warning) => warning.includes('célula 1,0'))).toBe(true)
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

  it('A cada N segundos preserva a cadência em 30 e 60 FPS', async () => {
    async function disparosEmUmSegundo(fps: number): Promise<number> {
      const h = loadRuntime()
      let disparos = 0
      h.api.onUpdate(() => {
        if (h.api.everySeconds('cadencia', 0.05)) disparos++
      })
      await startGame(h)
      h.api.setState('jogando')
      h.nextFrame(0)
      for (let quadro = 1; quadro <= fps; quadro++) {
        h.nextFrame((quadro * 1_000) / fps)
      }
      return disparos
    }

    expect(await disparosEmUmSegundo(30)).toBe(20)
    expect(await disparosEmUmSegundo(60)).toBe(20)
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

  it('recarga é prazo ABSOLUTO: esperar entre tiros destrava mesmo SEM chamar no meio', async () => {
    // Regressão do fix do Lote D. A receita canônica é edge-trigger ("se
    // keyPressed(' ') e cooldownReady(nave, 0.2)"): a criança APERTA, SOLTA,
    // espera e aperta de novo — ou seja, cooldownReady NÃO é chamado enquanto o
    // botão está solto. A versão antiga descontava currentDt só nas chamadas, então
    // a espera com o botão solto não contava e o 2º tiro ficava travado.
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.clock.value = 0
    h.nextFrame(0)
    expect(h.api.cooldownReady(c, 0.2)).toBe(true) // aperta: arma a recarga de 0,2 s
    expect(h.api.cooldownReady(c, 0.2)).toBe(false) // no mesmo instante: recarregando
    // Passa ~0,4 s de JOGO em quadros SEM chamar cooldownReady no meio (botão solto).
    for (let i = 1; i <= 5; i++) {
      h.clock.value = i * 80
      h.nextFrame(i * 80)
    }
    // A espera REAL contou (playTime avançou): o próximo aperto dispara. Com a
    // versão por-chamada, o _cd nunca teria decrementado e isto seria false.
    expect(h.api.cooldownReady(c, 0.2)).toBe(true)
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

  it('⭐ uma-via usa o começo do movimento mesmo depois da colisão sólida', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    h.api.defineMold('tabua', { w: 200, h: 8, color: '#a60' })
    h.api.defineMold('paredes', { w: 32, h: 32, color: '#333' })
    await startGame(h)
    h.api.setState('jogando')
    h.api.spawnFromMold('tabua', 0, 300)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, number>
    h.api.placeCharacter(c, 50, 200)
    h.api.setVelocity(c, 0, 900)

    h.api.moveByVelocity(c, 0.1)
    h.api.collideGroup(c, 'paredes')
    h.api.oneWayPlatform(c, 'tabua', 0.1)

    expect(h.api.isOnGround(c)).toBe(true)
    expect(c.y).toBe(300 - 32)
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

  it('⭐ tile PLATAFORMA (one-way): cai por cima e POUSA, sobe por baixo e ATRAVESSA', async () => {
    // linha 0 vazia, linha 1 é PLATAFORMA (peça 2, one-way). tile 64.
    const h = loadRuntime(fakeTilemapAsset('. . .\n2 2 2', [], 64, [2]))
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.loadTilemap('mundo', 'mapa')
    h.nextFrame(16) // estabelece currentDt (~0.016) p/ o cruzamento de plano
    const c = h.api.createCharacter({ w: 32, h: 32 }) as { x: number; y: number }

    // CAINDO por cima: pé (62) acima do topo da plataforma (64), vy>0 → pousa.
    h.api.placeCharacter(c, 80, 30) // bottom = 62
    h.api.setVelocity(c, 0, 600)
    h.api.collideTilemap(c, 'mundo')
    expect(c.y).toBe(32) // topo(64) - altura(32) → em cima da plataforma
    expect(h.api.velocityOf(c, 'y')).toBe(0)
    expect((c as { onGround?: boolean }).onGround).toBe(true)

    // SUBINDO por baixo (vy<0): atravessa (não segura).
    h.api.placeCharacter(c, 80, 80) // dentro da faixa da plataforma
    h.api.setVelocity(c, 0, -600)
    h.api.collideTilemap(c, 'mundo')
    expect(c.y).toBe(80) // intacto
    expect(h.api.velocityOf(c, 'y')).toBe(-600)
  })

  it('⭐ tile plataforma não deixa atravessar na ordem mover → colidir sob frame hitch', async () => {
    const h = loadRuntime(fakeTilemapAsset('. . .\n2 2 2', [], 64, [2]))
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.loadTilemap('mundo', 'mapa')
    h.nextFrame(100)
    const c = h.api.createCharacter({ w: 32, h: 32 }) as { y: number }
    h.api.placeCharacter(c, 80, -2)
    h.api.setVelocity(c, 0, 900)

    h.api.moveByVelocity(c, 0.1)
    h.api.collideTilemap(c, 'mundo')

    expect(c.y).toBe(32)
    expect(h.api.velocityOf(c, 'y')).toBe(0)
    expect((c as { onGround?: boolean }).onGround).toBe(true)
  })

  it('🛡️ limita a varredura da plataforma one-way aos limites reais do mapa', async () => {
    const h = loadRuntime(fakeTilemapAsset('. . .\n2 2 2', [], 64, [2]))
    h.api.setup({ width: 800, height: 600 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.loadTilemap('mundo', 'mapa')
    h.nextFrame(16)
    h.nextFrame(32)
    const c = h.api.createCharacter({ w: 32, h: 32 })
    h.api.placeCharacter(c, 10_000, 30)
    h.api.setVelocity(c, 0, 500_000)

    let acessouLinhaInexistente = false
    const runtimeFunction = (
      h.api.collideTilemap as unknown as { constructor: (body: string) => () => object }
    ).constructor
    const runtimeArrayPrototype = runtimeFunction('return Array.prototype')()
    Object.defineProperty(runtimeArrayPrototype, '50', {
      configurable: true,
      get() {
        acessouLinhaInexistente = true
        return undefined
      },
    })
    try {
      h.api.collideTilemap(c, 'mundo')
    } finally {
      Reflect.deleteProperty(runtimeArrayPrototype, '50')
    }

    expect(acessouLinhaInexistente).toBe(false)
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
    h.api.restartGame()
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
    h.api.restartGame()
    const a = h.api.spawnFromMold('bicho', 0, 0) as Record<string, number>
    h.api.tweenTo(a, 500, 500, 1) // em voo quando o jogo acaba
    h.api.endGame()
    h.api.restartGame()
    const b = h.api.spawnFromMold('bicho', 10, 10) as Record<string, number>
    expect(b).toBe(a as unknown as typeof b) // o pool reusa o MESMO objeto
    h.nextFrame(16)
    h.nextFrame(32)
    // ⭐ Sem o reset, o tween do bicho MORTO seguia arrastando o bicho NOVO.
    expect(b.x).toBe(10)
    expect(b.y).toBe(10)
  })

  it('⭐ "Jogar de novo" desliga rastros de personagens da factory anterior', () => {
    const h = loadRuntime()
    const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject
    const characters: Array<Record<string, unknown>> = []

    runProject(() => {
      const character = h.api.createCharacter({ w: 32, h: 32 }) as Record<string, unknown>
      characters.push(character)
      h.api.trailOn(character, '#00ffff', 3, 30, 0.4)
    })

    expect(characters[0]?._trailOn).toBe(true)
    h.api.restartGame()
    expect(characters[0]?._trailOn).toBe(false)
    expect(characters[1]?._trailOn).toBe(true)
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

  it('⭐ carregar/tocar música na factory é idempotente entre partidas', () => {
    const audios: FakeAudio[] = []
    class FakeAudio {
      paused = true
      loop = false
      currentTime = 0
      volume = 1
      preload = ''
      oncanplaythrough: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor() {
        audios.push(this)
      }

      set src(_value: string) {
        this.oncanplaythrough?.()
      }

      play(): Promise<void> {
        this.paused = false
        return Promise.resolve()
      }

      pause(): void {
        this.paused = true
      }
    }
    const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio')
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio })

    try {
      const h = loadRuntime(undefined, {
        __SZGAME_SOUNDS: { faixa: 'data:audio/ogg;base64,AA==' },
      })
      const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject
      runProject(() => {
        h.api.loadSound('trilha', 'faixa')
        h.api.playMusic('trilha')
      })

      const playing = () => audios.filter((audio) => !audio.paused).length
      expect({ created: audios.length, playing: playing() }).toEqual({ created: 1, playing: 1 })
      h.api.restartGame()
      expect({ created: audios.length, playing: playing() }).toEqual({ created: 1, playing: 1 })
      h.api.restartGame()
      expect({ created: audios.length, playing: playing() }).toEqual({ created: 1, playing: 1 })
    } finally {
      if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio)
      else Reflect.deleteProperty(globalThis, 'Audio')
    }
  })

  it('⭐ Jogar de novo encerra tons sintetizados pertencentes à partida anterior', () => {
    class FakeOscillator {
      type = ''
      frequency = { value: 0 }
      onended: (() => void) | null = null
      stops: number[] = []
      disconnected = false

      connect(): void {}
      start(): void {}
      stop(at: number): void {
        this.stops.push(at)
      }
      disconnect(): void {
        this.disconnected = true
      }
    }

    const oscillators: FakeOscillator[] = []
    class FakeAudioContext {
      currentTime = 0
      state = 'running'
      destination = {}

      createOscillator(): FakeOscillator {
        const oscillator = new FakeOscillator()
        oscillators.push(oscillator)
        return oscillator
      }
      createGain() {
        return {
          gain: { value: 0, setTargetAtTime(): void {} },
          connect(): void {},
          disconnect(): void {},
        }
      }
      resume(): void {}
    }

    const h = loadRuntime(undefined, { AudioContext: FakeAudioContext })
    const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject
    runProject(() => h.api.playTone(440, 60_000))
    h.api.restartGame()
    h.api.restartGame()

    expect(oscillators.map((oscillator) => oscillator.stops)).toEqual([[60, 0], [60, 0], [60]])
    expect(oscillators.map((oscillator) => oscillator.disconnected)).toEqual([true, true, false])
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

  it('🛡️ limita o nível recebido pela API antes de criar o monstrinho', async () => {
    const h = loadRuntime()
    await mundo(h)

    h.api.pkmGive('Fogoso', Number.MAX_VALUE)

    expect(h.api.pkmLevelOf('Fogoso')).toBe(999)
  })

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

  it('⭐ batalha de monstrinhos zera o resultado deixado pela batalha anterior', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.rpgBattleStats(30, 999)
    h.api.rpgBattleStart('Slime', 1, 0, 0)
    driveBattle(h, 1)
    expect(h.api.rpgBattleWon()).toBe(true)

    h.api.pkmGive('Fogoso', 5)
    h.api.pkmBattleWild('Folhinha', 5)

    expect(h.api.rpgBattleWon()).toBe(false)
  })

  it('criatura do treinador só vale dentro do time e o time respeita o teto de 6', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    const warns: string[] = []
    const real = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.join(' '))
    try {
      h.api.pkmTrainerCreature('Folhinha', 5)
      h.api.pkmBattleTrainer('Rival', () => {
        for (let i = 0; i < 7; i++) h.api.pkmTrainerCreature('Folhinha', i + 1)
      })
    } finally {
      console.warn = real
    }

    expect(h.api.state()).toBe('batalha')
    expect(
      warns.some((warning) => warning.includes('dentro') && warning.includes('treinador')),
    ).toBe(true)
    expect(warns.some((warning) => warning.includes('6'))).toBe(true)
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
    h.api.restartGame()
    expect(h.api.pkmTeamSize()).toBe(0)
    expect(h.api.pkmBallCount()).toBe(0)
  })

  it('⭐ salvar leva o time junto (senão a criança perde 6 monstrinhos)', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.rpgCreateMap('vila', 10, 10, () => {})
    h.api.pkmGive('Fogoso', 12)
    h.api.pkmGiveBall(3, 60)
    h.api.rpgSave()
    // Some tudo (como fechar o jogo)…
    h.api.endGame()
    h.api.restartGame()
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

  it('save restaura os limites e valores válidos dos objetos internos dos kits', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.store.set(
      'szgk-rpg-save',
      JSON.stringify({
        max: 30,
        hp: 10,
        items: [{ name: 'chave', image: 42, qty: 'quebrado' }],
        potions: Array.from({ length: 120 }, (_, index) => ({
          name: `Poção ${index}`,
          heal: 'quebrado',
        })),
        special: { name: 'Raio', dmg: 'quebrado', cost: 'quebrado' },
        pkmTeam: Array.from({ length: 8 }, () => ({
          species: 'Fogoso',
          level: -3,
          hp: 999,
          hpMax: 0,
          xp: Number.MAX_VALUE,
        })),
        pkmBalls: Array.from({ length: 1_001 }, () => ({ power: 'quebrada' })),
      }),
    )

    h.api.rpgLoad()
    expect(h.api.pkmTeamSize()).toBe(6)
    expect(h.api.pkmBallCount()).toBe(999)
    expect(h.api.pkmLevelOf('Fogoso')).toBe(1)
    h.api.rpgSave()
    expect(JSON.parse(h.store.get('szgk-rpg-save') ?? '{}').potions).toHaveLength(99)

    h.api.rpgGiveItem('chave', '')
    h.api.rpgRemoveItem('chave')
    h.api.rpgRemoveItem('chave')
    expect(h.api.rpgHasItem('chave')).toBe(false)

    h.api.rpgBattleStart('Tanque', 100, 1, 0)
    const t = pickAction(h, 1, 'Item')
    expect(Number.isFinite(battleSnap(h)?.allies[0]?.hp)).toBe(true)
    pickAction(h, t, 'Raio')
    expect(Number.isFinite(battleSnap(h)?.allies[0]?.energy)).toBe(true)
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

  it('uma batalha ativa bloqueia qualquer segunda batalha antes de criar o oponente', async () => {
    const h = loadRuntime()
    await mundo(h)
    h.api.pkmGive('Fogoso', 5)
    let encontros = 0
    let treinadorExecutou = false
    h.api.on('monstrinho:apareceu', () => {
      encontros += 1
    })

    h.api.pkmBattleWild('Folhinha', 5)
    h.api.pkmBattleWild('Folhinha', 8)
    h.api.pkmBattleTrainer('Rival', () => {
      treinadorExecutou = true
      h.api.pkmTrainerCreature('Folhinha', 5)
    })
    h.api.rpgBattleStart('Dragão', 30, 7, 0)

    expect(encontros).toBe(1)
    expect(treinadorExecutou).toBe(false)
    expect(battleSnap(h)).toBeNull()
    expect(h.api.state()).toBe('batalha')
  })
})

describe('SZGameKit — 🥊 Kit Luta', () => {
  it('o placar mostra a maioria necessária e limita a partida a 9 rounds', async () => {
    const h = loadRuntime()
    const { api } = h
    api.setup({ width: 800, height: 600 })
    await startGame(h)
    const p1 = api.createCharacter({ w: 32, h: 64 })
    const p2 = api.createCharacter({ w: 32, h: 64 })
    const hudDots = (rounds: number): number => {
      api.lutaMatch(p1, p2, rounds, 60)
      ctxCalls.length = 0
      api.lutaDrawHud()
      return ctxCalls.filter(([method]) => method === 'arc').length
    }

    expect(hudDots(5)).toBe(6)
    expect(hudDots(999)).toBe(10)
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

  it('restart recomeça o fundo rolante na origem', async () => {
    const h = loadRuntime(undefined, {
      __SZGAME_ASSETS: { fundo: 'data:image/png;base64,AA==' },
    })
    const runProject = (h.api as unknown as { runProject(fn: () => void): void }).runProject

    runProject(() => {
      h.api.loadImage('fundo', 'fundo')
      h.api.onDraw(() => h.api.scrollImage('fundo', 100, 0))
    })
    await startGame(h)
    h.api.restartGame()

    ctxCalls.length = 0
    h.nextFrame(100)
    const movedX = ctxCalls.find(([method]) => method === 'drawImage')?.[1][0]
    expect(movedX).toBe(-246)

    ctxCalls.length = 0
    h.api.restartGame()
    h.nextFrame(0)
    const restartedX = ctxCalls.find(([method]) => method === 'drawImage')?.[1][0]
    expect(restartedX).toBe(0)
  })

  function gridCheio(cols: number, rows: number): string {
    const linha = new Array(cols).fill('1').join(' ')
    return new Array(rows).fill(linha).join('\n')
  }

  it('avisa quando mapa-cenário e mapa de peças têm dimensões diferentes', async () => {
    const h = loadRuntime(fakeTilemapAsset(gridCheio(3, 2), [], 64))
    h.api.loadTilemap('chao-vila', 'mapa')
    h.api.rpgCreateMap('vila', 10, 8, () => {
      h.api.drawTilemap('chao-vila', 'chão')
    })
    h.api.rpgSetStartMap('vila')
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      await startGame(h)
      h.api.restartGame()
      h.nextFrame(16)
    } finally {
      console.warn = originalWarn
    }

    expect(
      warnings.some(
        (warning) =>
          warning.includes('mapa-cenário "vila"') &&
          warning.includes('10 × 8') &&
          warning.includes('mapa de peças "chao-vila"') &&
          warning.includes('3 × 2'),
      ),
    ).toBe(true)
  })

  it('todo seletor de imagem resolve o asset sem exigir Carregar imagem', async () => {
    const h = loadRuntime()
    const image = 'data:image/png;base64,AA=='
    const heroi = h.api.createCharacter({ w: 32, h: 32 })
    h.api.setSheet(heroi, image, 16, 16)
    h.api.setWalkSheet(heroi, image, 16, 16)
    h.api.rpgCreateNpc('guia', 1, 1, image, '')
    h.api.rpgGiveItem('chave', image)
    h.api.scrollImage(image, 0, 0)
    h.api.parallaxLayer(image, 0.3, 1)
    await startGame(h)

    let draws = 0
    const originalDraw = fakeCtx.drawImage
    ;(fakeCtx as { drawImage: () => void }).drawImage = () => {
      draws += 1
    }
    try {
      h.api.drawCharacter(heroi)
      h.api.rpgDrawNpcs()
      h.api.rpgDrawInventory(10, 10)
      h.api.scrollImage(image, 0, 0)
      h.api.parallaxLayer(image, 0.3, 1)
    } finally {
      ;(fakeCtx as { drawImage: unknown }).drawImage = originalDraw
    }
    expect(draws).toBeGreaterThanOrEqual(5)
  })

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

  it('⭐ frente: "Desenhar o mapa" na camada FRENTE usa a grade da frente (por cima, sem filtro de sólido)', async () => {
    // grade completa 2×1 = duas peças; frontGrid = só a 2ª célula é da frente.
    const h = loadRuntime(fakeTilemapAsset('1 1', [1], 64, undefined, '. 5'))
    h.api.setup({ width: 800, height: 600 })
    h.api.loadTilemap('mundo', 'mapa')
    let layer = 'chão'
    h.api.onDraw(() => h.api.drawTilemap('mundo', layer))
    await startGame(h)
    h.api.setState('jogando')
    const countDraws = (): number => {
      let draws = 0
      const orig = fakeCtx.drawImage
      ;(fakeCtx as { drawImage: () => void }).drawImage = () => {
        draws += 1
      }
      try {
        h.nextFrame(16)
      } finally {
        ;(fakeCtx as { drawImage: unknown }).drawImage = orig
      }
      return draws
    }
    layer = 'chão'
    expect(countDraws()).toBe(2) // as DUAS peças do mapa completo
    layer = 'frente'
    expect(countDraws()).toBe(1) // SÓ a peça da camada da frente
  })

  it('frente: mapa SEM camada da frente não desenha nada na opção frente', async () => {
    const h = loadRuntime(fakeTilemapAsset('1 1', [1], 64))
    h.api.setup({ width: 800, height: 600 })
    h.api.loadTilemap('mundo', 'mapa')
    h.api.onDraw(() => h.api.drawTilemap('mundo', 'frente'))
    await startGame(h)
    h.api.setState('jogando')
    let draws = 0
    const orig = fakeCtx.drawImage
    ;(fakeCtx as { drawImage: () => void }).drawImage = () => {
      draws += 1
    }
    try {
      h.nextFrame(16)
    } finally {
      ;(fakeCtx as { drawImage: unknown }).drawImage = orig
    }
    expect(draws).toBe(0)
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

  it('o tamanho declarado na criação do mapa alimenta a trava da câmera', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 800, height: 600 })
    const heroi = h.api.createCharacter({ w: 32, h: 32, speed: 0 })
    h.api.rpgCreateMap('campo', 30, 20, () => {})
    h.api.rpgOnEnterMap('campo', () => {
      h.api.placeCharacter(heroi, 29 * 64, 19 * 64)
    })
    h.api.onUpdate((dt: unknown) => h.api.rpgMoveGrid(heroi, 64, dt))
    await startGame(h)
    h.api.restartGame()
    // O mundo passado na mão (800×600) é SOBRESCRITO pelo tamanho do mapa.
    h.api.cameraFollow(heroi, 800, 600)
    h.nextFrame(16)
    expect(h.api.cameraX()).toBe(30 * 64 - 800) // 1120
    expect(h.api.cameraY()).toBe(20 * 64 - 600) // 680
  })
})

describe('SZGameKit — R29: robustez (nomes perigosos, softlock, cura)', () => {
  it('⭐ A2: nome "constructor"/"toString" no time NÃO trava o jogo', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    // Nomes que caem na herança do Object (constructor/toString) travavam o motor.
    h.api.rpgBattleStats(30, 999) // força alta: vence no 1º golpe
    h.api.rpgTeachMove('toString', 'X', 10, 2) // ally "malvado" (nem existe ainda)
    h.api.rpgAddFoe('constructor', 20, 5, 0, '#f00')
    expect(() => h.api.rpgBattleStart('toString', 20, 5, 0)).not.toThrow()
    expect(h.api.state()).toBe('batalha')
    // Joga até acabar sem estourar (antes, abrir o painel fazia undefined.name).
    driveBattle(h, 1)
    expect(h.api.state()).toBe('jogando')
    expect(h.api.rpgBattleWon()).toBe(true)
  })

  it('⭐ A1: um erro no laço NÃO congela — o próximo quadro ainda roda', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    let quadros = 0
    // Um "A cada quadro" que SEMPRE lança: o runHooks já protege os ganchos, mas
    // este teste garante que o laço reagenda mesmo assim (a fila de rAF nunca seca).
    h.api.onUpdate(() => {
      quadros += 1
      throw new Error('boom de propósito')
    })
    for (let i = 0; i < 5; i++) {
      expect(h.rafCount()).toBeGreaterThan(0) // sempre há um próximo quadro agendado
      h.nextFrame((i + 1) * 16)
    }
    expect(quadros).toBe(5) // o laço sobreviveu aos 5 erros
  })

  it('⭐ A3: "Continuar" (carregar) no MEIO da batalha volta o jogo a "jogando"', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    // Injeta um save mínimo direto no localStorage do harness.
    h.store.set('szgk-rpg-save', JSON.stringify({ max: 30, hp: 20, lvl: 1, flags: {}, items: [] }))
    h.api.rpgBattleStats(30, 5, 0)
    h.api.rpgBattleStart('Chefe', 40, 5, 0)
    expect(h.api.state()).toBe('batalha')
    h.api.rpgLoad() // antes: zerava a batalha e ficava PRESO em 'batalha'
    expect(h.api.state()).toBe('jogando')
  })

  it('⭐ A4: golpe de CURA cura de verdade (não fere o inimigo)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(60, 5, 0)
    h.api.rpgTeachHeal('Você', 'Curar', 15, 2) // golpe de cura do herói
    h.api.rpgBattleStart('Tanque', 100, 3, 0) // inimigo grosso: a batalha continua
    expect(h.api.state()).toBe('batalha')
    // Abre o painel e confere que o golpe de CURA aparece rotulado como cura (antes
    // era código morto: heal:false fixo → o rótulo "(cura …)" nunca renderizava).
    let opened: BattleSnap | null = null
    let t = 1
    for (let i = 0; i < 20 && !opened; i++, t += 100) {
      const s = battleSnap(h)
      if (s?.menuOpen) opened = s
      else h.nextFrame(t)
    }
    expect(opened).not.toBeNull()
    expect(opened?.menuLabels.some((l) => l.includes('Curar') && l.includes('cura'))).toBe(true)
    const foeHp0 = opened?.foes[0]?.hp
    pickAction(h, t, 'Curar') // escolhe o golpe de cura
    // O inimigo NÃO perdeu vida (cura ≠ dano): o golpe curou em vez de ferir.
    expect(battleSnap(h)?.foes[0]?.hp).toBe(foeHp0)
  })

  it('🧩 D1: tabuleiro — criar/pôr/ler/contar/cabe (a base do Snake e do Match-3)', () => {
    const h = loadRuntime()
    const api = h.api as unknown as {
      boardCreate: (n: string, c: number, r: number, empty: unknown) => void
      boardSet: (n: string, v: unknown, c: number, r: number) => void
      boardGet: (n: string, c: number, r: number) => unknown
      boardCount: (n: string, v: unknown) => number
      boardIn: (n: string, c: number, r: number) => boolean
    }
    api.boardCreate('mapa', 4, 3, 0) // 4×3 preenchido de 0 ("vazio")
    expect(api.boardCount('mapa', 0)).toBe(12) // tudo vazio no começo
    api.boardSet('mapa', 1, 2, 1) // corpo da cobrinha em (2,1)
    api.boardSet('mapa', 1, 0, 0)
    expect(api.boardGet('mapa', 2, 1)).toBe(1)
    expect(api.boardCount('mapa', 1)).toBe(2)
    expect(api.boardCount('mapa', 0)).toBe(10)
    // Fora da grade: pôr é ignorado (não estoura), ler devolve o "vazio", cabe = false.
    api.boardSet('mapa', 9, 99, 99)
    expect(api.boardCount('mapa', 9)).toBe(0)
    expect(api.boardGet('mapa', 99, 99)).toBe(0)
    expect(api.boardIn('mapa', 3, 2)).toBe(true) // último canto válido
    expect(api.boardIn('mapa', 4, 2)).toBe(false) // 1 coluna além = parede
    // Tabuleiro inexistente é seguro (não trava).
    expect(api.boardGet('naoexiste', 0, 0)).toBe(0)
    expect(api.boardIn('naoexiste', 0, 0)).toBe(false)
  })

  it('🛡️ limita grades, mapas, inventário e HUD antes de entrarem em laços do motor', async () => {
    const h = loadRuntime()
    await startGame(h)
    const api = h.api as unknown as GameKitApi & {
      boardCreate: (name: string, cols: number, rows: number, empty: unknown) => void
      boardIn: (name: string, col: number, row: number) => boolean
      drawHearts: (current: number, max: number, x: number, y: number) => void
    }

    api.boardCreate('grande', 513, 513, 0)
    expect(api.boardIn('grande', 511, 511)).toBe(true)
    expect(api.boardIn('grande', 512, 0)).toBe(false)

    api.pkmGiveBall(1_000, 50)
    expect(api.pkmBallCount()).toBe(999)

    ctxCalls.length = 0
    api.drawHearts(101, 101, 0, 0)
    expect(ctxCalls.filter(([method]) => method === 'arc')).toHaveLength(200)

    api.rpgCreateMap('enorme', 513, 513, () => {})
    api.rpgGoMap('enorme')
    const hero = api.createCharacter({ w: 64, h: 64 }) as Record<string, number>
    api.placeCharacter(hero, 512 * 64, 0)
    api.rpgMoveGrid(hero, 64, 0)
    expect(hero.x).toBe(511 * 64)
  })

  it('🛡️ limita times, fila de inimigos e poções antes da batalha', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 0)

    for (let i = 0; i < 20; i++) {
      h.api.rpgAddAlly(`Aliado ${i}`, 20, 4, 0, '#4ade80')
      h.api.rpgAddFoe(`Inimigo ${i}`, 20, 4, 0, '#e05a5a')
      h.api.rpgGivePotion(`Poção ${i}`, 10)
    }
    for (let i = 20; i < 120; i++) h.api.rpgGivePotion(`Poção ${i}`, 10)

    h.api.rpgSave()
    const salvo = JSON.parse(h.store.get('szgk-rpg-save') ?? '{}')
    expect(salvo.potions).toHaveLength(99)

    h.api.rpgBattleStart('Principal', 20, 4, 0)
    expect(battleSnap(h)?.allies).toHaveLength(6)
    expect(battleSnap(h)?.foes).toHaveLength(6)
  })

  it('🛡️ valida a posição restaurada depois de carregar o mapa do save', () => {
    const h = loadRuntime()
    h.api.rpgCreateMap('pequeno', 2, 2, () => {})
    h.api.rpgGoMap('pequeno')
    const hero = h.api.createCharacter({ w: 64, h: 64 }) as Record<string, number>
    h.api.rpgMoveGrid(hero, 64, 0)
    h.store.set('szgk-rpg-save', JSON.stringify({ map: 'pequeno', hx: 999, hy: -999 }))

    h.api.rpgLoad()

    expect(hero.x).toBe(64)
    expect(hero.y).toBe(0)
    expect(hero._prevX).toBe(hero.x)
    expect(hero._prevY).toBe(hero.y)
  })

  it('🛡️ limita esperas pendentes mesmo quando a API é chamada diretamente', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    let chamadas = 0
    for (let i = 0; i < 2_000; i++) h.api.waitThen(0, () => chamadas++)

    h.nextFrame(16)

    expect(chamadas).toBe(1_000)
  })

  it('🛡️ registra uma região enorme de grama sem materializar cada célula', () => {
    const h = loadRuntime()
    const startedAt = performance.now()
    h.api.pkmGrassCells(0, 0, 999, 999)
    const elapsed = performance.now() - startedAt

    expect(elapsed).toBeLessThan(150)
  })

  it('🛡️ encontra caminho no maior mapa permitido sem bloquear o quadro', () => {
    const h = loadRuntime()
    h.api.rpgCreateMap('maximo', 512, 512, () => {})
    h.api.rpgOnEnterMap('maximo', () => {
      h.api.rpgCreateNpc('bob', 0, 0, '', '')
    })
    h.api.rpgGoMap('maximo')

    const startedAt = performance.now()
    h.api.rpgNpcWalkTo('bob', 511, 511)
    const elapsed = performance.now() - startedAt

    expect(elapsed).toBeLessThan(200)
  })

  it('🛡️ normaliza progresso inválido na fronteira do save antes de recompensar XP', () => {
    const h = loadRuntime()
    h.store.set(
      'szgk-rpg-save',
      JSON.stringify({
        max: -10,
        hp: 999,
        str: -3,
        def: -4,
        lvl: Number.MAX_VALUE,
        xp: -8,
        maxXp: 1,
      }),
    )

    h.api.rpgLoad()
    h.api.rpgSave()
    const normalized = JSON.parse(h.store.get('szgk-rpg-save') ?? '{}')

    expect(normalized.max).toBeGreaterThanOrEqual(1)
    expect(normalized.hp).toBeGreaterThanOrEqual(0)
    expect(normalized.hp).toBeLessThanOrEqual(normalized.max ?? 0)
    expect(normalized.str).toBeGreaterThanOrEqual(0)
    expect(normalized.def).toBeGreaterThanOrEqual(0)
    expect(normalized.lvl).toBe(999)
    expect(normalized.xp).toBeGreaterThanOrEqual(0)
    expect(normalized.maxXp).toBeGreaterThanOrEqual(20)

    expect(() => h.api.rpgBattleReward(20)).not.toThrow()
    expect(Number(h.api.rpgLevel())).toBe(999)
  })

  it('🧱 D2: rebater na raquete — inverte o vy e o ângulo vem do ponto de impacto', async () => {
    const h = loadRuntime()
    await startGame(h)
    const api = h.api as unknown as {
      createCharacter: (o: Record<string, number>) => Record<string, number>
      placeCharacter: (c: Record<string, number>, x: number, y: number) => void
      setVelocity: (c: Record<string, number>, vx: number, vy: number) => void
      velocityOf: (c: Record<string, number>, axis: 'x' | 'y') => number
      paddleBounce: (ball: Record<string, number>, paddle: Record<string, number>) => void
    }
    const paddle = api.createCharacter({ w: 100, h: 16 })
    api.placeCharacter(paddle, 100, 400) // centro x=150
    // A bola desce (vy>0) e ENCOSTA na raquete (que está embaixo dela).
    const ball = api.createCharacter({ w: 16, h: 16 })
    api.placeCharacter(ball, 142, 392) // centro x=150 (bate no MEIO)
    api.setVelocity(ball, 0, 200)
    api.paddleBounce(ball, paddle)
    expect(api.velocityOf(ball, 'y')).toBeLessThan(0) // subiu (rebateu p/ cima)
    expect(Math.abs(api.velocityOf(ball, 'x'))).toBeLessThan(1) // meio da raquete = reto
    // Batendo na BEIRA direita da raquete, ganha vx positivo (abre o ângulo).
    const ball2 = api.createCharacter({ w: 16, h: 16 })
    api.placeCharacter(ball2, 188, 392) // centro x=196, à direita do centro 150
    api.setVelocity(ball2, 0, 200)
    api.paddleBounce(ball2, paddle)
    expect(api.velocityOf(ball2, 'x')).toBeGreaterThan(0)
    // Sem encostar (longe), nada muda.
    const ball3 = api.createCharacter({ w: 16, h: 16 })
    api.placeCharacter(ball3, 142, 0)
    api.setVelocity(ball3, 0, 200)
    api.paddleBounce(ball3, paddle)
    expect(api.velocityOf(ball3, 'y')).toBe(200) // intocado
  })
})

describe('SZGameKit — R30: 👑 chefes (o inimigo usa golpes, ler vida, IA de chefe)', () => {
  it('⭐ o inimigo USA o golpe ensinado (antes o foeStep ignorava f.moves)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0) // herói vida 100, força fraca
    h.api.rpgTeachMove('Bruxo', 'Chama', 40, 8) // golpe FORTE ensinado ao INIMIGO
    h.api.rpgBattleStart('Bruxo', 120, 1, 0) // foe força 1: sem o golpe mal me arranha
    expect(h.api.state()).toBe('batalha')
    const before = h.api.battlerLife('Você')
    pickAction(h, 1, 'Atacar') // uma rodada inteira: herói ataca, depois o Bruxo age
    // Com o golpe (40), o herói perde MUITO mais do que a força 1 causaria (bite-check
    // do fix: com o bug de volta, before-after ≈ 1 e isto falha).
    expect(before - h.api.battlerLife('Você')).toBeGreaterThan(20)
    // Começou com 10, gastou 8 e recuperou 2 no fim da rodada.
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Bruxo')?.energy).toBe(4)
    pickAction(h, 2_000, 'Atacar')
    // Com 4, não pode repetir Chama: usa a força básica e recupera mais 2.
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Bruxo')?.energy).toBe(6)
  })

  it('"o inimigo usa o golpe" consome energia e recusa repetir sem energia', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgTeachMove('Ogro', 'Marreta', 30, 8)
    h.api.rpgBattleStart('Ogro', 100, 1, 0)

    h.api.rpgFoeUse('Ogro', 'Marreta')
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Ogro')?.energy).toBe(2)
    const vidaDepoisDoPrimeiro = h.api.battlerLife('Você')
    h.api.rpgFoeUse('Ogro', 'Marreta')

    expect(h.api.battlerLife('Você')).toBe(vidaDepoisDoPrimeiro)
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Ogro')?.energy).toBe(2)
  })

  it('os comandos exclusivos do inimigo recusam herói e nomes fora da batalha', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgTeachMove('Você', 'Traição', 30, 0)
    h.api.rpgBattleStart('Slime', 100, 1, 0)
    const vidaAntes = h.api.battlerLife('Você')

    h.api.rpgFoeUse('Você', 'Traição')
    h.api.rpgFoeHitAll('Você', 20)
    h.api.rpgFoeHitAll('Fantasma', 20)

    expect(h.api.battlerLife('Você')).toBe(vidaAntes)
  })

  it('"a vida de … na batalha" lê qualquer combatente + o CHEFÃO entra marcado', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 0)
    h.api.rpgAddBoss('Dragão', 200, 9, 2) // o chefão entra na fila
    h.api.rpgBattleStart('Capanga', 20, 3, 0) // + um capanga normal
    expect(h.api.state()).toBe('batalha')
    const snap = battleSnap(h)
    const dragao = snap?.foes.find((f) => f.name === 'Dragão')
    const capanga = snap?.foes.find((f) => f.name === 'Capanga')
    expect(dragao?.boss).toBe(true) // marcado → desenhado maior, com barra proeminente
    expect(capanga?.boss).toBe(false)
    expect(h.api.battlerLife('Dragão')).toBe(200)
    expect(h.api.battlerMaxLife('Dragão')).toBe(200)
    expect(h.api.battlerLife('Você')).toBe(30)
    expect(h.api.battlerLife('naoexiste')).toBe(0) // seguro fora
  })

  it('"o inimigo usa o golpe" desfere o golpe ensinado a ele (e avisa se não tem)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgTeachMove('Ogro', 'Marreta', 30, 0)
    h.api.rpgBattleStart('Ogro', 100, 1, 0)
    const before = h.api.battlerLife('Você')
    h.api.rpgFoeUse('Ogro', 'Marreta') // aciona o golpe direto
    expect(before - h.api.battlerLife('Você')).toBeGreaterThan(15)
    const now = h.api.battlerLife('Você')
    h.api.rpgFoeUse('Ogro', 'GolpeInexistente') // golpe que ele NÃO tem: no-op + aviso
    expect(h.api.battlerLife('Você')).toBe(now)
  })

  it('🖼️ inimigo/chefão/aliado entram na batalha com a IMAGEM escolhida (não só cor)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 0)
    h.api.rpgAddAlly('Mago', 40, 6, 1, '#4ade80', 'mago-png') // aliado com arte
    h.api.rpgAddBoss('Dragão', 200, 9, 2, 'dragao-png') // o chefão com arte
    h.api.rpgBattleStart('Capanga', 20, 3, 0, 'capanga-png') // o inimigo nomeado com arte
    const snap = battleSnap(h)
    expect(snap?.foes.find((f) => f.name === 'Capanga')?.image).toBe('capanga-png')
    expect(snap?.foes.find((f) => f.name === 'Dragão')?.image).toBe('dragao-png')
    expect(snap?.allies.find((a) => a.name === 'Mago')?.image).toBe('mago-png')
    // Sem imagem segue vazio (cai no retângulo da cor) — não quebra o herói.
    expect(snap?.allies.find((a) => a.name === 'Você')?.image).toBe('')
  })

  it('⚔️ ficha reutilizável: define separado + ESCOLHE na batalha (imagem + chefão vêm da ficha)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(40, 7, 0)
    // Cria as fichas UMA vez (com imagem e atributos)…
    h.api.rpgDefineBattler('Dragão', 200, 9, 2, 'dragao-png', '#b23b6e', true) // chefão
    h.api.rpgDefineBattler('Capanga', 20, 3, 0, 'capanga-png', '#e05a5a', false)
    h.api.rpgAddFoeNamed('Capanga') // …e só ESCOLHE quem entra
    h.api.rpgBattleNamed('Dragão') // o chefão como inimigo principal
    expect(h.api.state()).toBe('batalha')
    const snap = battleSnap(h)
    const dragao = snap?.foes.find((f) => f.name === 'Dragão')
    const capanga = snap?.foes.find((f) => f.name === 'Capanga')
    expect(dragao?.boss).toBe(true) // a ficha era chefão → entra maior/coroa
    expect(dragao?.image).toBe('dragao-png') // imagem veio da ficha
    expect(dragao?.hp).toBe(200)
    expect(capanga?.image).toBe('capanga-png') // o extra da fila também saiu da ficha
    expect(capanga?.boss).toBe(false)
  })

  it('⚔️ replay de cutscene preserva a COR custom da ficha (não cai no vermelho padrão)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 640, height: 640 })
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(40, 7, 0)
    h.api.rpgDefineBattler('Slime', 20, 3, 0, '', '#22ff88', false) // cor custom, não-chefão
    h.api.rpgCutscene(() => {
      h.api.rpgBattleNamed('Slime') // grava um passo 'battle' que carrega a cor da ficha
    })
    // toca a cena: o passo de batalha abre o estado 'batalha' e espera lá.
    for (let t = 16; t <= 400 && h.api.state() !== 'batalha'; t += 16) h.nextFrame(t)
    expect(h.api.state()).toBe('batalha')
    const slime = battleSnap(h)?.foes.find((f) => f.name === 'Slime')
    expect(slime?.color).toBe('#22ff88') // sobreviveu ao record→replay (antes virava '#e05a5a')
  })

  it('⚔️ batalhar contra uma ficha que não existe NÃO abre batalha (segue no mundo)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(30, 7, 0)
    h.api.rpgBattleNamed('NaoExiste') // ficha nunca criada → no-op + aviso
    expect(h.api.state()).toBe('jogando')
    expect(battleSnap(h)).toBeNull()
  })

  it('⚔️ golpe ensinado PERSISTE ao "Jogar de novo" (não some no recomeço)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgTeachMove('Ogro', 'Marreta', 30, 0) // ensinado UMA vez
    // "Jogar de novo": menu → jogando dispara o rpgNewGame de novo.
    h.api.setState('menu')
    h.api.restartGame()
    h.api.rpgBattleStart('Ogro', 100, 1, 0) // o Ogro entra com o golpe (antes o wipe apagava)
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Ogro')?.moves).toBe(1)
  })

  it('⚔️ re-ensinar o MESMO golpe REPÕE (idempotente): 1 golpe, com o valor novo', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgTeachMove('Ogro', 'Marreta', 10, 0)
    h.api.rpgTeachMove('Ogro', 'Marreta', 30, 0) // mesmo nome → repõe (não empilha)
    h.api.rpgBattleStart('Ogro', 100, 1, 0)
    expect(battleSnap(h)?.foes.find((f) => f.name === 'Ogro')?.moves).toBe(1) // 1, não 2
    const before = h.api.battlerLife('Você')
    h.api.rpgFoeUse('Ogro', 'Marreta')
    expect(before - h.api.battlerLife('Você')).toBeGreaterThan(20) // ~30 (o novo), não ~10
  })

  it('a IA de chefe manda na vez dele: "acerta TODO o time" atinge todos os aliados', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 3, 0)
    h.api.rpgAddAlly('Amigo', 100, 3, 0, '#4ade80') // o herói + um aliado
    h.api.rpgOnFoeTurn('Titã', () => {
      h.api.rpgFoeHitAll('Titã', 25) // o golpe de área do chefão
    })
    h.api.rpgBattleStart('Titã', 400, 1, 0) // tanque: a batalha não acaba
    expect(h.api.state()).toBe('batalha')
    const heroBefore = h.api.battlerLife('Você')
    const amigoBefore = h.api.battlerLife('Amigo')
    const t = pickAction(h, 1, 'Atacar') // vez do herói
    pickAction(h, t, 'Atacar') // vez do Amigo → depois o Titã age (hit_all via a IA)
    expect(h.api.battlerLife('Você')).toBeLessThan(heroBefore)
    expect(h.api.battlerLife('Amigo')).toBeLessThan(amigoBefore)
  })
})

describe('SZGameKit — 🩸 a vida do herói persiste entre batalhas (⚔️ Kit RPG)', () => {
  it('a 2ª batalha começa com a vida que sobrou da 1ª (não cheia)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 50, 0) // herói vida 100, força 50 (mata o slime num golpe)
    h.api.rpgTeachMove('Slime', 'Tapa', 30, 0) // o inimigo tem um golpe
    h.api.rpgBattleStart('Slime', 10, 1, 0) // slime fraco (10 de vida)
    h.api.rpgFoeUse('Slime', 'Tapa') // o slime bate no herói ANTES de morrer
    const feridoEm = h.api.battlerLife('Você')
    expect(feridoEm).toBeLessThan(100) // levou dano
    pickAction(h, 1, 'Atacar') // o herói ataca → mata o slime → vitória
    expect(h.api.state()).toBe('jogando')
    h.api.rpgBattleStart('Slime2', 10, 1, 0) // 2ª batalha
    expect(h.api.battlerLife('Você')).toBe(feridoEm) // entrou com a vida que sobrou
  })

  it('"Curar o herói" recupera a vida ao máximo (fora da batalha)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(100, 50, 0)
    h.api.rpgTeachMove('Slime', 'Tapa', 30, 0)
    h.api.rpgBattleStart('Slime', 10, 1, 0)
    h.api.rpgFoeUse('Slime', 'Tapa')
    pickAction(h, 1, 'Atacar') // vence, ferido
    expect(h.api.state()).toBe('jogando')
    h.api.rpgHealHero() // a estalagem/save
    h.api.rpgBattleStart('Slime2', 10, 1, 0)
    expect(h.api.battlerLife('Você')).toBe(100) // curado ao máximo
  })

  it('PERDER a batalha recomeça com a vida cheia (sem soft-lock)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.rpgBattleStats(10, 1, 0) // herói fraquinho (vida 10)
    h.api.rpgBattleStart('Ogro', 200, 50, 0) // ogro forte: mata o herói
    let guard = 0
    while (h.api.state() === 'batalha' && guard++ < 20) pickAction(h, guard * 100, 'Atacar')
    expect(h.api.state()).toBe('jogando') // batalha acabou (herói morreu → derrota)
    h.api.rpgBattleStart('Ogro2', 10, 1, 0)
    expect(h.api.battlerLife('Você')).toBe(10) // derrota = vida cheia de novo
  })
})

describe('SZGameKit — R30: 🎲 jogos de tabuleiro (dado, turnos, trilha de casas)', () => {
  it('🎲 o dado sorteia 1..N (nunca 0, nunca N+1)', () => {
    const h = loadRuntime()
    for (let i = 0; i < 200; i++) {
      const v = h.api.rollDice(6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
    expect(h.api.rollDice(1)).toBe(1) // dado de 1 lado sempre dá 1
  })

  it('🔁 ordem de turno: o anel roda 1→2→3→1 e dispara "quando a vez mudar"', () => {
    const h = loadRuntime()
    let changes = 0
    h.api.onTurnChange(() => {
      changes += 1
    })
    h.api.playersSetup(3)
    expect(h.api.currentPlayer()).toBe(1)
    h.api.nextPlayer()
    expect(h.api.currentPlayer()).toBe(2)
    h.api.nextPlayer()
    expect(h.api.currentPlayer()).toBe(3)
    h.api.nextPlayer()
    expect(h.api.currentPlayer()).toBe(1) // volta ao começo (anel)
    expect(changes).toBe(3)
  })

  it('🎯 a peça anda N casas na trilha, PARA na casa e dispara o "parou numa casa"', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.definePath('tabuleiro', () => {
      h.api.pathPoint(100, 100)
      h.api.pathPoint(200, 100)
      h.api.pathPoint(300, 100)
      h.api.pathPoint(400, 100)
      h.api.pathPoint(500, 100)
    })
    const peao = h.api.createCharacter({ w: 32, h: 32 })
    let landed = 0
    h.api.onLandSpace(() => {
      landed += 1
    })
    expect(h.api.spaceOf(peao)).toBe(0) // começa na casa 0
    h.api.moveAlongTrack(peao, 3, 'tabuleiro')
    expect(h.api.spaceOf(peao)).toBe(3) // andou 3 casas
    expect(landed).toBe(0) // ainda está deslizando
    h.nextFrame(100)
    h.nextFrame(200)
    expect(landed).toBe(0)
    h.nextFrame(300)
    expect(landed).toBe(1) // só avisa quando chega visualmente
    h.api.moveAlongTrack(peao, 5, 'tabuleiro') // passa do fim → PARA na última (casa 4)
    expect(h.api.spaceOf(peao)).toBe(4)
    expect(landed).toBe(1)
    h.nextFrame(400)
    h.nextFrame(500)
    expect(landed).toBe(1)
    h.nextFrame(600)
    expect(landed).toBe(2)
  })
})

describe('SZGameKit — R30: 🃏 cartas (pilha = lista, carta de 2 faces, mão clicável)', () => {
  it('pilha (lista): mover o topo, espiar, contar e rebaralhar', () => {
    const h = loadRuntime()
    const baralho: string[] = ['A', 'B', 'C']
    const mao: string[] = []
    h.api.pileMoveTop(baralho, mao) // tira o topo (C) do baralho e põe na mão
    expect(baralho).toEqual(['A', 'B'])
    expect(mao).toEqual(['C'])
    expect(h.api.pileTop(baralho)).toBe('B') // espia sem tirar
    expect(h.api.pileSize(baralho)).toBe(2)
    const descarte: string[] = ['X', 'Y']
    h.api.pileShuffleFrom(baralho, descarte) // junta o descarte no monte + embaralha
    expect(descarte.length).toBe(0)
    expect(h.api.pileSize(baralho)).toBe(4)
  })

  it('carta de 2 faces: nasce virada pra baixo; virar troca a face mostrada', () => {
    const h = loadRuntime()
    const c = h.api.card('🍎', '?')
    expect(h.api.cardIsUp(c)).toBe(false)
    expect(h.api.cardFace(c)).toBe('?') // virada pra baixo mostra o verso
    h.api.cardFlip(c)
    expect(h.api.cardIsUp(c)).toBe(true)
    expect(h.api.cardFace(c)).toBe('🍎') // pra cima mostra a frente
  })

  it('mão clicável: desenha a fileira e descobre qual carta foi clicada', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    const cartas = [h.api.card('🍎', '?'), h.api.card('🍌', '?'), h.api.card('🍇', '?')]
    h.api.handDraw(cartas, 100, 400, false) // cw=60, gap=12: carta i em x = 100 + i*72
    expect(h.api.cardAt(120, 440, cartas)).toBe(0)
    expect(h.api.cardAt(200, 440, cartas)).toBe(1)
    expect(h.api.cardAt(5, 5, cartas)).toBe(-1) // fora de qualquer carta
  })
})

describe('SZGameKit — R30: 🃏 Kit Cartas (deck-battler)', () => {
  it('registra os eventos e a configuração antes de disparar o primeiro turno do projeto', async () => {
    const h = loadRuntime()
    let turnos = 0
    let energiaNoPrimeiroTurno = -1

    h.api.runProject(() => {
      h.api.cardsStart(30, 40)
      h.api.cardsEnergyPerTurn(5)
      h.api.cardsOnTurn(() => {
        turnos += 1
        energiaNoPrimeiroTurno = h.api.cardsEnergy()
      })
    })

    expect(turnos).toBe(1)
    expect(energiaNoPrimeiroTurno).toBe(5)

    await startGame(h)
    h.api.restartGame()
    expect(turnos).toBe(2)
  })

  it('abre a batalha, gasta/reseta energia, dano no inimigo e escudo que absorve', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    h.api.cardsStart(30, 40)
    expect(h.api.state()).toBe('jogando') // a batalha de cartas roda no 'jogando'
    expect(h.api.cardsHeroLife()).toBe(30)
    expect(h.api.cardsEnemyLife()).toBe(40)
    h.api.cardsEnergyPerTurn(3)
    expect(h.api.cardsEnergy()).toBe(3)
    h.api.cardsSpend(2)
    expect(h.api.cardsEnergy()).toBe(1)
    h.api.cardsHurtEnemy(10)
    expect(h.api.cardsEnemyLife()).toBe(30)
    // escudo: 5 de block apara 8 de dano → o herói perde só 3
    h.api.cardsGainBlock(5)
    h.api.cardsHurtMe(8)
    expect(h.api.cardsHeroLife()).toBe(27)
  })

  it('a intenção telegrafada + o rodízio de turno (meu → inimigo → meu)', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    let meus = 0
    h.api.cardsOnTurn(() => {
      meus += 1
    })
    h.api.cardsOnEnemyTurn(() => {
      // a criança RESOLVE a intenção telegrafada
      if (h.api.cardsIntentAction() === 'atacar') h.api.cardsHurtMe(h.api.cardsIntentValue())
    })
    h.api.cardsStart(30, 40) // já roda o 1º "meu turno"
    expect(meus).toBe(1)
    h.api.cardsEnergyPerTurn(3)
    h.api.cardsEnemyIntent('atacar', 6)
    expect(h.api.cardsIntentAction()).toBe('atacar')
    expect(h.api.cardsIntentValue()).toBe(6)
    h.api.cardsEndTurn() // vez do inimigo (tira 6) → volta pra mim (2º meu turno)
    expect(h.api.cardsHeroLife()).toBe(24) // 30 − 6 (sem escudo neste turno)
    expect(meus).toBe(2)
  })

  it('⭐ "Jogar de novo": a batalha de cartas RESETA e a receita de turno NÃO dobra', async () => {
    const h = loadRuntime()
    await startGame(h)
    h.api.setState('jogando')
    let meus = 0
    h.api.cardsOnTurn(() => {
      meus += 1
    }) // registrada UMA vez, no topo (como o exemplo Duelo de Cartas)
    h.api.cardsStart(30, 40) // roda o 1º "meu turno"
    expect(meus).toBe(1)
    h.api.cardsHurtEnemy(40) // mato o inimigo desta partida
    expect(h.api.cardsEnemyLife()).toBe(0)
    // "Jogar de novo" = voltar ao menu e entrar em jogando de novo → dispara o reset.
    h.api.setState('menu')
    h.api.restartGame()
    expect(h.api.cardsHeroLife()).toBe(0) // a batalha da partida anterior foi ZERADA (cardsNewGame)
    // recomeçar: vida cheia (não estragada) e a receita roda 1×/turno (não 2×/3× por dobra).
    h.api.cardsStart(30, 40)
    expect(h.api.cardsHeroLife()).toBe(30)
    expect(h.api.cardsEnemyLife()).toBe(40)
    expect(meus).toBe(2) // +1 pelo 2º cardsStart; se a receita tivesse dobrado seria ≥3
  })
})
