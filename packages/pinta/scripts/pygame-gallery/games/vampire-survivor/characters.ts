/**
 * Vampire Survivor: o caçador (quatro direções andando), o morcego, a gosma, o esqueleto, a
 * arma, a bala e os ícones do placar. Metade do tamanho (×2 no jogo).
 */
import type { SpriteDrawing } from '../../drawing'
import { Px, shift } from '../../pixel'

const INK = '#1b1426'

// O caçador ---------------------------------------------------------------------------------

const SKIN = { base: '#f3c9a2', shade: '#d99d79', light: '#ffe4cc', blush: '#ee9a8c' }
const HAIR = { base: '#d5d8e8', shade: '#9fa3c2', light: '#f7f8ff' }
const HAT = { base: '#4a3550', shade: '#2b1d33', light: '#6c5277', band: '#c0394a' }
const COAT = { base: '#2f4f7a', shade: '#203859', light: '#4b75a8', trim: '#e5b544' }
const SCARF = { base: '#c0394a', shade: '#86222f', light: '#ea6a72' }
const LEGS = { pants: '#3b3346', boot: '#5e3b2b', bootLight: '#86573d' }
const EYE = '#2a1d3a'
const WHITE = '#ffffff'

type Pose = { bob: number; left: number; right: number; swing: number }
/** Os quatro quadros do andar: parado, passo, meio, outro passo. */
const WALK: Pose[] = [
  { bob: 0, left: 0, right: 0, swing: 0 },
  { bob: -1, left: -2, right: 1, swing: 1 },
  { bob: 0, left: 0, right: 0, swing: 0 },
  { bob: -1, left: 1, right: -2, swing: -1 },
]

function hatFront(p: Px, y: number) {
  p.rect(24, y, 16, 9, HAT.base).rect(24, y, 3, 9, HAT.light).rect(37, y, 3, 9, HAT.shade)
  p.rect(23, y + 6, 18, 2, HAT.band)
  p.ellipse(14, y + 8, 36, 7, HAT.base)
  p.ellipse(16, y + 8, 32, 3, HAT.light)
  p.rect(16, y + 13, 32, 1, HAT.shade)
}

function legsFront(p: Px, pose: Pose) {
  // Pernas: a que sobe fica mais curta (passo para a frente).
  for (const [x, lift] of [
    [25, pose.left],
    [33, pose.right],
  ] as const) {
    const up = Math.max(0, -lift)
    p.rect(x, 52, 6, 6 - up, LEGS.pants)
    p.rect(x - 1, 57 - up, 8, 4, LEGS.boot).rect(x - 1, 57 - up, 8, 1, LEGS.bootLight)
  }
}

function heroFront(pose: Pose): Px {
  const p = new Px(64, 64)
  legsFront(p, pose)
  const body = new Px(64, 64)
  // Casaco com aba.
  body.polygon(
    [
      [22, 35],
      [42, 35],
      [45, 54],
      [19, 54],
    ],
    COAT.base,
  )
  body.rect(31, 35, 2, 19, COAT.shade).rect(30, 36, 1, 17, COAT.trim)
  body.polygon(
    [
      [22, 35],
      [26, 35],
      [23, 54],
      [19, 54],
    ],
    COAT.light,
  )
  body.polygon(
    [
      [40, 35],
      [42, 35],
      [45, 54],
      [41, 54],
    ],
    COAT.shade,
  )
  body.rect(21, 46, 22, 2, '#4a2c22').rect(30, 45, 4, 4, COAT.trim).set(31, 46, '#fff1b0')
  // Braços (balançam ao andar) e mãos.
  body.rect(17, 36 + pose.swing, 5, 11, COAT.base).rect(17, 36 + pose.swing, 2, 11, COAT.light)
  body.rect(42, 36 - pose.swing, 5, 11, COAT.base).rect(45, 36 - pose.swing, 2, 11, COAT.shade)
  body.rect(17, 47 + pose.swing, 5, 3, SKIN.base).rect(42, 47 - pose.swing, 5, 3, SKIN.shade)
  // Cachecol.
  body
    .rect(22, 32, 20, 5, SCARF.base)
    .rect(22, 32, 20, 1, SCARF.light)
    .rect(22, 36, 20, 1, SCARF.shade)
  body
    .rect(36, 36, 4, 8, SCARF.base)
    .rect(39, 36, 1, 8, SCARF.shade)
    .rect(36, 43, 4, 1, SCARF.light)
  // Cabeça: cabelo atrás, rosto, franja.
  body.ellipse(19, 13, 26, 21, HAIR.base)
  body.ellipse(22, 15, 20, 18, SKIN.base)
  body.rect(22, 27, 20, 4, SKIN.base).rect(23, 31, 18, 1, SKIN.shade)
  body.polygon(
    [
      [19, 16],
      [45, 16],
      [42, 21],
      [37, 18],
      [32, 22],
      [27, 18],
      [22, 21],
    ],
    HAIR.base,
  )
  body.rect(22, 16, 20, 1, HAIR.light).set(27, 19, HAIR.shade).set(37, 19, HAIR.shade)
  body.rect(19, 18, 3, 11, HAIR.base).rect(42, 18, 3, 11, HAIR.shade)
  // Olhos, bochechas e boca.
  for (const x of [26, 36])
    body
      .rect(x, 22, 3, 4, EYE)
      .set(x, 22, WHITE)
      .set(x + 1, 25, '#4a6fd0')
  body.rect(24, 27, 2, 1, SKIN.blush).rect(39, 27, 2, 1, SKIN.blush).rect(31, 28, 3, 1, SKIN.shade)
  hatFront(body, 4)
  p.draw(shift(body, 0, pose.bob))
  p.outline(INK)
  return p
}

