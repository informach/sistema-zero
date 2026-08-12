import { describe, expect, it } from 'bun:test'
import { REINO_ZERO_ULTRA_STAGES, validateReinoZeroUltraStage } from './reinoZeroUltraData'
import { REINO_ZERO_ULTRA_SOURCE } from './reinoZeroUltraSource'

interface TestActor {
  id: string
  kind: string
  x: number
  y: number
  originX: number
  originY: number
  w: number
  h: number
  health: number
  dead: boolean
  state?: string
  owner?: number
  variant?: string
}

interface TestPlayer {
  x: number
  y: number
  vy: number
  w: number
  h: number
  life: number
  invulnerable: number
  grounded: boolean
  active: boolean
  power: string
}

interface TestPlatform {
  x: number
  y: number
  lastX: number
  lastY: number
  w: number
  h: number
}

interface TestStage {
  id: string
  width: number
  height: number
  tiles: string[]
}

interface EngineState {
  mode: string
  stage: TestStage
  stageIndex: number
  players: TestPlayer[]
  actors: TestActor[]
  platforms: TestPlatform[]
  shots: object[]
  cameraX: number
  timeLeft: number
  score: number
  coins: number
  gems: string[]
  hint: string
  lives: number
  touch: Record<string, boolean>
  usedTiles: string[]
  brokenTiles: string[]
  unlocked: number
  replayMode: boolean
  recoveryNotice: string
  playMode: string
  activeTurn: number
  turnProfiles: Array<{ lives: number; score: number; coins: number; power: string }>
  playback: number[][]
  playbackAt: number
}

type EnginePatch = Partial<EngineState>

interface EngineHarness {
  beginReplay(): void
  completeStage(nextId: string): void
  drawActor(actor: TestActor): void
  getState(): EngineState
  hurtPlayer(player: TestPlayer): void
  loadStage(id: string): void
  movePlayer(player: TestPlayer, dx: number, dy: number): void
  setState(patch: EnginePatch): void
  selectPlayMode(mode: string): void
  updateActors(dt: number): void
  updateGame(dt: number): void
  updatePlayer(player: TestPlayer, input: object, dt: number): void
  updateShots(dt: number): void
  startFragileTile(px: number, py: number): void
  tileAt(px: number, py: number): string
  updateFragileTiles(dt: number): void
  useBlock(px: number, py: number, player: TestPlayer): void
}

interface DrawCall {
  style: string
  x: number
  y: number
  width: number
  height: number
}

