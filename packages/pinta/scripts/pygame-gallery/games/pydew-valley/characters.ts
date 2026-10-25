/**
 * PyDew Valley: the farmer (walking, idle and using the hoe, the axe and the watering can in four
 * directions) and the trader. Frames are 86x62 (172x124 in the game) with the farmer in the
 * middle: the tools reach the spot the game aims at (PLAYER_TOOL_OFFSET).
 */
import type { SpriteDrawing } from '../../drawing'
import { darken, lighten, Px } from '../../pixel'
import { INK, METAL, WATER, WOOD } from './palette'

const W = 86
const H = 62
const CX = 43

const HAT = '#f0c95e'
const HAT_DARK = '#c99a38'
const HAT_LIGHT = '#fbe39a'
const BAND = '#d2493f'
const SKIN = '#f6c9a2'
const SKIN_DARK = '#dda07c'
const HAIR = '#8a4f2c'
const HAIR_DARK = '#663a20'
const SHIRT = '#e0574a'
const SHIRT_DARK = '#b13d38'
const SHIRT_LIGHT = '#f08a73'
const DENIM = '#4f7fc4'
const DENIM_DARK = '#365c9a'
const DENIM_LIGHT = '#7aa5e0'
const BOOT = '#6b4630'
const BOOT_LIGHT = '#8d6243'
const BUTTON = '#f5d353'
const CAN = '#5aa36a'
const CAN_DARK = '#3e7a4f'
const CAN_LIGHT = '#8fd09a'

type Direction = 'baixo' | 'cima' | 'direita' | 'esquerda'
interface Pose {
  /** Body lifted by this many pixels (breathing, walking bounce). */
  bob: number
  /** Leg offsets (walking): positive lifts the left/right leg (front and back) or moves it forward (side). */
  legA: number
  legB: number
  /** Arms: 'side' (relaxed), 'swingA'/'swingB' (walking), 'up' (tool raised), 'forward' (tool down). */
  arms: 'side' | 'swingA' | 'swingB' | 'up' | 'forward'
}

// Front ---------------------------------------------------------------------------------------

function hatFront(s: Px, y: number) {
  s.ellipse(CX - 13, y + 5, 26, 7, HAT)
  s.ellipse(CX - 12, y + 5, 24, 3, HAT_LIGHT)
  s.rect(CX - 7, y, 14, 7, HAT).rect(CX - 6, y - 1, 12, 1, HAT)
  s.rect(CX - 6, y, 4, 5, HAT_LIGHT)
  s.rect(CX - 7, y + 5, 14, 2, BAND)
  for (let x = CX - 12; x < CX + 13; x += 3) s.set(x, y + 9, HAT_DARK)
}

function legsFront(s: Px, y: number, pose: Pose) {
  const left = CX - 6
  const right = CX + 1
  s.rect(left, y, 5, 7 - pose.legA, DENIM).rect(left, y, 1, 7 - pose.legA, DENIM_LIGHT)
  s.rect(right, y, 5, 7 - pose.legB, DENIM).rect(right + 4, y, 1, 7 - pose.legB, DENIM_DARK)
  s.rect(left, y + 7 - pose.legA, 5, 4, BOOT).rect(left, y + 7 - pose.legA, 5, 1, BOOT_LIGHT)
  s.rect(right, y + 7 - pose.legB, 5, 4, BOOT).rect(right, y + 7 - pose.legB, 5, 1, BOOT_LIGHT)
}

function armFront(s: Px, x: number, y: number, kind: Pose['arms'], side: -1 | 1) {
  if (kind === 'up') {
    s.rect(x, y - 7, 3, 9, SHIRT).rect(x, y - 9, 3, 2, SKIN)
    return
  }
  if (kind === 'forward') {
    s.rect(x + (side < 0 ? 2 : -2), y + 1, 3, 6, SHIRT).rect(
      x + (side < 0 ? 3 : -3),
      y + 7,
      3,
      2,
      SKIN,
    )
    return
  }
  const swing = kind === 'swingA' ? side : kind === 'swingB' ? -side : 0
  s.rect(x, y + swing, 3, 7, SHIRT).rect(x, y + swing, 1, 7, SHIRT_LIGHT)
  s.rect(x, y + 7 + swing, 3, 2, SKIN)
}