function heroBack(pose: Pose): Px {
  const p = new Px(64, 64)
  legsFront(p, { ...pose, left: pose.right, right: pose.left })
  const body = new Px(64, 64)
  body.polygon(
    [
      [22, 35],
      [42, 35],
      [45, 54],
      [19, 54],
    ],
    COAT.base,
  )
  body.rect(31, 38, 2, 16, COAT.shade).polygon(
    [
      [22, 35],
      [26, 35],
      [23, 54],
      [19, 54],
    ],
    COAT.light,
  )
  body.polygon(
    [
      [40, 35],
      [42, 35],
      [45, 54],
      [41, 54],
    ],
    COAT.shade,
  )
  body.rect(21, 46, 22, 2, '#4a2c22')
  body.rect(17, 36 - pose.swing, 5, 11, COAT.base).rect(17, 36 - pose.swing, 2, 11, COAT.light)
  body.rect(42, 36 + pose.swing, 5, 11, COAT.base).rect(45, 36 + pose.swing, 2, 11, COAT.shade)
  body.rect(17, 47 - pose.swing, 5, 3, SKIN.base).rect(42, 47 + pose.swing, 5, 3, SKIN.shade)
  // Cachecol com as duas pontas descendo pelas costas.
  body.rect(22, 32, 20, 5, SCARF.base).rect(22, 32, 20, 1, SCARF.light)
  body.rect(27, 36, 4, 11 + pose.bob, SCARF.base).rect(32, 36, 4, 9 - pose.bob, SCARF.shade)
  // Nuca: só o cabelo.
  // Nuca coberta pelo cabelo: claro em cima, sombra embaixo, pontas soltas sobre o cachecol.
  body.ellipse(19, 12, 26, 22, HAIR.base)
  body.polygon(
    [
      [20, 24],
      [44, 24],
      [42, 32],
      [38, 30],
      [34, 33],
      [30, 30],
      [26, 33],
      [22, 30],
    ],
    HAIR.base,
  )
  for (let y = 28; y < 34; y++)
    for (let x = 19; x < 46; x++) if (body.get(x, y) === HAIR.base) body.set(x, y, HAIR.shade)
  for (let x = 19; x < 46; x++)
    if (body.get(x, 27) === HAIR.base && x % 4 === 1) body.set(x, 27, HAIR.shade)
  body.rect(24, 17, 9, 2, HAIR.light).rect(22, 19, 3, 5, HAIR.light)
  body
    .line(30, 20, 29, 26, HAIR.shade)
    .line(37, 21, 38, 26, HAIR.shade)
    .line(41, 19, 42, 25, HAIR.shade)
  hatFront(body, 4)
  body.rect(24, 4, 16, 1, HAT.light)
  p.draw(shift(body, 0, pose.bob))
  p.outline(INK)
  return p
}