interface RuntimeHarness {
  drawCalls: DrawCall[]
  engine: EngineHarness
  fireButton(id: string, type: string, event: Record<string, unknown>): void
  fireDocument(type: string, event: Record<string, unknown>): void
  fireWindow(type: string, event: Record<string, unknown>): void
  storage: Map<string, string>
  transformCalls: number[][]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isEngineHarness(value: unknown): value is EngineHarness {
  if (!isRecord(value)) return false
  return [
    'beginReplay',
    'completeStage',
    'drawActor',
    'getState',
    'hurtPlayer',
    'loadStage',
    'movePlayer',
    'setState',
    'selectPlayMode',
    'updateActors',
    'updateGame',
    'updatePlayer',
    'updateShots',
    'startFragileTile',
    'tileAt',
    'updateFragileTiles',
    'useBlock',
  ].every((key) => typeof value[key] === 'function')
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

function createRuntimeHarness(
  initialStorage: Record<string, string> = {},
  options: { devicePixelRatio?: number; pointerCaptureThrows?: boolean } = {},
): RuntimeHarness {
  const drawCalls: DrawCall[] = []
  const transformCalls: number[][] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1,
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    strokeRect() {},
    fillText() {},
    setTransform(...values: number[]) {
      transformCalls.push(values)
    },
    fillRect(x: number, y: number, width: number, height: number) {
      drawCalls.push({ style: context.fillStyle, x, y, width, height })
    },
  }
  type Listener = (event: Record<string, unknown>) => void
  const buttonListeners = new Map<string, Map<string, Listener[]>>()
  const buttons = new Map<
    string,
    { addEventListener: (type: string, listener: Listener) => void }
  >()
  const buttonFor = (id: string) => {
    const existing = buttons.get(id)
    if (existing) return existing
    const listeners = new Map<string, Listener[]>()
    buttonListeners.set(id, listeners)
    const button = {
      addEventListener(type: string, listener: Listener) {
        const current = listeners.get(type) ?? []
        current.push(listener)
        listeners.set(type, current)
      },
      setPointerCapture() {
        if (options.pointerCaptureThrows) throw new Error('ponteiro inativo')
      },
      releasePointerCapture() {},
    }
    buttons.set(id, button)
    return button
  }
  const status = { textContent: '' }
  const announcement = { textContent: '' }
  const canvas = { width: 960, height: 540, getContext: () => context }
  const documentListeners = new Map<string, Listener[]>()
  const document = {
    visibilityState: 'visible',
    addEventListener(type: string, listener: Listener) {
      const current = documentListeners.get(type) ?? []
      current.push(listener)
      documentListeners.set(type, current)
    },
    getElementById(id: string) {
      if (id === 'reino-zero-ultra') return canvas
      if (id === 'reino-status') return status
      if (id === 'reino-announcement') return announcement
      return buttonFor(id)
    },
  }
  const storage = new Map<string, string>(Object.entries(initialStorage))
  const localStorage = {
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
    removeItem(key: string) {
      storage.delete(key)
    },
  }
  const sessionStorageMap = new Map<string, string>()
  const sessionStorage = {
    getItem(key: string) {
      return sessionStorageMap.get(key) ?? null
    },
    setItem(key: string, value: string) {
      sessionStorageMap.set(key, value)
    },
    removeItem(key: string) {
      sessionStorageMap.delete(key)
    },
  }
  const input = {
    gamepadAxis: () => 0,
    gamepadButton: () => 0,
    key: () => false,
  }
  const audio = { ruido() {}, tom() {} }
  const windowListeners = new Map<string, Listener[]>()
  const window = {
    devicePixelRatio: options.devicePixelRatio ?? 1,
    addEventListener(type: string, listener: Listener) {
      const current = windowListeners.get(type) ?? []
      current.push(listener)
      windowListeners.set(type, current)
    },
    confirm: () => true,
    matchMedia: () => ({ matches: false }),
  }
  const expose = `
return {
  beginReplay: beginReplay,
  completeStage: completeStage,
  drawActor: function (actor) { drawActor(actor, THEMES[stage.theme]); },
  getState: function () {
    return {
      mode: mode,
      stage: stage,
      stageIndex: stageIndex,
      players: players,
      actors: actors,
      platforms: platforms,
      shots: shots,
      cameraX: cameraX,
      timeLeft: timeLeft,
      score: score,
      coins: coins,
      gems: gems,
      hint: hint,
      lives: lives,
      touch: touch,
      usedTiles: usedTiles,
      brokenTiles: brokenTiles,
      unlocked: unlocked,
      replayMode: replayMode,
      recoveryNotice: recoveryNotice,
      playMode: playMode,
      activeTurn: activeTurn,
      turnProfiles: turnProfiles,
      playback: playback,
      playbackAt: playbackAt
    };
  },
  hurtPlayer: hurtPlayer,
  loadStage: loadStage,
  movePlayer: movePlayer,
  setState: function (patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "mode")) mode = patch.mode;
    if (Object.prototype.hasOwnProperty.call(patch, "stage")) stage = patch.stage;
    if (Object.prototype.hasOwnProperty.call(patch, "stageIndex")) stageIndex = patch.stageIndex;
    if (Object.prototype.hasOwnProperty.call(patch, "players")) players = patch.players;
    if (Object.prototype.hasOwnProperty.call(patch, "actors")) actors = patch.actors;
    if (Object.prototype.hasOwnProperty.call(patch, "platforms")) platforms = patch.platforms;
    if (Object.prototype.hasOwnProperty.call(patch, "shots")) shots = patch.shots;
    if (Object.prototype.hasOwnProperty.call(patch, "cameraX")) cameraX = patch.cameraX;
    if (Object.prototype.hasOwnProperty.call(patch, "timeLeft")) timeLeft = patch.timeLeft;
    if (Object.prototype.hasOwnProperty.call(patch, "score")) score = patch.score;
    if (Object.prototype.hasOwnProperty.call(patch, "coins")) coins = patch.coins;
    if (Object.prototype.hasOwnProperty.call(patch, "gems")) gems = patch.gems;
    if (Object.prototype.hasOwnProperty.call(patch, "lives")) lives = patch.lives;
    if (Object.prototype.hasOwnProperty.call(patch, "replayMode")) replayMode = patch.replayMode;
    if (Object.prototype.hasOwnProperty.call(patch, "playback")) playback = patch.playback;
    if (Object.prototype.hasOwnProperty.call(patch, "playbackAt")) playbackAt = patch.playbackAt;
    if (Object.prototype.hasOwnProperty.call(patch, "playMode")) playMode = patch.playMode;
    if (Object.prototype.hasOwnProperty.call(patch, "activeTurn")) activeTurn = patch.activeTurn;
    if (Object.prototype.hasOwnProperty.call(patch, "turnProfiles")) turnProfiles = patch.turnProfiles;
  },
  selectPlayMode: selectPlayMode,
  updateActors: updateActors,
  updateGame: updateGame,
  updatePlayer: updatePlayer,
  updateShots: updateShots
  , startFragileTile: startFragileTile
  , tileAt: tileAt
  , updateFragileTiles: updateFragileTiles
  , useBlock: useBlock
};`
  const factory = new Function(
    '__szAudio',
    '__szInput',
    'document',
    'localStorage',
    'sessionStorage',
    'requestAnimationFrame',
    'setTimeout',
    'window',
    `${REINO_ZERO_ULTRA_SOURCE}\n${expose}`,
  )
  const candidate: unknown = factory(
    audio,
    input,
    document,
    localStorage,
    sessionStorage,
    () => 0,
    () => 0,
    window,
  )
  if (!isEngineHarness(candidate)) throw new Error('O motor não expôs o contrato do harness.')
  const fire = (
    listeners: Map<string, Listener[]>,
    type: string,
    event: Record<string, unknown>,
  ) => {
    for (const listener of listeners.get(type) ?? []) listener(event)
  }
  return {
    drawCalls,
    engine: candidate,
    fireButton(id, type, event) {
      fire(buttonListeners.get(id) ?? new Map(), type, event)
    },
    fireDocument(type, event) {
      fire(documentListeners, type, event)
    },
    fireWindow(type, event) {
      fire(windowListeners, type, event)
    },
    storage,
    transformCalls,
  }
}

const NO_INPUT = { left: false, right: false, jump: false, action: false }

describe('Reino Zero Ultra — regressões do motor', () => {
  it('deixa o jogador cair por uma lacuna até sofrer dano', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-1')
    const state = engine.getState()
    const floor = required(state.stage.tiles.at(-1), 'A fase inicial não tem linha de piso.')
    const gap = [...floor].indexOf('.')
    expect(gap).toBeGreaterThan(0)
    const player = required(state.players[0], 'O jogador principal não foi criado.')
    player.x = gap * 32 + 4
    player.y = (state.stage.height - 2) * 32
    for (let frame = 0; frame < 240; frame += 1) engine.updatePlayer(player, NO_INPUT, 1 / 60)
    expect(player.life < 3 || engine.getState().lives < 5).toBe(true)
  })

  it('rejeita fases sem instrução inicial ou sem saída', () => {
    const base = structuredClone(required(REINO_ZERO_ULTRA_STAGES[0], 'A fase inicial não existe.'))
    expect(validateReinoZeroUltraStage({ ...base, triggers: [] })).toBeNull()
    expect(
      validateReinoZeroUltraStage({
        ...base,
        entities: base.entities.filter((entity) => entity.kind !== 'exit'),
      }),
    ).toBeNull()
  })

  it('não recria nem pontua novamente uma gema persistente', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-4')
    let state = engine.getState()
    const gem = required(
      state.actors.find((actor) => actor.kind === 'gem'),
      'A fase de guardião não contém gema.',
    )
    const player = required(state.players[0], 'O jogador principal não foi criado.')
    player.x = gem.x
    player.y = gem.y
    engine.updateActors(0)
    expect(engine.getState().score).toBe(1500)
    engine.loadStage('1-4')
    state = engine.getState()
    expect(state.actors.some((actor) => actor.kind === 'gem' && !actor.dead)).toBe(false)
    expect(state.score).toBe(1500)
  })