function front(pose: Pose): Px {
  const s = new Px(W, H)
  const y = 9 - pose.bob
  legsFront(s, 39, pose)
  // Body: shirt, overalls with straps and buttons.
  s.rect(CX - 7, y + 19, 14, 11, SHIRT).rect(CX - 7, y + 19, 2, 11, SHIRT_LIGHT)
  s.rect(CX - 5, y + 22, 10, 9, DENIM).rect(CX - 5, y + 22, 10, 1, DENIM_LIGHT)
  s.rect(CX - 6, y + 29, 12, 2, DENIM).rect(CX - 6, y + 30, 12, 1, DENIM_DARK)
  s.rect(CX - 5, y + 19, 2, 3, DENIM).rect(CX + 3, y + 19, 2, 3, DENIM)
  s.set(CX - 4, y + 22, BUTTON).set(CX + 3, y + 22, BUTTON)
  s.rect(CX - 2, y + 25, 4, 3, DENIM_DARK)
  armFront(s, CX - 10, y + 20, pose.arms, -1)
  armFront(s, CX + 7, y + 20, pose.arms, 1)
  // Head.
  s.ellipse(CX - 8, y + 7, 16, 13, SKIN)
  s.rect(CX - 8, y + 9, 16, 3, HAIR)
    .rect(CX - 8, y + 12, 2, 4, HAIR)
    .rect(CX + 6, y + 12, 2, 4, HAIR)
  s.rect(CX - 4, y + 12, 1, 1, HAIR_DARK).rect(CX + 2, y + 12, 1, 1, HAIR_DARK)
  s.rect(CX - 4, y + 13, 1, 2, INK).rect(CX + 3, y + 13, 1, 2, INK)
  s.set(CX - 4, y + 13, '#ffffff').set(CX + 3, y + 13, '#ffffff')
  s.rect(CX - 6, y + 15, 2, 1, '#f29a8e').rect(CX + 4, y + 15, 2, 1, '#f29a8e')
  s.rect(CX - 1, y + 16, 2, 1, SKIN_DARK)
  s.rect(CX - 8, y + 18, 16, 1, SKIN_DARK)
  hatFront(s, y)
  s.outline(INK)
  return s
}

// Back ----------------------------------------------------------------------------------------

function back(pose: Pose): Px {
  const s = new Px(W, H)
  const y = 9 - pose.bob
  legsFront(s, 39, { ...pose, legA: pose.legB, legB: pose.legA })
  s.rect(CX - 7, y + 19, 14, 11, SHIRT).rect(CX + 5, y + 19, 2, 11, SHIRT_DARK)
  s.rect(CX - 6, y + 27, 12, 4, DENIM).rect(CX - 6, y + 30, 12, 1, DENIM_DARK)
  s.line(CX - 5, y + 19, CX + 3, y + 27, DENIM, 2).line(CX + 4, y + 19, CX - 4, y + 27, DENIM, 2)
  s.rect(CX - 1, y + 24, 2, 2, DENIM_LIGHT)
  armFront(s, CX - 10, y + 20, pose.arms, -1)
  armFront(s, CX + 7, y + 20, pose.arms, 1)
  s.ellipse(CX - 8, y + 7, 16, 13, HAIR)
  s.rect(CX - 6, y + 14, 12, 3, HAIR_DARK)
    .rect(CX - 8, y + 12, 1, 4, SKIN)
    .rect(CX + 7, y + 12, 1, 4, SKIN)
  s.rect(CX - 4, y + 18, 8, 1, SKIN_DARK)
  hatFront(s, y)
  s.rect(CX - 7, y + 4, 14, 3, HAT).rect(CX - 6, y + 2, 4, 3, HAT_LIGHT)
  s.outline(INK)
  return s
}

// Side (facing right) -------------------------------------------------------------------------