/** De perfil, olhando para a DIREITA (a esquerda é o espelho). */
function heroSide(pose: Pose): Px {
  const p = new Px(64, 64)
  // Passada: as pernas abrem para a frente e para trás.
  for (const [dx, color] of [
    [pose.left * 2, LEGS.pants],
    [pose.right * 2, '#2c2636'],
  ] as const) {
    p.rect(29 + dx, 52, 6, 5, color)
    p.rect(28 + dx, 57, 9, 4, LEGS.boot)
      .rect(28 + dx, 57, 9, 1, LEGS.bootLight)
      .rect(35 + dx, 58, 2, 3, LEGS.bootLight)
  }
  const body = new Px(64, 64)
  // Ponta do cachecol voando para trás.
  body.polygon(
    [
      [25, 33],
      [16, 37 + pose.bob],
      [17, 41],
      [26, 37],
    ],
    SCARF.base,
  )
  body.polygon(
    [
      [24, 36],
      [17, 40],
      [17, 41],
      [25, 37],
    ],
    SCARF.shade,
  )
  body.polygon(
    [
      [24, 35],
      [40, 35],
      [42, 54],
      [22, 54],
    ],
    COAT.base,
  )
  body.polygon(
    [
      [24, 35],
      [28, 35],
      [26, 54],
      [22, 54],
    ],
    COAT.light,
  )
  body.rect(37, 36, 3, 18, COAT.shade).rect(23, 46, 19, 2, '#4a2c22').rect(37, 45, 3, 4, COAT.trim)
  // Braço da frente balança.
  const arm = pose.swing * 3
  body.polygon(
    [
      [29, 36],
      [34, 36],
      [34 + arm, 47],
      [29 + arm, 47],
    ],
    COAT.light,
  )
  body.rect(29 + arm, 47, 5, 3, SKIN.base)
  body
    .rect(24, 32, 18, 5, SCARF.base)
    .rect(24, 32, 18, 1, SCARF.light)
    .rect(24, 36, 18, 1, SCARF.shade)
  // Cabeça de lado: cabelo na nuca, rosto e nariz à direita.
  body.ellipse(20, 13, 24, 21, HAIR.base)
  body.ellipse(27, 15, 17, 18, SKIN.base)
  body.rect(27, 27, 15, 4, SKIN.base).rect(28, 31, 13, 1, SKIN.shade)
  body.rect(43, 22, 2, 3, SKIN.base).set(44, 24, SKIN.shade)
  body.polygon(
    [
      [20, 16],
      [44, 16],
      [41, 20],
      [36, 18],
      [30, 21],
      [26, 26],
      [21, 29],
    ],
    HAIR.base,
  )
  body
    .rect(22, 16, 20, 1, HAIR.light)
    .rect(21, 20, 6, 10, HAIR.base)
    .rect(21, 20, 2, 10, HAIR.shade)
  body.rect(37, 22, 3, 4, EYE).set(37, 22, WHITE).set(38, 25, '#4a6fd0')
  body.rect(38, 27, 2, 1, SKIN.blush).rect(40, 29, 2, 1, SKIN.shade)
  body.rect(27, 26, 2, 3, SKIN.shade)
  // Chapéu de lado: aba mais comprida na frente.
  body.rect(25, 4, 15, 9, HAT.base).rect(25, 4, 3, 9, HAT.light).rect(37, 4, 3, 9, HAT.shade)
  body.rect(24, 10, 17, 2, HAT.band)
  body
    .ellipse(15, 12, 37, 6, HAT.base)
    .ellipse(17, 12, 33, 3, HAT.light)
    .rect(17, 16, 33, 1, HAT.shade)
  p.draw(shift(body, 0, pose.bob))
  p.outline(INK)
  return p
}

function hero(): SpriteDrawing {
  const side = WALK.map(heroSide)
  return {
    kind: 'sprite',
    name: 'heroi',
    frameWidth: 64,
    frameHeight: 64,
    animations: [
      { name: 'baixo', fps: 5, loop: true, frames: WALK.map(heroFront) },
      { name: 'esquerda', fps: 5, loop: true, frames: side.map((frame) => frame.flipX()) },
      { name: 'direita', fps: 5, loop: true, frames: side },
      { name: 'cima', fps: 5, loop: true, frames: WALK.map(heroBack) },
    ],
  }
}

// Os monstros --------------------------------------------------------------------------------

