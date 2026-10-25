/**
 * Python Monsters people: one chibi body drawn from parameters (skin, hair, hat, clothes), in the
 * four directions with a four-frame walk. A Pinta sprite per person with the animations
 * `baixo`, `esquerda`, `direita` and `cima` (the first frame of each is the standing pose).
 */
import type { SpriteDrawing } from '../../drawing'
import { darken, lighten, Px } from '../../pixel'
import { INK } from './kit'

type Dir = 'down' | 'left' | 'up'
type HairStyle = 'short' | 'long' | 'buns' | 'spiky' | 'curly' | 'wavy' | 'flowing'

interface Look {
  skin: string
  hair: string
  style: HairStyle
  hat?: { kind: 'cap' | 'bucket' | 'straw' | 'helmet' | 'band'; color: string; band?: string }
  shirt: string
  /** A second shirt colour: stripes, a cross or a collar depending on `pattern`. */
  accent?: string
  pattern?: 'stripes' | 'cross' | 'collar' | 'rainbow' | 'tube'
  bottom: string
  /** shorts and skirts show the knees. */
  bottomKind: 'pants' | 'shorts' | 'skirt' | 'dress'
  shoes: string
  backpack?: string
  /** A cape on the back (the arena champion). */
  cape?: string
  flames?: boolean
  beard?: string
  fins?: string
  ribbons?: string
}

const ramp = (color: string) => ({ dark: darken(color, 0.3), mid: color, light: lighten(color, 0.28) })

