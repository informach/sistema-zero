/**
 * The pirate (the player), the Tooth chomper, the Shell clam and its pearl. Frames are the game
 * size halved: the pirate is 50×32 (100×64 in the game, with the 50 px wide hitbox in the middle).
 */
import { Px } from '../../pixel'
import { P, shade } from './palette'

export interface PiratePose {
  /** upper body down by 1 px (breathing, running) */
  bob: number
  /** feet: [x, y] of the back and the front boot */
  back: [number, number]
  front: [number, number]
  /** the sword hand and where the blade points to */
  hand: [number, number]
  tip: [number, number]
  /** the bandana knot tails (−1 down, 0 back, 1 up) */
  tails: number
  blink?: boolean
}

function leg(s: Px, hip: [number, number], foot: [number, number], pants: string, boot: string) {
  s.line(hip[0], hip[1], foot[0], foot[1] - 2, pants, 3)
  s.rect(foot[0] - 2, foot[1] - 1, 5, 2, boot)
  s.set(foot[0] + 3, foot[1], boot)
}

export function pirate(pose: PiratePose): Px {
  const s = new Px(50, 32)
  const b = pose.bob
  // back leg and back arm (in shadow)
  leg(s, [23, 24 + b], pose.back, P.navy, P.boot)
  s.line(21, 18 + b, 18, 22 + b, P.blue, 2)
  s.rect(17, 22 + b, 2, 2, P.skinDark)
  // torso: striped shirt
  s.ellipse(19, 15 + b, 12, 11, P.white)
  for (let y = 16 + b; y < 25 + b; y++) if ((y - b) % 3 === 1) s.rect(19, y, 12, 1, P.blue)
  for (let y = 15 + b; y < 26 + b; y++)
    for (let x = 19; x < 31; x++)
      if (s.get(x, y) && x >= 28) s.tint(x, y, s.get(x, y) === P.blue ? P.navy : P.steel)
  // belt
  s.rect(19, 23 + b, 12, 2, P.brown)
  s.rect(24, 23 + b, 3, 2, P.gold).set(25, 23 + b, P.goldLight)
  // front leg
  leg(s, [27, 24 + b], pose.front, P.navy, P.boot)
  // head
  s.ellipse(17, 2 + b, 15, 14, P.skin)
  shade(s, P.skin, null, P.skinDark, 24.5, 9 + b, 7.5, 7, -2, 0.62)
  // hair at the back
  s.rect(17, 8 + b, 3, 4, P.hair)
    .set(20, 9 + b, P.hair)
    .set(18, 12 + b, P.hair)
  // bandana with dots, knot and tails at the back
  for (let y = 0; y < 8 + b; y++)
    for (let x = 15; x < 34; x++)
      if (s.get(x, y) === P.skin || s.get(x, y) === P.skinDark || s.get(x, y) === P.hair)
        s.set(x, y, P.red)
  s.rect(17, 2 + b, 14, 1, P.red).rect(19, 1 + b, 10, 1, P.red)
  s.rect(17, 7 + b, 15, 1, P.redDark)
  for (const [x, y] of [
    [20, 3],
    [25, 2],
    [29, 4],
    [22, 5],
    [27, 6],
  ] as const)
    s.set(x, y + b, P.white)
  s.rect(15, 4 + b, 3, 3, P.red).set(15, 4 + b, P.redDark)
  const t = pose.tails
  s.line(14, 5 + b, 11, 5 + b - t, P.red, 2)
  s.line(14, 6 + b, 12, 8 + b - t, P.redDark, 2)
  // face: eye, brow, nose, smile, cheek
  if (pose.blink) s.rect(27, 10 + b, 3, 1, P.ink)
  else {
    s.rect(27, 9 + b, 2, 3, P.ink)
    s.set(27, 9 + b, P.white)
  }
  s.rect(26, 8 + b, 4, 1, P.hair)
  s.set(31, 11 + b, P.skinDark).set(32, 11 + b, P.skinDark)
  s.rect(28, 13 + b, 2, 1, P.redDark).set(30, 12 + b, P.redDark)
  s.set(25, 12 + b, P.coral2)
  // sword arm and cutlass
  const [hx, hy] = pose.hand
  s.line(28, 17 + b, hx, hy, P.white, 2)
  s.set(28, 17 + b, P.blue).set(29, 18 + b, P.blue)
  s.rect(hx - 1, hy - 1, 3, 3, P.skin).set(hx + 1, hy + 1, P.skinDark)
  const [tx, ty] = pose.tip
  const len = Math.hypot(tx - hx, ty - hy)
  const ux = (tx - hx) / len
  const uy = (ty - hy) / len
  // guard across the blade
  s.line(
    hx + ux * 2 - uy * 2,
    hy + uy * 2 + ux * 2,
    hx + ux * 2 + uy * 2,
    hy + uy * 2 - ux * 2,
    P.gold,
    1,
  )
  s.line(hx + ux * 3, hy + uy * 3, tx, ty, P.steel, 2)
  s.line(
    hx + ux * 3 + Math.abs(uy),
    hy + uy * 3 + Math.abs(ux),
    tx,
    ty + (Math.abs(ux) > 0.5 ? 1 : 0),
    P.steelDark,
    1,
  )
  s.set(tx, ty, P.white)
  s.outline(P.ink)
  return s
}

