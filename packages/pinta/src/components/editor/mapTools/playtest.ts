/**
 * O "testar com personagem" do mapa, só a CONTA (sem tela): andar segurando a tecla, bater
 * nas paredes e escorregar ao longo delas, cair e pular na vista de lado, entrar em portas e
 * voltar ao começo ao tocar num lugar perigoso. A janela só desenha o que sai daqui.
 */

export type PlaytestView = 'top' | 'side'

export interface PlaytestPoint {
  x: number
  y: number
}

/** Uma área do mapa que faz algo quando o personagem entra (porta ou lugar perigoso). */
export interface PlaytestArea {
  id: string
  name: string
  contains: (x: number, y: number) => boolean
  /** Só nas portas: o mapa de destino (id ou nome). */
  target?: string
}

/** O mundo do teste: onde é parede e onde estão as áreas. Tudo em pixels do mapa. */
export interface PlaytestWorld {
  tileSize: number
  solidAt: (x: number, y: number) => boolean
  spawn: PlaytestPoint
  doors: readonly PlaytestArea[]
  hazards: readonly PlaytestArea[]
}

export interface PlaytestInput {
  /** -1 esquerda, 1 direita. */
  x: number
  /** -1 cima, 1 baixo (só na vista de cima). */
  y: number
  jump: boolean
}

export interface PlaytestState {
  /** O MEIO do corpo do personagem. */
  x: number
  y: number
  vx: number
  vy: number
  /** Com os pés no chão (só na vista de lado). */
  onGround: boolean
  /** Para que lado ele olha: -1 esquerda, 1 direita. */
  facing: -1 | 1
}

export type PlaytestEvent =
  | { kind: 'door'; area: PlaytestArea }
  | { kind: 'hazard'; area: PlaytestArea }
  | null

/** As medidas do jogo, em PEÇAS (multiplicadas pelo tamanho da peça do mapa). */
export const PLAYTEST_TUNING = {
  /** Peças por segundo ao andar. */
  speed: 6,
  /** Peças por segundo ao quadrado. */
  gravity: 40,
  /** Altura do pulo, em peças. */
  jumpHeight: 2.6,
  /** Velocidade máxima de queda, em peças por segundo. */
  maxFall: 18,
  /** Largura do corpo, em peças. */
  bodyWidth: 0.6,
  bodyHeightTop: 0.6,
  bodyHeightSide: 0.9,
  /** Um quadro nunca vale mais que isto (a aba parada não vira um salto gigante). */
  maxStepMs: 50,
} as const

export function playtestBody(tileSize: number, view: PlaytestView): { hw: number; hh: number } {
  return {
    hw: (tileSize * PLAYTEST_TUNING.bodyWidth) / 2,
    hh:
      (tileSize *
        (view === 'side' ? PLAYTEST_TUNING.bodyHeightSide : PLAYTEST_TUNING.bodyHeightTop)) /
      2,
  }
}

/** O corpo cabe aqui? Confere a borda inteira do corpo, de meia em meia peça no máximo. */
export function playtestFree(
  world: PlaytestWorld,
  view: PlaytestView,
  x: number,
  y: number,
): boolean {
  const { hw, hh } = playtestBody(world.tileSize, view)
  const spread = (half: number): number[] => {
    const parts = Math.max(1, Math.ceil((2 * half) / (world.tileSize / 2)))
    return Array.from({ length: parts + 1 }, (_, i) => -half + (2 * half * i) / parts)
  }
  // Uma lasquinha para dentro: encostar na parede não conta como estar dentro dela.
  const inset = 0.001
  for (const ox of spread(hw - inset))
    for (const oy of spread(hh - inset)) if (world.solidAt(x + ox, y + oy)) return false
  return true
}

/** O personagem no começo do mapa, parado. Se o começo cai numa parede, fica onde foi posto. */
export function playtestStart(world: PlaytestWorld): PlaytestState {
  return { x: world.spawn.x, y: world.spawn.y, vx: 0, vy: 0, onGround: false, facing: 1 }
}

/**
 * Anda `delta` num eixo só, em passinhos, e para ENCOSTADO na parede. Devolve a posição nova
 * e se bateu. Um eixo de cada vez é o que faz o personagem escorregar ao longo da parede.
 */