  it('premia somente moedas obtidas na fase concluída', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-1')
    engine.setState({ coins: 10, score: 0, timeLeft: 0 })
    engine.completeStage('1-2')
    const firstScore = engine.getState().score
    engine.setState({ mode: 'playing', timeLeft: 0 })
    engine.completeStage('1-3')
    expect(engine.getState().score).toBe(firstScore)
  })

  it('encerra a partida quando a última vida é perdida', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-1')
    const player = required(engine.getState().players[0], 'O jogador principal não foi criado.')
    player.life = 1
    player.invulnerable = 0
    engine.setState({ lives: 1 })
    engine.hurtPlayer(player)
    expect(engine.getState().lives).toBe(0)
    expect(engine.getState().mode).toBe('gameover')
  })

  it('desenha cada guardião com a barra cheia em sua vida inicial', () => {
    const { drawCalls, engine } = createRuntimeHarness()
    engine.loadStage('1-4')
    const boss = required(
      engine.getState().actors.find((actor) => actor.kind === 'boss'),
      'A fase final do mundo não contém guardião.',
    )
    engine.setState({ cameraX: boss.x - 100 })
    drawCalls.length = 0
    engine.drawActor(boss)
    const healthBar = drawCalls.find((call) => call.style === '#ef5b5b')
    expect(healthBar?.width).toBe(boss.w)
  })

  it('carrega o jogador junto com uma plataforma vertical', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-3')
    const state = engine.getState()
    const platform = required(state.platforms[0], 'A fase não contém plataforma móvel.')
    const player = required(state.players[0], 'O jogador principal não foi criado.')
    platform.lastY = platform.y
    player.x = platform.x + 8
    player.y = platform.lastY - player.h
    platform.y += 6
    engine.movePlayer(player, 0, 0)
    expect(player.y).toBe(platform.y - player.h)
  })

  it('remove projéteis expirados da coleção ativa', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-1')
    engine.setState({
      shots: [{ x: 100, y: 100, w: 9, h: 9, vx: 0, life: 0.01, owner: 0, dead: false }],
    })
    engine.updateShots(1)
    expect(engine.getState().shots).toHaveLength(0)
  })

  it('reproduz entradas sem alterar o estado persistente da sessão', () => {
    const { engine, storage } = createRuntimeHarness()
    engine.loadStage('1-1')
    const state = engine.getState()
    const coin = required(
      state.actors.find((actor) => actor.kind === 'coin'),
      'A fase inicial não contém moeda.',
    )
    const player = required(state.players[0], 'O jogador principal não foi criado.')
    player.x = coin.x
    player.y = coin.y
    storage.set('reino-zero-ultra-save', 'save-original')
    engine.setState({ playback: [[0, 0]], playbackAt: 0, replayMode: true })
    engine.updateGame(1 / 60)
    const after = engine.getState()
    expect(after.score).toBe(0)
    expect(after.coins).toBe(0)
    expect(after.gems).toEqual([])
    expect(after.lives).toBe(5)
    expect(storage.get('reino-zero-ultra-save')).toBe('save-original')
  })

  it('recusa uma gravação com códigos de entrada inválidos', () => {
    const { engine } = createRuntimeHarness()
    engine.setState({ playback: [[99, 0]], playbackAt: 0 })
    engine.beginReplay()
    expect(engine.getState().mode).toBe('title')
    expect(engine.getState().replayMode).toBe(false)
  })

  it('migra automaticamente um save v1 e preserva o progresso válido', () => {
    const legacy = JSON.stringify({
      version: 1,
      stageId: '2-3',
      unlocked: 7,
      score: 4200,
      coins: 31,
      gems: ['gema-1'],
      lives: 4,
      playerCount: 1,
      replay: [],
    })
    const { engine, storage } = createRuntimeHarness({ 'reino-zero-ultra-save': legacy })
    const state = engine.getState()
    expect(state.stage.id).toBe('2-3')
    expect(state.unlocked).toBe(7)
    expect(state.score).toBe(4200)
    expect(state.coins).toBe(31)
    expect(state.gems).toEqual(['1-4:gema-1'])
    expect(
      JSON.parse(required(storage.get('reino-zero-ultra-save'), 'Save migrado ausente')).version,
    ).toBe(2)
  })

  it('repara campos corrompidos do save v1 sem propagar NaN', () => {
    const malformed = JSON.stringify({
      version: 1,
      stageId: 'fase-inexistente',
      unlocked: 'oops',
      score: -10,
      coins: null,
      gems: [42, 'gema-1'],
      lives: 'muitas',
      playerCount: 99,
      replay: [[99, 0]],
    })
    const { engine, storage } = createRuntimeHarness({ 'reino-zero-ultra-save': malformed })
    const state = engine.getState()
    expect(state.stage.id).toBe('1-1')
    expect(state.unlocked).toBe(1)
    expect(state.score).toBe(0)
    expect(state.coins).toBe(0)
    expect(state.lives).toBe(5)
    expect(state.gems).toEqual(['1-4:gema-1'])
    expect(
      JSON.parse(required(storage.get('reino-zero-ultra-save'), 'Save reparado ausente')).version,
    ).toBe(2)
  })

  it('recupera o backup v2 quando o slot principal está corrompido', () => {
    const seed = createRuntimeHarness()
    seed.engine.loadStage('1-1')
    seed.engine.setState({ score: 500, timeLeft: 0 })
    seed.engine.completeStage('1-2')
    const valid = required(seed.storage.get('reino-zero-ultra-save'), 'Save v2 não foi criado.')

    const recovered = createRuntimeHarness({
      'reino-zero-ultra-save': '{quebrado',
      'reino-zero-ultra-save-backup': valid,
    })

    expect(recovered.engine.getState().score).toBe(500)
    expect(recovered.engine.getState().recoveryNotice).toContain('recuperado')
    expect(recovered.storage.get('reino-zero-ultra-save')).toBe(valid)
    expect(recovered.storage.get('reino-zero-ultra-save-corrupt')).toBe('{quebrado')
  })

  it('preserva o payload irrecuperável e cria um save v2 limpo', () => {
    const runtime = createRuntimeHarness({
      'reino-zero-ultra-save': '{quebrado',
      'reino-zero-ultra-save-backup': '[]',
    })
    const state = runtime.engine.getState()
    expect(state.stage.id).toBe('1-1')
    expect(state.unlocked).toBe(1)
    expect(state.recoveryNotice).toContain('corrompido')
    expect(runtime.storage.get('reino-zero-ultra-save-corrupt')).toBe('{quebrado')
    expect(
      JSON.parse(required(runtime.storage.get('reino-zero-ultra-save'), 'Save limpo ausente'))
        .version,
    ).toBe(2)
  })

  it('solta controles de toque em cancelamento, perda de captura e blur', () => {
    const { engine, fireButton, fireWindow } = createRuntimeHarness()
    const down = { pointerId: 1, preventDefault() {} }
    fireButton('touch-left', 'pointerdown', down)
    fireButton('touch-right', 'pointerdown', { pointerId: 2, preventDefault() {} })
    expect(engine.getState().touch.left).toBe(true)
    expect(engine.getState().touch.right).toBe(true)
    fireButton('touch-left', 'pointercancel', { pointerId: 1, preventDefault() {} })
    expect(engine.getState().touch.left).toBe(false)
    expect(engine.getState().touch.right).toBe(true)
    fireButton('touch-right', 'lostpointercapture', { pointerId: 2, preventDefault() {} })
    expect(engine.getState().touch.right).toBe(false)
    fireButton('touch-jump', 'pointerdown', { pointerId: 3, preventDefault() {} })
    fireWindow('blur', {})
    expect(engine.getState().touch.jump).toBe(false)

    const inactivePointer = createRuntimeHarness({}, { pointerCaptureThrows: true })
    expect(() =>
      inactivePointer.fireButton('touch-action', 'pointerdown', {
        pointerId: 4,
        preventDefault() {},
      }),
    ).not.toThrow()
    expect(inactivePointer.engine.getState().touch.action).toBe(true)
  })

  it('escala o backing store do Canvas pelo DPR sem mudar as coordenadas lógicas', () => {
    const { transformCalls } = createRuntimeHarness({}, { devicePixelRatio: 2 })
    expect(transformCalls).toContainEqual([2, 0, 0, 2, 0, 0])
  })

  it('transforma bloco de recompensa em usado sem pagar duas vezes', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-1')
    const player = required(engine.getState().players[0], 'Jogador ausente.')
    engine.useBlock(12 * 32, 8 * 32, player)
    expect(engine.getState().coins).toBe(1)
    expect(engine.tileAt(12 * 32, 8 * 32)).toBe('U')
    engine.useBlock(12 * 32, 8 * 32, player)
    expect(engine.getState().coins).toBe(1)
  })

  it('derruba plataformas frágeis depois do atraso determinístico', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('1-2')
    expect(engine.tileAt(40 * 32, 10 * 32)).toBe('F')
    engine.startFragileTile(40 * 32, 10 * 32)
    engine.updateFragileTiles(0.6)
    expect(engine.tileAt(40 * 32, 10 * 32)).toBe('.')
  })

  it('permite braçada na água sem tratar água como morte instantânea', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('3-1')
    const player = required(engine.getState().players[0], 'Jogador ausente.')
    player.x = 22 * 32
    player.y = 13 * 32
    const beforeLives = engine.getState().lives
    engine.updatePlayer(
      player,
      { left: false, right: false, jump: true, action: false, up: false, down: false },
      1 / 60,
    )
    expect(player.vy).toBeLessThan(0)
    expect(engine.getState().lives).toBe(beforeLives)
  })

  it('atravessa portal autorado somente com a ação do jogador', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('3-3')
    const state = engine.getState()
    const portal = required(
      state.actors.find((actor) => actor.kind === 'portal'),
      'Portal ausente.',
    )
    const player = required(state.players[0], 'Jogador ausente.')
    player.x = portal.x
    player.y = portal.y
    ;(player as TestPlayer & { prevAction: boolean }).prevAction = true
    engine.updateActors(0)
    expect(player.x).not.toBe(portal.x)
  })

  it('arremessadores produzem projéteis hostis e cascos têm estado próprio', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('2-2')
    engine.updateActors(2)
    expect(engine.getState().shots.some((shot) => (shot as { owner?: number }).owner === -1)).toBe(
      true,
    )

    engine.loadStage('1-1')
    const state = engine.getState()
    const shell = required(
      state.actors.find((actor) => actor.kind === 'shell'),
      'Casco ausente.',
    )
    const player = required(state.players[0], 'Jogador ausente.')
    player.x = shell.x
    player.y = shell.y - player.h + 2
    ;(player as TestPlayer & { vy: number }).vy = 250
    engine.updateActors(0)
    expect(shell.state).toBe('shell')
  })

  it('escadas e trampolins ativam movimentos verticais próprios', () => {
    const { engine } = createRuntimeHarness()
    engine.loadStage('2-1')
    let player = required(engine.getState().players[0], 'Jogador ausente.')
    player.x = 22 * 32
    player.y = 12 * 32
    engine.updatePlayer(
      player,
      { left: false, right: false, jump: false, action: false, up: true, down: false },
      1 / 60,
    )
    expect(player.vy).toBeLessThan(0)

    engine.loadStage('1-1')
    player = required(engine.getState().players[0], 'Jogador ausente.')
    player.x = 53 * 32 + 4
    player.y = 14 * 32 - player.h - 2
    ;(player as TestPlayer & { vy: number }).vy = 200
    engine.movePlayer(player, 0, 8)
    expect(player.vy).toBe(-720)
  })

  it('entrega oito guardiões autorais com variantes e padrões distintos', () => {
    const { engine } = createRuntimeHarness()
    const variants = new Set<string>()
    const signatures = new Set<string>()
    for (let world = 1; world <= 8; world += 1) {
      engine.loadStage(`${world}-4`)
      const boss = required(
        engine.getState().actors.find((actor) => actor.kind === 'boss'),
        `Guardião ${world} ausente.`,
      )
      variants.add(boss.variant ?? '')
      engine.updateActors(1.5)
      signatures.add(
        `${Math.round(boss.x - boss.originX)}:${Math.round(boss.y - boss.originY)}:${engine.getState().shots.length}`,
      )
    }
    expect(variants.size).toBe(8)
    expect(signatures.size).toBeGreaterThanOrEqual(5)
  })

  it('oferece solo, turnos alternados com perfis separados e cooperativo simultâneo', () => {
    const { engine } = createRuntimeHarness()
    engine.selectPlayMode('solo')
    engine.loadStage('1-1')
    expect(engine.getState().players.map((player) => player.active)).toEqual([true, false])

    engine.selectPlayMode('turns')
    engine.loadStage('1-1')
    let state = engine.getState()
    expect(state.players.map((player) => player.active)).toEqual([true, false])
    const first = required(state.players[0], 'P1 ausente.')
    first.life = 1
    engine.setState({ lives: 1, score: 700, coins: 9 })
    engine.hurtPlayer(first)
    state = engine.getState()
    expect(state.mode).toBe('turnswitch')
    expect(state.activeTurn).toBe(1)
    expect(state.score).toBe(0)
    expect(state.turnProfiles[0]).toEqual(
      expect.objectContaining({ lives: 0, score: 700, coins: 9 }),
    )
    engine.updateGame(1)
    expect(engine.getState().players.map((player) => player.active)).toEqual([false, true])

    engine.selectPlayMode('coop')
    engine.loadStage('1-1')
    state = engine.getState()
    expect(state.players.map((player) => player.active)).toEqual([true, true])
    const leader = required(state.players[0], 'P1 ausente.')
    const follower = required(state.players[1], 'P2 ausente.')
    leader.x = 1400
    follower.x = 100
    engine.updateGame(0)
    expect(Math.abs(leader.x - follower.x)).toBeLessThan(100)
  })

  it('persiste e recupera o turno e os dois perfis sem misturar pontuações', () => {
    const firstSession = createRuntimeHarness()
    firstSession.engine.selectPlayMode('turns')
    firstSession.engine.loadStage('1-1')
    const player = required(firstSession.engine.getState().players[0], 'P1 ausente.')
    player.life = 1
    firstSession.engine.setState({ lives: 1, score: 321, coins: 7 })
    firstSession.engine.hurtPlayer(player)
    const saved = required(
      firstSession.storage.get('reino-zero-ultra-save'),
      'Save de turnos ausente.',
    )

    const recovered = createRuntimeHarness({ 'reino-zero-ultra-save': saved })
    const state = recovered.engine.getState()
    expect(state.playMode).toBe('turns')
    expect(state.activeTurn).toBe(1)
    expect(state.turnProfiles[0]).toEqual(
      expect.objectContaining({ lives: 0, score: 321, coins: 7 }),
    )
    expect(state.score).toBe(0)
  })
})