function side(pose: Pose, armForward?: [number, number]): Px {
  const s = new Px(W, H)
  const y = 9 - pose.bob
  // Back leg, then front leg.
  const leg = (dx: number, color: string, boot: string) => {
    s.rect(CX - 3 + dx, 39, 5, 7, color)
    s.rect(CX - 3 + dx, 46, 6, 4, boot).rect(CX - 3 + dx, 46, 6, 1, BOOT_LIGHT)
  }
  leg(-pose.legB, DENIM_DARK, darken(BOOT, 0.15))
  // Back arm.
  if (pose.arms === 'swingA' || pose.arms === 'swingB') {
    const swing = pose.arms === 'swingA' ? -2 : 2
    s.rect(CX - 1 + swing, y + 20, 3, 7, SHIRT_DARK).rect(CX - 1 + swing, y + 27, 3, 2, SKIN_DARK)
  }
  s.rect(CX - 5, y + 19, 11, 11, SHIRT).rect(CX - 5, y + 19, 2, 11, SHIRT_LIGHT)
  s.rect(CX - 1, y + 22, 7, 9, DENIM)
    .rect(CX - 5, y + 28, 11, 3, DENIM)
    .rect(CX - 5, y + 30, 11, 1, DENIM_DARK)
  s.rect(CX + 1, y + 19, 2, 3, DENIM).set(CX + 3, y + 23, BUTTON)
  leg(pose.legA, DENIM, BOOT)
  // Head facing right.
  s.ellipse(CX - 7, y + 7, 15, 13, SKIN)
  s.rect(CX - 7, y + 9, 9, 3, HAIR)
    .rect(CX - 7, y + 12, 5, 5, HAIR)
    .rect(CX - 6, y + 17, 3, 1, HAIR_DARK)
  s.rect(CX + 4, y + 13, 1, 2, INK).set(CX + 4, y + 13, '#ffffff')
  s.rect(CX + 7, y + 14, 2, 2, SKIN).set(CX + 8, y + 15, SKIN_DARK)
  s.rect(CX + 3, y + 16, 2, 1, '#f29a8e')
  s.set(CX - 1, y + 13, SKIN_DARK).set(CX - 1, y + 14, SKIN_DARK)
  // Hat (the brim reaches further to the front).
  s.ellipse(CX - 11, y + 5, 25, 6, HAT).ellipse(CX - 9, y + 5, 21, 3, HAT_LIGHT)
  s.rect(CX - 6, y, 12, 7, HAT)
    .rect(CX - 5, y - 1, 10, 1, HAT)
    .rect(CX - 5, y, 3, 5, HAT_LIGHT)
  s.rect(CX - 6, y + 5, 12, 2, BAND)
  // Front arm.
  if (armForward) {
    const [hx, hy] = armForward
    s.line(CX, y + 21, hx, hy, SHIRT, 3)
    s.rect(hx - 1, hy - 1, 3, 3, SKIN)
  } else {
    const swing = pose.arms === 'swingA' ? 2 : pose.arms === 'swingB' ? -2 : 0
    s.rect(CX - 1 + swing, y + 20, 3, 7, SHIRT).rect(CX - 1 + swing, y + 20, 1, 7, SHIRT_LIGHT)
    s.rect(CX - 1 + swing, y + 27, 3, 2, SKIN)
  }
  s.outline(INK)
  return s
}

// Tools ---------------------------------------------------------------------------------------

type Tool = 'enxada' | 'machado' | 'regador'