const RUN: [number, number, number][] = [
  // back foot x, front foot x, which foot is lifted (−1 back, 1 front, 0 none)
  [18, 32, 0],
  [20, 30, 1],
  [23, 26, 1],
  [31, 19, 0],
  [29, 21, -1],
  [25, 24, -1],
]

export function pirateFrames() {
  const idle = [0, 0, 1, 1, 0].map((bob, index) =>
    pirate({
      bob,
      back: [22, 31],
      front: [28, 31],
      hand: [33, 20 + bob],
      tip: [44, 17 + bob],
      tails: index % 2,
      blink: index === 4,
    }),
  )
  const run = RUN.map(([back, front, lifted], index) =>
    pirate({
      bob: index % 3 === 0 ? 0 : 1,
      back: [back, lifted === -1 ? 29 : 31],
      front: [front, lifted === 1 ? 29 : 31],
      hand: [33, 20 + (index % 3 === 0 ? 0 : 1)],
      tip: [45, 19 + (index % 3 === 0 ? 0 : 1)],
      tails: index % 2 ? 1 : 0,
    }),
  )
  const jump = [
    pirate({ bob: -1, back: [21, 28], front: [30, 27], hand: [32, 15], tip: [40, 7], tails: -1 }),
  ]
  const fall = [
    pirate({ bob: 0, back: [23, 31], front: [28, 31], hand: [33, 17], tip: [43, 12], tails: 1 }),
  ]
  return { idle, run, jump, fall }
}

/** Tooth: a round chomper with a big grin that patrols the platforms (faces right). */
export function tooth(frame: number, running: boolean): Px {
  const s = new Px(26, 23)
  const bob = running ? [0, 1, 1, 0, 1, 1][frame % 6]! : [0, 0, 1, 1, 1, 0][frame % 6]!
  const open = running ? frame % 3 !== 2 : frame % 6 < 3
  // feet
  const steps = running
    ? [
        [5, 13],
        [7, 11],
        [9, 9],
        [13, 5],
        [11, 7],
        [9, 9],
      ][frame % 6]!
    : [7, 13]
  for (const [index, x] of steps.entries()) {
    const lift = running && frame % 6 < 3 === (index === 0) ? 1 : 0
    s.rect(x, 20 - lift, 5, 3, P.teal0)
    s.rect(x + 1, 20 - lift, 3, 1, P.teal1)
  }
  // fin on the back
  const fin = running ? frame % 2 : 0
  s.polygon(
    [
      [6, 5 + bob],
      [8 - fin, 1 + bob],
      [12, 4 + bob],
    ],
    P.teal0,
  )
  // body
  s.ellipse(2, 3 + bob, 22, 18, P.teal1)
  s.ellipse(4, 10 + bob, 14, 10, P.belly)
  shade(s, P.teal1, P.teal2, P.teal0, 13, 11 + bob, 11, 9.5)
  // mouth with teeth
  const mouthTop = 10 + bob
  const mouthBottom = open ? 17 + bob : 14 + bob
  s.polygon(
    [
      [11, mouthTop],
      [24, mouthTop - 1],
      [24, mouthBottom + 1],
      [13, mouthBottom],
    ],
    P.mouth,
  )
  for (let x = 12; x < 24; x += 3) {
    s.rect(x, mouthTop, 2, 2, P.white).set(x, mouthTop + 2, P.white)
    if (open) s.rect(x + 1, mouthBottom - 1, 2, 2, P.white).set(x + 2, mouthBottom - 2, P.white)
  }
  if (!open) s.rect(12, mouthBottom, 12, 1, P.white)
  // eye and angry brow
  s.ellipse(14, 3 + bob, 6, 6, P.white)
  s.rect(17, 5 + bob, 2, 2, P.ink)
  s.line(13, 3 + bob, 19, 5 + bob, P.teal0, 1)
  s.rect(14, 9 + bob, 6, 1, P.teal0)
  s.outline(P.ink)
  return s
}

