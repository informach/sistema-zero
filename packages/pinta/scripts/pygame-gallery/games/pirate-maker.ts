/**
 * Pirate Maker: a Mario Maker-like editor on a pirate island and the level it builds. Drawn at
 * half size (×2 in the game): the ground is a 47-piece tileset (32 px → 64 px tiles), the
 * pirate a 50×32 sprite (100×64), the palm trees 64×68 (each one cut to its size by the game).
 */
import type { Drawing, SpriteDrawing } from '../drawing'
import { Px } from '../pixel'
import { clam, pearlImage, pirateFrames, SHELL_ATTACK, tooth } from './pirate-maker/characters'
import {
  arrow,
  COIN_TURNS,
  cloud,
  coin,
  crownX,
  diamond,
  FAR_PALM,
  heart,
  NEAR_PALM,
  type PalmKind,
  palm,
  skyHandle,
  sparkle,
  spikes,
} from './pirate-maker/items'
import { TERRAIN_TILES, terrainTile, waterDeep, waterSurface } from './pirate-maker/terrain'

const PALMS: PalmKind[] = ['pequena', 'grande', 'esquerda', 'direita']

function sprite(name: string, width: number, height: number, animations: SpriteDrawing['animations']): SpriteDrawing {
  return { kind: 'sprite', name, frameWidth: width, frameHeight: height, animations }
}

/** A picture placed on a bigger, empty frame (icons and previews). */
function place(width: number, height: number, picture: Px, x: number, y: number): Px {
  return new Px(width, height).draw(picture, Math.round(x), Math.round(y))
}

/** The top of a palm tree, for the menu button (40×40). */
function palmIcon(picture: Px, kind: PalmKind, far: boolean): Px {
  const icon = new Px(40, 40)
  const left = crownX(kind, far) - 20
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) icon.set(x, y + 2, picture.get(x + left, y))
  return icon
}

export function drawings(): Drawing[] {
  const pirate = pirateFrames()
  const idleTooth = [0, 1, 2, 3, 4, 5].map((frame) => tooth(frame, false))
  const closedClam = clam(0, false)
  const smallClam = clam(0, false, 30, 18)
  const water = [0, 1, 2].map(waterSurface)
  const terrain = TERRAIN_TILES.map(terrainTile)
  const lonely = terrain[TERRAIN_TILES.indexOf('X')]!
  const nearPalms = PALMS.map((kind) => [0, 1, 2, 3].map((frame) => palm(kind, frame, NEAR_PALM)))
  const farPalms = PALMS.map((kind) => [0, 1, 2, 3].map((frame) => palm(kind, frame, FAR_PALM, true)))
  const one = (name: string, frame: Px) => ({ name, fps: 1, loop: false, frames: [frame] })

  return [
    {
      kind: 'tileset',
      name: 'terreno',
      tileSize: 32,
      tiles: terrain.map((image) => ({ image, collision: 'solid' as const })),
    },
    sprite('agua', 32, 32, [
      { name: 'superficie', fps: 8, loop: true, frames: water },
      one('fundo', waterDeep()),
    ]),
    sprite('pirata', 50, 32, [
      { name: 'parado', fps: 8, loop: true, frames: pirate.idle },
      { name: 'correr', fps: 8, loop: true, frames: pirate.run },
      { name: 'pular', fps: 8, loop: true, frames: pirate.jump },
      { name: 'cair', fps: 8, loop: true, frames: pirate.fall },
    ]),
    sprite('dente', 26, 23, [
      { name: 'parado', fps: 8, loop: true, frames: idleTooth },
      { name: 'correr', fps: 8, loop: true, frames: [0, 1, 2, 3, 4, 5].map((frame) => tooth(frame, true)) },
    ]),
    sprite('concha', 38, 23, [
      one('parada', closedClam),
      { name: 'atacar', fps: 8, loop: true, frames: SHELL_ATTACK.map((angle, index) => clam(angle, index === 1)) },
    ]),
    sprite('perola', 16, 16, [one('parada', pearlImage())]),
    sprite('espinhos', 32, 32, [one('parado', spikes())]),
    sprite('moedas', 16, 16, [
      { name: 'ouro', fps: 8, loop: true, frames: COIN_TURNS.map((turn) => coin(turn, 'gold')) },
      { name: 'prata', fps: 8, loop: true, frames: COIN_TURNS.map((turn) => coin(turn, 'silver')) },
    ]),
    sprite('diamante', 24, 24, [{ name: 'brilhar', fps: 8, loop: true, frames: [0, 1, 2, 3].map((frame) => diamond(frame)) }]),
    sprite('brilho', 16, 16, [{ name: 'estourar', fps: 8, loop: false, frames: [0, 1, 2].map(sparkle) }]),
    sprite(
      'palmeira',
      64,
      68,
      PALMS.map((name, index) => ({ name, fps: 8, loop: true, frames: nearPalms[index]! })),
    ),
    sprite(
      'palmeira-fundo',
      64,
      80,
      PALMS.map((name, index) => ({ name, fps: 8, loop: true, frames: farPalms[index]! })),
    ),
    sprite('nuvem', 128, 40, [{ name: 'formas', fps: 1, loop: true, frames: [0, 1, 2].map(cloud) }]),
    sprite('cursor', 14, 20, [one('seta', arrow()), one('alca', skyHandle())]),
    // the hearts and the coin counter of the play mode
    sprite('hud', 16, 16, [
      { name: 'coracao', fps: 1, loop: false, frames: [heart(true), heart(false)] },
      one('tesouro', coin(0, 'gold')),
    ]),
    // the four menu buttons of the editor
    sprite('menu', 40, 40, [
      one('terreno', place(40, 40, lonely, 4, 4)),
      one('agua', place(40, 40, water[0]!, 4, 4)),
      one('ouro', place(40, 40, coin(0, 'gold', 24, 9), 8, 8)),
      one('prata', place(40, 40, coin(0, 'silver', 24, 9), 8, 8)),
      one('diamante', place(40, 40, diamond(0), 8, 8)),
      one('espinhos', place(40, 40, spikes(), 4, 2)),
      one('dente', place(40, 40, idleTooth[0]!, 7, 9)),
      one('concha-esquerda', place(40, 40, closedClam, 1, 9)),
      one('concha-direita', place(40, 40, closedClam.flipX(), 1, 9)),
      { name: 'palmeiras', fps: 1, loop: false, frames: PALMS.map((kind, index) => palmIcon(nearPalms[index]![0]!, kind, false)) },
      {
        name: 'palmeiras-fundo',
        fps: 1,
        loop: false,
        frames: PALMS.map((kind, index) => palmIcon(farPalms[index]![0]!, kind, true)),
      },
    ]),
    // the ghost shown under the mouse before placing a tile
    sprite('previa', 32, 32, [
      one('terreno', lonely),
      one('agua', water[0]!),
      one('ouro', place(32, 32, coin(0, 'gold'), 8, 8)),
      one('prata', place(32, 32, coin(0, 'silver'), 8, 8)),
      one('diamante', place(32, 32, diamond(0), 4, 4)),
      one('espinhos', spikes()),
      one('dente', place(32, 32, idleTooth[0]!, 3, 9)),
      one('concha-esquerda', place(32, 32, smallClam, 1, 14)),
      one('concha-direita', place(32, 32, smallClam.flipX(), 1, 14)),
    ]),
  ]
}