function figure(look: Look, dir: Dir, step: number): Px {
  const p = new Px(64, 64)
  const bob = step % 2 === 1 ? -1 : 0
  const skin = ramp(look.skin)
  const hair = ramp(look.hair)
  const shirt = ramp(look.shirt)
  const bottom = ramp(look.bottom)
  const shoe = ramp(look.shoes)
  const side = dir === 'left'
  const capeY = 37 + bob
  if (look.cape && dir !== 'up') {
    // Behind the body: seen at the sides from the front, trailing behind from the side.
    const cape = ramp(look.cape)
    const sway = step % 2
    if (side) p.polygon([[33, capeY], [40, capeY], [45 + sway, capeY + 20], [36, capeY + 21]], cape.mid).line(40, capeY + 2, 44 + sway, capeY + 19, cape.dark)
    else p.polygon([[22, capeY], [42, capeY], [45, capeY + 21 - sway], [19, capeY + 21 - sway]], cape.dark)
  }
  // Legs and shoes (the walk: one foot up, the other planted).
  const lift = (leg: 0 | 1) => (step === 1 && leg === 0) || (step === 3 && leg === 1) ? 2 : 0
  const legY = 49 + bob
  const legs: [number, 0 | 1][] = side ? [[29, 0], [33, 1]] : [[27, 0], [33, 1]]
  for (const [x0, leg] of legs) {
    let x = x0
    if (side && step === 1) x += leg === 0 ? -3 : 2
    if (side && step === 3) x += leg === 0 ? 2 : -3
    const top = legY
    const footY = 57 - lift(leg) + (bob ? 0 : 0)
    const showSkin = look.bottomKind !== 'pants'
    p.rect(x, top, 4, footY - top, showSkin ? skin.mid : bottom.mid)
    if (showSkin) p.rect(x, top, 4, 2, bottom.dark)
    p.rect(x + 3, top, 1, footY - top, showSkin ? skin.dark : bottom.dark)
    p.rect(x - (side ? 1 : 0), footY, side ? 6 : 4, 3, shoe.mid).rect(x - (side ? 1 : 0), footY, side ? 6 : 4, 1, shoe.light)
  }
  // Torso.
  const torsoX = side ? 26 : 25
  const torsoW = side ? 12 : 14
  const torsoY = 37 + bob
  p.rect(torsoX, torsoY, torsoW, 13, shirt.mid)
  p.rect(torsoX, torsoY, 2, 13, shirt.light).rect(torsoX + torsoW - 2, torsoY, 2, 13, shirt.dark)
  if (look.bottomKind === 'skirt' || look.bottomKind === 'dress') {
    const color = look.bottomKind === 'dress' ? shirt : bottom
    p.polygon([[torsoX - 1, torsoY + 9], [torsoX + torsoW + 1, torsoY + 9], [torsoX + torsoW + 4, torsoY + 17], [torsoX - 4, torsoY + 17]], color.mid)
    p.rect(torsoX - 4, torsoY + 16, torsoW + 8, 1, color.dark).rect(torsoX - 1, torsoY + 9, torsoW + 2, 1, color.light)
  } else {
    p.rect(torsoX, torsoY + 10, torsoW, 3, bottom.mid).rect(torsoX, torsoY + 10, torsoW, 1, bottom.dark)
  }
  // Shirt patterns.
  if (look.accent) {
    const accent = ramp(look.accent)
    if (look.pattern === 'stripes') for (let y = torsoY + 2; y < torsoY + 10; y += 3) p.rect(torsoX, y, torsoW, 1, accent.mid)
    if (look.pattern === 'cross' && dir === 'down') p.rect(31, torsoY + 2, 2, 6, accent.mid).rect(29, torsoY + 4, 6, 2, accent.mid)
    if (look.pattern === 'collar') p.rect(torsoX + 3, torsoY, torsoW - 6, 2, accent.mid).rect(torsoX + torsoW / 2 - 1, torsoY, 2, 9, accent.mid)
    if (look.pattern === 'tube') p.rect(torsoX, torsoY, torsoW, 3, skin.mid).rect(torsoX, torsoY + 7, torsoW, 3, skin.mid)
    if (look.pattern === 'rainbow') {
      const colors = ['#f05a6a', '#f6b04a', '#f6e05e', '#5fc46e', '#57a8e8']
      colors.forEach((c, index) => p.rect(torsoX + 1, torsoY + 1 + index * 2, torsoW - 2, 2, c))
    }
  }
  // Arms swing with the steps.
  const swing = step === 1 ? 1 : step === 3 ? -1 : 0
  if (side) {
    const armX = 30 + swing * 2
    p.rect(armX, torsoY + 1, 4, 8, shirt.dark).rect(armX, torsoY + 9, 4, 3, skin.mid)
  } else {
    p.rect(21, torsoY + 1 + swing, 4, 8, shirt.mid).rect(21, torsoY + 9 + swing, 4, 3, skin.mid)
    p.rect(39, torsoY + 1 - swing, 4, 8, shirt.dark).rect(39, torsoY + 9 - swing, 4, 3, skin.dark)
  }
  if (look.backpack && dir !== 'down') {
    const pack = ramp(look.backpack)
    if (dir === 'up') p.rect(26, torsoY + 1, 12, 10, pack.mid).rect(26, torsoY + 1, 12, 2, pack.light).rect(28, torsoY + 5, 8, 3, pack.dark)
    else p.rect(36, torsoY + 1, 5, 10, pack.mid).rect(36, torsoY + 1, 5, 2, pack.light)
  }
  if (look.cape && dir === 'up') {
    const cape = ramp(look.cape)
    const sway = step % 2
    p.polygon([[torsoX - 2, torsoY], [torsoX + torsoW + 2, torsoY], [torsoX + torsoW + 5, torsoY + 21 - sway], [torsoX - 5, torsoY + 21 - sway]], cape.mid)
    p.line(torsoX + 3, torsoY + 3, torsoX + 1, torsoY + 19, cape.dark).line(torsoX + torsoW - 3, torsoY + 3, torsoX + torsoW - 1, torsoY + 19, cape.dark)
    p.rect(torsoX - 2, torsoY, torsoW + 4, 2, cape.light)
  }
  if (look.flames) {
    for (const x of side ? [35] : [20, 41]) {
      p.polygon([[x - 2, torsoY + 4], [x + 1, torsoY - 4 + (step % 2)], [x + 4, torsoY + 4]], '#f6a33a')
      p.polygon([[x - 1, torsoY + 4], [x + 1, torsoY - 1 + (step % 2)], [x + 3, torsoY + 4]], '#ffe27a')
    }
  }
  // Head.
  const headY = 16 + bob
  p.ellipse(21, headY, 22, 21, skin.mid)
  p.ellipse(22, headY + 1, 8, 7, skin.light)
  drawHair(p, look, dir, headY, hair)
  // Face.
  if (dir === 'down') {
    for (const ex of [26, 35]) p.rect(ex, headY + 11, 3, 4, '#2a1d2b').set(ex, headY + 11, '#ffffff').set(ex + 2, headY + 14, '#4a3a5a')
    p.rect(24, headY + 15, 3, 1, '#f39a9a').rect(37, headY + 15, 3, 1, '#f39a9a')
    p.rect(31, headY + 16, 2, 1, skin.dark)
    if (look.beard) p.rect(25, headY + 15, 14, 5, look.beard).rect(29, headY + 16, 6, 1, skin.dark).rect(31, headY + 17, 2, 1, '#c26a5a')
  } else if (dir === 'left') {
    p.rect(23, headY + 11, 3, 4, '#2a1d2b').set(23, headY + 11, '#ffffff')
    p.rect(23, headY + 15, 2, 1, '#f39a9a')
    p.set(20, headY + 13, skin.mid).set(20, headY + 14, skin.dark)
    if (look.beard) p.rect(21, headY + 15, 9, 5, look.beard)
  }
  drawHat(p, look, dir, headY)
  p.outline(INK)
  return p
}