function moveAxis(
  world: PlaytestWorld,
  view: PlaytestView,
  state: PlaytestPoint,
  axis: 'x' | 'y',
  delta: number,
): { value: number; blocked: boolean } {
  let value = state[axis]
  if (delta === 0) return { value, blocked: false }
  const at = (v: number): boolean =>
    axis === 'x' ? playtestFree(world, view, v, state.y) : playtestFree(world, view, state.x, v)
  const maxStep = Math.max(1, world.tileSize / 4)
  let left = Math.abs(delta)
  const sign = Math.sign(delta)
  while (left > 0) {
    let step = Math.min(left, maxStep)
    if (at(value + sign * step)) {
      value += sign * step
      left -= step
      continue
    }
    // Bateu: chega o mais perto que der, cortando o passo ao meio.
    while (step > 0.05) {
      step /= 2
      if (at(value + sign * step)) value += sign * step
    }
    return { value, blocked: true }
  }
  return { value, blocked: false }
}

/**
 * Um passo do jogo: `dtMs` milissegundos com as teclas de `input` seguradas.
 * Devolve o estado novo e o que aconteceu (porta, perigo ou nada).
 */
export function stepPlaytest(
  state: PlaytestState,
  input: PlaytestInput,
  dtMs: number,
  world: PlaytestWorld,
  view: PlaytestView,
): { state: PlaytestState; event: PlaytestEvent } {
  const dt = Math.max(0, Math.min(dtMs, PLAYTEST_TUNING.maxStepMs)) / 1000
  const size = world.tileSize
  const speed = PLAYTEST_TUNING.speed * size
  const next: PlaytestState = { ...state }
  const ix = Math.sign(input.x),
    iy = Math.sign(input.y)
  if (ix) next.facing = ix < 0 ? -1 : 1
  if (view === 'top') {
    // Na diagonal a velocidade é a mesma (não anda mais rápido por apertar duas teclas).
    const length = Math.hypot(ix, iy) || 1
    next.vx = (ix / length) * speed
    next.vy = (iy / length) * speed
    next.onGround = false
  } else {
    next.vx = ix * speed
    const gravity = PLAYTEST_TUNING.gravity * size
    if (input.jump && state.onGround) {
      next.vy = -Math.sqrt(2 * gravity * PLAYTEST_TUNING.jumpHeight * size)
      next.onGround = false
    }
    next.vy = Math.min(next.vy + gravity * dt, PLAYTEST_TUNING.maxFall * size)
  }
  const movedX = moveAxis(world, view, next, 'x', next.vx * dt)
  next.x = movedX.value
  if (movedX.blocked) next.vx = 0
  const movedY = moveAxis(world, view, next, 'y', next.vy * dt)
  next.y = movedY.value
  if (view === 'side') {
    if (movedY.blocked) {
      // Bateu descendo = pousou; bateu subindo = cabeça no teto.
      next.onGround = next.vy > 0
      next.vy = 0
    } else next.onGround = false
  } else if (movedY.blocked) next.vy = 0

  const hazard = world.hazards.find((area) => area.contains(next.x, next.y))
  if (hazard) return { state: playtestStart(world), event: { kind: 'hazard', area: hazard } }
  const door = world.doors.find((area) => area.contains(next.x, next.y))
  if (door) return { state: next, event: { kind: 'door', area: door } }
  return { state: next, event: null }
}

/** A câmera segue o personagem sem mostrar fora do mapa (mapa menor que a tela fica no canto). */
export function playtestCamera(
  focus: PlaytestPoint,
  view: { width: number; height: number },
  map: { width: number; height: number },
): PlaytestPoint {
  return {
    x: Math.max(0, Math.min(map.width - view.width, focus.x - view.width / 2)),
    y: Math.max(0, Math.min(map.height - view.height, focus.y - view.height / 2)),
  }
}

/** As teclas seguradas viram a direção: setas e W, A, S, D; espaço (e "para cima") pula. */
export function playtestInput(held: ReadonlySet<string>, view: PlaytestView): PlaytestInput {
  const has = (...keys: string[]): boolean => keys.some((key) => held.has(key))
  const left = has('arrowleft', 'a'),
    right = has('arrowright', 'd'),
    up = has('arrowup', 'w'),
    down = has('arrowdown', 's')
  return {
    x: (right ? 1 : 0) - (left ? 1 : 0),
    y: view === 'top' ? (down ? 1 : 0) - (up ? 1 : 0) : 0,
    jump: view === 'side' && (up || has(' ', 'space', 'spacebar')),
  }
}

/** O nome da tecla como o teste guarda (minúsculo; o espaço é `' '`). */
export function playtestKey(key: string): string | null {
  const k = key.toLowerCase()
  return [
    'arrowleft',
    'arrowright',
    'arrowup',
    'arrowdown',
    'a',
    'd',
    'w',
    's',
    ' ',
    'spacebar',
  ].includes(k)
    ? k
    : null
}