function bat(frame: number): Px {
  const p = new Px(64, 38)
  const body = '#4b2d5e'
  const dark = '#2e1a3c'
  const light = '#6e4a86'
  const wing = '#6b3f7f'
  const wingDark = '#3d2250'
  // Asas: em cima, no meio, embaixo, no meio.
  const lift = [-12, -2, 9, -2][frame]!
  const bob = [0, 1, 2, 1][frame]!
  for (const side of [-1, 1]) {
    const tip = 32 + side * 30
    const mid = 32 + side * 18
    const pts: [number, number][] = [
      [32 + side * 6, 14 + bob],
      [mid, 12 + bob + lift * 0.6],
      [tip, 14 + bob + lift],
      [32 + side * 26, 22 + bob + lift * 0.6],
      [32 + side * 20, 20 + bob + lift * 0.3],
      [32 + side * 15, 24 + bob + lift * 0.3],
      [32 + side * 9, 21 + bob],
    ]
    p.polygon(pts, wing)
    p.line(32 + side * 6, 14 + bob, tip, 14 + bob + lift, wingDark)
    p.line(mid, 12 + bob + lift * 0.6, 32 + side * 20, 20 + bob + lift * 0.3, wingDark)
  }
  // Corpo, orelhas, olhos e presas.
  p.ellipse(23, 9 + bob, 18, 18, body)
  p.ellipse(25, 10 + bob, 8, 7, light)
  p.polygon(
    [
      [24, 12 + bob],
      [25, 2 + bob],
      [30, 10 + bob],
    ],
    body,
  )
  p.polygon(
    [
      [40, 12 + bob],
      [39, 2 + bob],
      [34, 10 + bob],
    ],
    body,
  )
  p.set(26, 6 + bob, '#d76b8e').set(38, 6 + bob, '#d76b8e')
  p.rect(26, 15 + bob, 4, 3, '#ff4d5e').rect(34, 15 + bob, 4, 3, '#ff4d5e')
  p.set(26, 15 + bob, '#ffd0d4').set(34, 15 + bob, '#ffd0d4')
  p.rect(28, 21 + bob, 8, 1, dark)
    .set(29, 22 + bob, WHITE)
    .set(34, 22 + bob, WHITE)
  p.rect(30, 25 + bob, 4, 2, dark)
  p.outline(INK)
  return p
}

function blob(frame: number): Px {
  const p = new Px(64, 38)
  const [w, h] = (
    [
      [40, 30],
      [46, 26],
      [52, 22],
      [46, 26],
    ] as const
  )[frame]!
  const ramp = ['#2f6b3a', '#4b9a40', '#7bcf4c', '#b4ec74', '#f2ffd8']
  const x = 32 - w / 2
  const y = 37 - h
  p.ellipse(x, y, w, h * 2, ramp[2]!)
  p.rect(0, 37, 64, 1, null)
  for (let yy = 0; yy < 38; yy++)
    for (let xx = 0; xx < 64; xx++) {
      if (p.get(xx, yy) !== ramp[2]) continue
      const u = (xx - x) / w
      const v = (yy - y) / h
      if (v > 0.82 || u > 0.86) p.set(xx, yy, ramp[1]!)
      else if (u < 0.22 && v < 0.6) p.set(xx, yy, ramp[3]!)
    }
  p.rect(x + 2, 36, w - 4, 1, ramp[0]!)
  p.ellipse(x + w * 0.18, y + h * 0.16, 6, 4, ramp[3]!).rect(
    x + w * 0.2 + 1,
    y + h * 0.2,
    2,
    1,
    ramp[4]!,
  )
  // Olhos grandes e boca.
  const eyeY = y + h * 0.38
  for (const ex of [32 - 9, 32 + 3]) {
    p.ellipse(ex, eyeY, 7, 8, WHITE)
      .ellipse(ex + 2, eyeY + 2, 4, 5, '#1d1a2a')
      .set(ex + 2, eyeY + 2, WHITE)
  }
  p.rect(29, eyeY + 10, 6, 2, '#2f6b3a').set(31, eyeY + 12, '#e8678c')
  // Gotinha que pinga.
  p.rect(x + w - 8, 36 - (frame % 2), 2, 2, ramp[3]!)
  p.outline(INK)
  return p
}