function drawHair(p: Px, look: Look, dir: Dir, headY: number, hair: ReturnType<typeof ramp>) {
  const back = dir === 'up'
  const side = dir === 'left'
  // Top of the head always has hair.
  p.ellipse(20, headY - 1, 24, 13, hair.mid)
  p.ellipse(23, headY, 10, 5, hair.light)
  if (back) p.ellipse(20, headY, 24, 20, hair.mid).ellipse(23, headY + 2, 9, 6, hair.light)
  else if (side) p.polygon([[31, headY], [44, headY + 3], [44, headY + 15], [36, headY + 14]], hair.mid).rect(41, headY + 4, 3, 10, hair.dark)
  else {
    // Fringe.
    p.rect(21, headY + 5, 22, 4, hair.mid)
    for (let x = 22; x < 43; x += 4) p.polygon([[x, headY + 8], [x + 4, headY + 8], [x + 2, headY + 11]], hair.mid)
    p.rect(21, headY + 5, 3, 10, hair.mid).rect(40, headY + 5, 3, 10, hair.dark)
  }
  switch (look.style) {
    case 'long':
    case 'flowing': {
      const length = look.style === 'flowing' ? 30 : 22
      if (back) p.rect(20, headY + 8, 24, length - 4, hair.mid).rect(20, headY + 8, 3, length - 4, hair.light).rect(41, headY + 8, 3, length - 4, hair.dark)
      else if (side) p.rect(34, headY + 6, 10, length - 4, hair.mid).rect(41, headY + 6, 3, length - 4, hair.dark)
      else p.rect(18, headY + 6, 5, length - 6, hair.mid).rect(41, headY + 6, 5, length - 6, hair.dark)
      if (look.style === 'flowing' && look.fins) {
        const fin = look.fins
        for (const x of side ? [40] : [17, 45]) p.polygon([[x, headY + 4], [x + (x < 32 ? -4 : 4), headY - 2], [x + (x < 32 ? -3 : 3), headY + 9]], fin)
      }
      break
    }
    case 'buns':
      for (const x of side ? [38] : [17, 41]) p.circle(x + 3, headY + 1, 5, hair.mid).circle(x + 2, headY, 2, hair.light)
      if (look.ribbons) for (const x of side ? [37] : [18, 42]) p.rect(x, headY + 4, 5, 2, look.ribbons)
      break
    case 'spiky':
      for (const [x, h] of [[21, 7], [26, 10], [31, 12], [36, 10], [41, 7]] as const) p.polygon([[x - 3, headY + 2], [x, headY - h], [x + 3, headY + 2]], hair.mid)
      p.polygon([[29, headY - 2], [31, headY - 10], [33, headY - 2]], hair.light)
      break
    case 'curly':
      for (const [x, y] of [[18, 8], [45, 8], [17, 14], [46, 14], [19, 20], [44, 20]] as const)
        if (!(side && x < 32)) p.circle(x, headY + y, 3.5, hair.mid).set(x - 1, headY + y - 1, hair.light)
      break
    case 'wavy':
      if (!side || back) p.rect(18, headY + 6, 4, 12, hair.mid).rect(42, headY + 6, 4, 12, hair.dark)
      break
    case 'short':
      break
  }
}