/** A tool drawn on its own canvas (then outlined) from the hands to the tip. */
function toolCanvas(tool: Tool, hands: [number, number], tip: [number, number], tilt = 0): Px {
  const t = new Px(W, H)
  const [hx, hy] = hands
  const [tx, ty] = tip
  if (tool === 'regador') {
    // The can hangs from the hands; `tilt` 1 pours towards the tip.
    const bx = tilt ? tx - (tx > hx ? 9 : tx < hx ? -1 : 4) : hx - 4
    const by = tilt ? ty - 7 : hy
    t.rect(bx, by, 9, 7, CAN)
      .rect(bx, by, 9, 1, CAN_LIGHT)
      .rect(bx, by + 6, 9, 1, CAN_DARK)
    t.rect(bx + 2, by - 2, 5, 2, CAN_DARK)
    const spoutX = tx >= hx ? bx + 9 : bx - 1
    const dir = tx > hx ? 1 : tx < hx ? -1 : 1
    if (tilt) {
      t.line(spoutX, by + 4, spoutX + dir * 4, by + 7, CAN_DARK, 2)
    } else t.line(spoutX, by + 4, spoutX + dir * 4, by + 1, CAN_DARK, 2)
    t.outline(INK)
    if (tilt) {
      const sx = spoutX + dir * 5
      for (const [dx, dy] of [
        [0, 2],
        [1, 5],
        [-1, 7],
        [2, 9],
        [0, 11],
      ] as const)
        t.set(sx + dx * dir, by + 6 + dy, WATER.light).set(sx + dx * dir, by + 7 + dy, WATER.base)
    }
    return t
  }
  t.line(hx, hy, tx, ty, WOOD.base, 2)
  const dx = Math.sign(tx - hx)
  const dy = Math.sign(ty - hy)
  if (tool === 'enxada') {
    // A flat blade at the tip, across the handle.
    const bx = dy !== 0 && dx === 0 ? 1 : 0
    if (bx) t.rect(tx - 3, ty - 1, 7, 3, METAL.base).rect(tx - 3, ty - 1, 7, 1, METAL.light)
    else t.rect(tx - 1, ty - 1, 3, 6, METAL.base).rect(tx - 1, ty - 1, 1, 6, METAL.light)
  } else {
    // Axe head: a wedge on one side of the tip.
    const sx = dx === 0 ? 1 : dx
    t.rect(tx - 1, ty - 3, 2, 6, METAL.dark)
    t.polygon(
      [
        [tx + sx, ty - 3],
        [tx + sx * 5, ty - 5],
        [tx + sx * 5, ty + 5],
        [tx + sx, ty + 3],
      ],
      METAL.base,
    )
    t.line(tx + sx * 5, ty - 4, tx + sx * 5, ty + 4, METAL.light)
  }
  t.outline(INK)
  return t
}

function layered(...layers: Px[]): Px {
  const result = new Px(W, H)
  for (const layer of layers) result.draw(layer)
  return result
}

const IDLE: Pose = { bob: 0, legA: 0, legB: 0, arms: 'side' }

function drawToolAction(tool: Tool, direction: Direction, frame: 0 | 1): Px {
  if (direction === 'esquerda') return drawToolAction(tool, 'direita', frame).flipX()
  const raised: Pose = { bob: 0, legA: 0, legB: 0, arms: 'up' }
  const down: Pose = { bob: -1, legA: 0, legB: 0, arms: 'forward' }
  if (direction === 'direita') {
    if (tool === 'regador') {
      const body = side(IDLE, frame ? [52, 32] : [47, 35])
      const can = frame
        ? toolCanvas(tool, [52, 32], [62, 44], 1)
        : toolCanvas(tool, [47, 35], [50, 36])
      return layered(body, can)
    }
    if (frame === 0) {
      const body = side({ ...raised, arms: 'side' }, [41, 12])
      return layered(toolCanvas(tool, [41, 13], tool === 'enxada' ? [33, 4] : [32, 6]), body)
    }
    const body = side(down, [53, 35])
    return layered(body, toolCanvas(tool, [53, 35], tool === 'enxada' ? [66, 47] : [66, 36]))
  }
  if (direction === 'baixo') {
    if (tool === 'regador') {
      const body = front(frame ? down : IDLE)
      const can = frame
        ? toolCanvas(tool, [CX, 41], [CX + 4, 49], 1)
        : toolCanvas(tool, [CX + 9, 37], [CX + 12, 37])
      return layered(body, can)
    }
    if (frame === 0) return layered(front(raised), toolCanvas(tool, [CX + 9, 19], [CX + 9, 3]))
    return layered(front(down), toolCanvas(tool, [CX, 37], [CX, 55]))
  }
  // Up: the tool is in front of the farmer, so it is drawn behind them.
  if (tool === 'regador') {
    const can = frame
      ? toolCanvas(tool, [CX, 22], [CX + 4, 22], 1)
      : toolCanvas(tool, [CX + 9, 36], [CX + 12, 36])
    return frame ? layered(can, back(down)) : layered(back(IDLE), can)
  }
  if (frame === 0) return layered(back(raised), toolCanvas(tool, [CX - 9, 19], [CX - 9, 2]))
  return layered(toolCanvas(tool, [CX + 6, 28], [CX + 4, 3]), back(down))
}