function skeleton(frame: number): Px {
  const p = new Px(66, 58)
  const bone = '#ece6d4'
  const boneShade = '#b9b19c'
  const boneDark = '#857d6b'
  const step = [0, 3, 0, -3][frame]!
  const bob = [0, -1, 0, -1][frame]!
  // Pernas e pés: a perna que vai para a frente levanta o pé.
  for (const [x, dx] of [
    [27, step],
    [37, -step],
  ] as const) {
    // De frente, andar é levantar um pé de cada vez (o joelho dobra para fora).
    const lift = dx > 0 ? 4 : 0
    const knee = dx > 0 ? (x < 33 ? -2 : 2) : 0
    p.line(x + 1, 41, x + 1 + knee, 46, bone, 3).line(x + 1 + knee, 46, x + 1, 52 - lift, bone, 3)
    p.rect(x + knee, 46, 3, 2, boneShade)
    p.rect(x - 2, 53 - lift, 7, 3, bone).rect(x - 2, 55 - lift, 7, 1, boneShade)
  }
  const body = new Px(66, 58)
  // Bacia e coluna.
  body.rect(25, 37, 17, 4, bone).rect(25, 40, 17, 1, boneShade).rect(32, 38, 3, 2, boneDark)
  body.rect(32, 22, 3, 16, boneShade)
  // Costelas.
  for (let i = 0; i < 4; i++) {
    const y = 23 + i * 3
    const half = 9 - i
    body
      .rect(33 - half, y, half * 2 + 1, 2, bone)
      .rect(33 - half, y + 1, half * 2 + 1, 1, boneShade)
  }
  // Braços esticados para a frente (andar de zumbi) balançando.
  for (const [side, dy] of [
    [-1, step / 2],
    [1, -step / 2],
  ] as const) {
    const sx = 33 + side * 11
    body.line(sx, 23, sx + side * 3, 31 + dy, bone, 3)
    body.line(sx + side * 3, 31 + dy, sx + side * 2, 38 + dy, bone, 2)
    body.rect(sx + side * 2 - 1, 38 + dy, 3, 3, boneShade)
  }
  body.rect(22, 21, 23, 3, bone).rect(22, 23, 23, 1, boneShade)
  // Crânio grande com olhos vermelhos.
  body.ellipse(20, 1, 27, 21, bone)
  body.rect(25, 17, 17, 4, bone).rect(25, 20, 17, 1, boneShade)
  body.ellipse(20, 1, 27, 21, bone)
  body.rect(40, 5, 5, 12, boneShade)
  body.ellipse(24, 9, 8, 7, '#2a1d2a').ellipse(35, 9, 8, 7, '#2a1d2a')
  body.rect(27, 11, 2, 2, '#ff5a3d').rect(38, 11, 2, 2, '#ff5a3d')
  body.set(27, 11, '#ffd1a0').set(38, 11, '#ffd1a0')
  body.rect(32, 15, 3, 3, '#2a1d2a')
  for (let x = 27; x < 41; x += 3) body.rect(x, 18, 1, 3, boneDark)
  body.rect(24, 3, 5, 2, WHITE)
  p.draw(shift(body, 0, bob))
  p.outline(INK)
  return p
}

// A arma, a bala e o placar --------------------------------------------------------------------

function gun(): Px {
  const p = new Px(64, 34)
  const steel = ['#4b4f63', '#7a8098', '#b8bfd4', '#e9eef8']
  const wood = ['#4a2a1e', '#6e3e28', '#94593a', '#b97a52']
  const gold = '#e5b544'
  // Cano longo com a ponta mais larga.
  p.rect(24, 7, 36, 7, steel[1]!).rect(24, 7, 36, 2, steel[2]!).rect(24, 12, 36, 2, steel[0]!)
  p.rect(26, 8, 32, 1, steel[3]!)
  p.rect(57, 6, 6, 9, steel[1]!).rect(57, 6, 6, 2, steel[2]!).rect(61, 8, 2, 4, '#222033')
  p.rect(36, 5, 3, 2, steel[2]!)
  // Tambor e corpo.
  p.rect(14, 5, 14, 14, steel[1]!).rect(14, 5, 14, 3, steel[2]!).rect(14, 16, 14, 3, steel[0]!)
  for (let x = 16; x < 27; x += 4) p.rect(x, 9, 2, 6, steel[0]!)
  p.rect(14, 13, 14, 1, gold)
  // Cão (atrás) e gatilho.
  p.polygon(
    [
      [10, 3],
      [16, 6],
      [14, 9],
      [9, 6],
    ],
    steel[0]!,
  )
  p.rect(20, 19, 2, 5, steel[0]!).ellipse(17, 18, 10, 9, null).rect(18, 24, 8, 1, steel[0]!)
  p.line(18, 19, 18, 24, steel[0]!).line(26, 19, 26, 24, steel[0]!)
  // Cabo de madeira.
  p.polygon(
    [
      [4, 14],
      [16, 14],
      [14, 33],
      [1, 33],
    ],
    wood[2]!,
  )
  p.polygon(
    [
      [4, 14],
      [8, 14],
      [5, 33],
      [1, 33],
    ],
    wood[3]!,
  )
  p.polygon(
    [
      [13, 14],
      [16, 14],
      [14, 33],
      [11, 33],
    ],
    wood[1]!,
  )
  p.rect(5, 18, 7, 1, wood[0]!).rect(4, 23, 7, 1, wood[0]!).rect(3, 28, 7, 1, wood[0]!)
  p.rect(1, 31, 13, 2, gold)
  p.outline(INK)
  return p
}