function drawHat(p: Px, look: Look, dir: Dir, headY: number) {
  if (!look.hat) return
  const c = ramp(look.hat.color)
  const side = dir === 'left'
  if (look.hat.kind === 'cap') {
    p.ellipse(20, headY - 3, 24, 12, c.mid).ellipse(23, headY - 2, 9, 4, c.light)
    p.rect(20, headY + 3, 24, 2, c.dark)
    if (dir === 'down') p.ellipse(22, headY + 3, 20, 5, look.hat.band ?? c.dark).rect(29, headY - 2, 6, 4, look.hat.band ?? '#ffffff')
    if (side) p.ellipse(13, headY + 2, 14, 4, look.hat.band ?? c.dark)
  } else if (look.hat.kind === 'bucket') {
    p.ellipse(20, headY - 4, 24, 13, c.mid).ellipse(23, headY - 3, 9, 4, c.light)
    p.ellipse(15, headY + 3, 34, 7, c.mid).rect(16, headY + 6, 32, 1, c.dark)
  } else if (look.hat.kind === 'helmet') {
    // A round metal helmet with a plume.
    p.polygon([[31, headY - 12], [34, headY - 12], [36, headY - 3], [29, headY - 3]], look.hat.band ?? '#d8402f')
    p.ellipse(19, headY - 5, 26, 16, c.mid).ellipse(22, headY - 4, 10, 6, c.light)
    p.rect(19, headY + 5, 26, 3, c.dark).rect(19, headY + 5, 26, 1, c.light)
    if (dir === 'down') p.rect(31, headY + 5, 2, 6, c.dark)
  } else if (look.hat.kind === 'band') {
    // A headband with a gem on the forehead.
    p.rect(20, headY + 4, 24, 3, c.mid).rect(20, headY + 4, 24, 1, c.light)
    if (dir === 'down') p.rect(30, headY + 3, 4, 4, look.hat.band ?? '#5fd0f0').set(30, headY + 3, '#ffffff')
    if (dir === 'left') p.rect(40, headY + 5, 5, 2, c.mid).rect(43, headY + 7, 2, 5, c.dark)
  } else {
    p.ellipse(10, headY + 1, 44, 10, c.mid).ellipse(14, headY + 2, 22, 4, c.light)
    p.ellipse(20, headY - 6, 24, 13, c.mid).ellipse(23, headY - 5, 10, 5, c.light)
    p.rect(20, headY + 1, 24, 3, look.hat.band ?? '#d64545')
    for (let x = 12; x < 52; x += 3) p.tint(x, headY + 6, c.dark)
  }
}

const SKIN = { light: '#f7cfae', mid: '#e0a47a', tan: '#c98a5e', brown: '#9a5f3c', dark: '#6f3f28' }