function walk(direction: Direction, frame: number): Px {
  if (direction === 'esquerda') return walk('direita', frame).flipX()
  const bob = frame % 2 ? 1 : 0
  const step = [1, 0, -1, 0][frame]!
  if (direction === 'direita')
    return side({
      bob,
      legA: step * 2,
      legB: step * 2,
      arms: step > 0 ? 'swingA' : step < 0 ? 'swingB' : 'side',
    })
  const pose: Pose = {
    bob,
    legA: step > 0 ? 2 : 0,
    legB: step < 0 ? 2 : 0,
    arms: step > 0 ? 'swingA' : step < 0 ? 'swingB' : 'side',
  }
  return direction === 'baixo' ? front(pose) : back(pose)
}

function idle(direction: Direction, frame: number): Px {
  if (direction === 'esquerda') return idle('direita', frame).flipX()
  const pose = { ...IDLE, bob: frame }
  if (direction === 'direita') return side(pose)
  return direction === 'baixo' ? front(pose) : back(pose)
}

const DIRECTIONS: Direction[] = ['cima', 'baixo', 'esquerda', 'direita']

export function farmer(): SpriteDrawing {
  return {
    kind: 'sprite',
    name: 'fazendeiro',
    frameWidth: W,
    frameHeight: H,
    animations: [
      ...DIRECTIONS.map((direction) => ({
        name: `andar-${direction}`,
        fps: 4,
        loop: true,
        frames: [0, 1, 2, 3].map((frame) => walk(direction, frame)),
      })),
      ...DIRECTIONS.map((direction) => ({
        name: `parado-${direction}`,
        fps: 4,
        loop: true,
        frames: [0, 1].map((frame) => idle(direction, frame)),
      })),
    ],
  }
}

export function farmerTools(): SpriteDrawing {
  const tools: Tool[] = ['enxada', 'machado', 'regador']
  return {
    kind: 'sprite',
    name: 'fazendeiro-ferramentas',
    frameWidth: W,
    frameHeight: H,
    animations: tools.flatMap((tool) =>
      DIRECTIONS.map((direction) => ({
        name: `${tool}-${direction}`,
        fps: 4,
        loop: true,
        frames: [drawToolAction(tool, direction, 0), drawToolAction(tool, direction, 1)],
      })),
    ),
  }
}

// Trader --------------------------------------------------------------------------------------

/** The trader beside the farm: cap, moustache, apron and a sack of goods. */
export function trader(): SpriteDrawing {
  const s = new Px(28, 34)
  const cx = 14
  const cap = '#4f9a5c'
  const capDark = '#357345'
  const vest = '#a0663f'
  const apron = '#f1e3c6'
  // Sack behind.
  s.ellipse(17, 14, 11, 13, '#c9a26b')
    .ellipse(18, 15, 8, 9, '#dcbb85')
    .rect(20, 12, 4, 3, '#a8834f')
  // Legs and body.
  s.rect(cx - 5, 27, 4, 5, '#5a4636').rect(cx + 1, 27, 4, 5, '#5a4636')
  s.rect(cx - 6, 15, 12, 13, vest)
    .rect(cx - 4, 17, 8, 11, apron)
    .rect(cx - 4, 17, 8, 1, '#ffffff')
  s.rect(cx - 8, 16, 3, 8, vest).rect(cx + 5, 16, 3, 8, vest)
  s.rect(cx - 8, 24, 3, 2, SKIN).rect(cx + 5, 24, 3, 2, SKIN)
  // Head.
  s.ellipse(cx - 6, 4, 12, 12, SKIN)
  s.rect(cx - 3, 9, 1, 2, INK).rect(cx + 2, 9, 1, 2, INK)
  s.rect(cx - 4, 12, 8, 2, '#e8e0d0')
    .set(cx - 4, 13, '#c8bfae')
    .set(cx + 3, 13, '#c8bfae')
  s.rect(cx - 1, 11, 2, 1, SKIN_DARK)
  s.rect(cx - 6, 7, 1, 4, '#c8bfae').rect(cx + 5, 7, 1, 4, '#c8bfae')
  // Cap with a visor.
  s.ellipse(cx - 6, 1, 12, 8, cap)
    .rect(cx - 7, 6, 14, 2, capDark)
    .rect(cx - 3, 2, 3, 2, lighten(cap, 0.3))
  s.outline(INK)
  return {
    kind: 'sprite',
    name: 'mercador',
    frameWidth: 28,
    frameHeight: 34,
    animations: [{ name: 'parado', fps: 1, loop: true, frames: [s] }],
  }
}