function bullet(): Px {
  const p = new Px(16, 16)
  p.circle(8, 8, 7, '#3d7fd8')
  p.circle(8, 8, 5.5, '#7cc6f2')
  p.circle(8, 8, 3.5, '#d8f3ff')
  p.circle(7, 7, 1.6, WHITE)
  p.set(1, 8, null).set(14, 8, null)
  return p
}

function heart(): Px {
  return Px.from(
    [
      '................',
      '..aaa.....aaa...',
      '.abbba...abbba..',
      'abccbbaaabbbbba.',
      'abcbbbbbbbbbbba.',
      'abbbbbbbbbbbbba.',
      'abbbbbbbbbbbdda.',
      '.abbbbbbbbbbdda.',
      '..abbbbbbbbdda..',
      '...abbbbbbdda...',
      '....abbbbdda....',
      '.....abbdda.....',
      '......adda......',
      '.......aa.......',
      '................',
      '................',
    ],
    { a: INK, b: '#e2344c', c: '#ffb3bd', d: '#a3192f' },
  )
}

function skull(): Px {
  return Px.from(
    [
      '................',
      '....aaaaaaa.....',
      '..aabbbbbbbaa...',
      '.abbbcbbbbbbba..',
      '.abbcbbbbbbbbda.',
      'abbbbbbbbbbbbda.',
      'abaaabbbbaaabda.',
      'abaeabbbbaeabda.',
      'abaaabbaabaaada.',
      '.abbbbaaabbbda..',
      '..abbbbbbbbda...',
      '...abababadda...',
      '...aaaaaaaaa....',
      '................',
      '................',
      '................',
    ],
    { a: INK, b: '#ece6d4', c: WHITE, d: '#b9b19c', e: '#ff5a3d' },
  )
}

function clock(): Px {
  return Px.from(
    [
      '................',
      '.....aaaaaa.....',
      '...aabbbbbbaa...',
      '..abbbbcbbbbba..',
      '.abbbbbcbbbbbda.',
      '.abbbbbcbbbbbda.',
      'abbbbbbcbbbbbbda',
      'abcbbbbccccbbcda',
      'abbbbbbbbbbbbbda',
      '.abbbbbbbbbbbda.',
      '.abbbbbbbbbbbda.',
      '..abbbbcbbbbda..',
      '...aabbbbbbaa...',
      '.....aaaaaa.....',
      '................',
      '................',
    ],
    { a: INK, b: '#fff3d6', c: '#3a2a4a', d: '#e5b544' },
  )
}

export function characterDrawings(): SpriteDrawing[] {
  const four = (draw: (frame: number) => Px) => [0, 1, 2, 3].map(draw)
  return [
    hero(),
    {
      kind: 'sprite',
      name: 'morcego',
      frameWidth: 64,
      frameHeight: 38,
      animations: [{ name: 'voar', fps: 6, loop: true, frames: four(bat) }],
    },
    {
      kind: 'sprite',
      name: 'gosma',
      frameWidth: 64,
      frameHeight: 38,
      animations: [{ name: 'quicar', fps: 6, loop: true, frames: four(blob) }],
    },
    {
      kind: 'sprite',
      name: 'esqueleto',
      frameWidth: 66,
      frameHeight: 58,
      animations: [{ name: 'andar', fps: 6, loop: true, frames: four(skeleton) }],
    },
    {
      kind: 'sprite',
      name: 'arma',
      frameWidth: 64,
      frameHeight: 34,
      animations: [{ name: 'mirar', fps: 1, loop: true, frames: [gun()] }],
    },
    {
      kind: 'sprite',
      name: 'bala',
      frameWidth: 16,
      frameHeight: 16,
      animations: [{ name: 'voar', fps: 1, loop: true, frames: [bullet()] }],
    },
    {
      kind: 'sprite',
      name: 'placar',
      frameWidth: 16,
      frameHeight: 16,
      animations: [
        { name: 'coracao', fps: 1, loop: true, frames: [heart()] },
        { name: 'caveira', fps: 1, loop: true, frames: [skull()] },
        { name: 'relogio', fps: 1, loop: true, frames: [clock()] },
      ],
    },
  ]
}