/** Shell: a clam that opens towards the left and spits a pearl. `angle` lifts the top shell. */
export function clam(angle: number, withPearl: boolean, width = 38, height = 23): Px {
  const s = new Px(width, height)
  const sx = width / 38
  const sy = height / 23
  const hinge: [number, number] = [34 * sx, 14 * sy]
  // inside of the mouth (seen when open)
  if (angle > 0) {
    s.ellipse(4 * sx, 9 * sy, 30 * sx, 9 * sy, P.mouth)
    if (withPearl) {
      s.circle(10 * sx, 13 * sy, 2.6 * sx, P.pearl)
      s.set(9 * sx, 12 * sy, P.white)
    }
  }
  // bottom shell
  const bottom: [number, number][] = []
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16)
    bottom.push([19 * sx - Math.cos(a) * 17 * sx, 14 * sy + Math.sin(a) * 8 * sy])
  }
  s.polygon(bottom, P.coral1)
  for (let i = 1; i < 6; i++) {
    const x = (5 + i * 5.5) * sx
    s.line(x, 16 * sy, x + (x < 19 * sx ? 1 : -1), 20 * sy, P.coral0, 1)
  }
  s.rect(3 * sx, 14 * sy, 32 * sx, 1, P.coral3)
  // top shell, turned around the hinge
  const rad = (angle * Math.PI) / 180
  const turn = ([x, y]: [number, number]): [number, number] => {
    const dx = x - hinge[0]
    const dy = y - hinge[1]
    return [
      hinge[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
      hinge[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
    ]
  }
  const dome: [number, number][] = []
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (i / 18)
    dome.push(turn([19 * sx - Math.cos(a) * 17 * sx, 14 * sy - Math.sin(a) * 9 * sy]))
  }
  s.polygon(dome, P.coral2)
  // ridges fanning out from the hinge
  for (let i = 1; i < 7; i++) {
    const a = Math.PI * (i / 7)
    const [x0, y0] = turn([19 * sx - Math.cos(a) * 5 * sx, 14 * sy - Math.sin(a) * 3 * sy])
    const [x1, y1] = turn([19 * sx - Math.cos(a) * 16 * sx, 14 * sy - Math.sin(a) * 8 * sy])
    s.line(x0, y0, x1, y1, P.coral1, 1)
  }
  const [lx0, ly0] = turn([3 * sx, 13 * sy])
  const [lx1, ly1] = turn([35 * sx, 13 * sy])
  s.line(lx0, ly0, lx1, ly1, P.coral3, 1)
  // eyes on top, looking left
  for (const ex of [14, 21]) {
    const [x, y] = turn([ex * sx, 6 * sy])
    s.circle(x, y, 2.2 * Math.min(sx, sy) + 0.3, P.white)
    s.set(x - 1, y, P.ink).set(x - 1, y - 1, P.ink)
  }
  s.outline(P.ink)
  return s
}

export const SHELL_ATTACK = [5, 11, 16, 10, 4]

export function pearlImage(): Px {
  const s = new Px(16, 16)
  s.circle(8, 8, 4.5, P.pearl)
  shade(s, P.pearl, P.white, P.pearlDark, 8, 8, 4.5, 4.5, -0.5, 0.3)
  s.set(6, 5, P.white).set(5, 6, P.white)
  s.outline(P.ink)
  return s
}
