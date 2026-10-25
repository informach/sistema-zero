/**
 * Monster Battle: sixteen monsters (front, back and a small icon), the six attack animations,
 * the ability and menu icons, the grassy floor and the arena map. Drawn at half size (×2).
 * The parts live in games/monster-battle/.
 */
import type { Drawing, SpriteDrawing } from '../drawing'
import type { Px } from '../pixel'
import { arena, floor } from './monster-battle/arena'
import { ATTACK_SIZE, ATTACKS } from './monster-battle/attacks'
import { ABILITY_ICONS, ICON_PX, MENU_ICONS } from './monster-battle/icons'
import { breathe, place } from './monster-battle/kit'
import { ICON_SIZE, MONSTERS, type MonsterDesign, view } from './monster-battle/monsters'

function monster(design: MonsterDesign): SpriteDrawing {
  const front = view(design, design.front, false)
  const back = view(design, design.back, true)
  const icon = view(design, ICON_SIZE, false)
  const views = [front, back, icon]
  // One frame size for every view; one spare row on top for breathing in.
  const width = Math.max(...views.map((v) => v.width))
  const height = Math.max(...views.map((v) => v.height)) + 1
  const framed = (v: Px) => place(v, width, height)
  return {
    kind: 'sprite',
    name: design.name.toLowerCase(),
    frameWidth: width,
    frameHeight: height,
    animations: [
      { name: 'frente', fps: 2, loop: true, frames: [framed(front), framed(breathe(front))] },
      { name: 'costas', fps: 2, loop: true, frames: [framed(back), framed(breathe(back, 0.6))] },
      { name: 'icone', fps: 1, loop: true, frames: [framed(icon)] },
    ],
  }
}

export function drawings(): Drawing[] {
  return [
    ...MONSTERS.map(monster),
    {
      kind: 'sprite',
      name: 'ataques',
      frameWidth: ATTACK_SIZE,
      frameHeight: ATTACK_SIZE,
      animations: ATTACKS.map((attack) => ({
        name: attack.name,
        fps: 5,
        loop: false,
        frames: [0, 1, 2, 3].map((frame) => attack.draw(frame)),
      })),
    },
    {
      kind: 'sprite',
      name: 'icones',
      frameWidth: ICON_PX,
      frameHeight: ICON_PX,
      animations: [
        { name: 'habilidades', fps: 1, loop: true, frames: ABILITY_ICONS.map((draw) => draw()) },
        { name: 'menu', fps: 1, loop: true, frames: MENU_ICONS.map((draw) => draw()) },
      ],
    },
    {
      kind: 'sprite',
      name: 'chao',
      frameWidth: 128,
      frameHeight: 30,
      animations: [{ name: 'parado', fps: 1, loop: true, frames: [floor()] }],
    },
    arena().map,
  ]
}