export const PEOPLE: Record<string, Look> = {
  jogador: {
    skin: SKIN.light,
    hair: '#6b3d24',
    style: 'short',
    hat: { kind: 'cap', color: '#1f9e8f', band: '#f4f4f4' },
    shirt: '#f2f2f5',
    accent: '#e0473f',
    pattern: 'collar',
    bottom: '#2f7a4a',
    bottomKind: 'pants',
    shoes: '#3a3550',
    backpack: '#e8962e',
  },
  loira: {
    skin: SKIN.light,
    hair: '#f2c94c',
    style: 'wavy',
    shirt: '#d93b4a',
    accent: '#fff2e6',
    pattern: 'tube',
    bottom: '#f6f1ea',
    bottomKind: 'skirt',
    shoes: '#c9733a',
  },
  'chefe-fogo': {
    skin: SKIN.brown,
    hair: '#e0412f',
    style: 'spiky',
    beard: '#3a2420',
    shirt: '#d8402f',
    accent: '#f6b04a',
    pattern: 'stripes',
    bottom: '#3a2a3f',
    bottomKind: 'pants',
    shoes: '#2a2232',
    flames: true,
  },
  'menina-chapeu': {
    skin: SKIN.tan,
    hair: '#3a2a3a',
    style: 'curly',
    hat: { kind: 'bucket', color: '#4f9a3a' },
    shirt: '#f4f4f4',
    bottom: '#3d3654',
    bottomKind: 'pants',
    shoes: '#5fbf6a',
  },
  'menina-roxa': {
    skin: SKIN.mid,
    hair: '#a46ad8',
    style: 'long',
    shirt: '#2f2f5c',
    accent: '#f28ab2',
    pattern: 'cross',
    bottom: '#2a2a4a',
    bottomKind: 'pants',
    shoes: '#2fb5a0',
  },
  'chapeu-de-palha': {
    skin: SKIN.tan,
    hair: '#4a3020',
    style: 'short',
    hat: { kind: 'straw', color: '#efc98a', band: '#d64545' },
    shirt: '#f6f6f2',
    bottom: '#3f8a46',
    bottomKind: 'shorts',
    shoes: '#b34a3a',
  },
  'chefe-agua': {
    skin: SKIN.mid,
    hair: '#5ed0cf',
    style: 'flowing',
    fins: '#f29ac2',
    shirt: '#2f6fc2',
    accent: '#ffffff',
    pattern: 'collar',
    bottom: '#2f6fc2',
    bottomKind: 'dress',
    shoes: '#f29ac2',
  },
  menina: {
    skin: SKIN.mid,
    hair: '#6a3f2c',
    style: 'buns',
    ribbons: '#e0313f',
    shirt: '#f4f4f4',
    accent: '#ffffff',
    pattern: 'rainbow',
    bottom: '#3a3a6a',
    bottomKind: 'shorts',
    shoes: '#d8313f',
  },
  rapaz: {
    skin: SKIN.light,
    hair: '#3d3a5c',
    style: 'short',
    shirt: '#5bb3b0',
    bottom: '#9a6a3e',
    bottomKind: 'shorts',
    shoes: '#3a3550',
  },
  // Added for the arena: the gatekeeper of the ruin gate and the champion.
  guarda: {
    skin: SKIN.tan,
    hair: '#4a3020',
    style: 'short',
    hat: { kind: 'helmet', color: '#9aa6b8', band: '#d8402f' },
    shirt: '#8a93a8',
    accent: '#e0b84a',
    pattern: 'stripes',
    bottom: '#4a3a5a',
    bottomKind: 'pants',
    shoes: '#6e4026',
  },
  campeao: {
    skin: SKIN.mid,
    hair: '#eceff6',
    style: 'spiky',
    hat: { kind: 'band', color: '#e0b84a', band: '#5fd0f0' },
    shirt: '#f4f1ea',
    accent: '#e0b84a',
    pattern: 'collar',
    bottom: '#2f3a6a',
    bottomKind: 'pants',
    shoes: '#e0b84a',
    cape: '#c2343f',
  },
}

export function personDrawing(name: string, look: Look): SpriteDrawing {
  const walk = (dir: Dir, flip = false) => [0, 1, 2, 3].map((step) => (flip ? figure(look, dir, step).flipX() : figure(look, dir, step)))
  return {
    kind: 'sprite',
    name,
    frameWidth: 64,
    frameHeight: 64,
    animations: [
      { name: 'baixo', fps: 6, loop: true, frames: walk('down') },
      { name: 'esquerda', fps: 6, loop: true, frames: walk('left') },
      { name: 'direita', fps: 6, loop: true, frames: walk('left', true) },
      { name: 'cima', fps: 6, loop: true, frames: walk('up') },
    ],
  }
}

export function peopleDrawings(): SpriteDrawing[] {
  return Object.entries(PEOPLE).map(([name, look]) => personDrawing(name, look))
}
