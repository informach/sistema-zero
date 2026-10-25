import { readFileSync } from 'node:fs'
import { pixelArt } from './pgzero-art'

/**
 * Original art of the Raylib examples, written as code (MIT, Sistema Zero 2026). The Clear Code
 * course draws small pixel-art textures and enlarges them with `draw_texture_ex(..., escala)`,
 * so this art is pixel art too: one character per pixel, encoded to PNG byte for byte
 * reproducibly (no clock, no random). Keys are the paths next to main.py.
 */

/** Press Start 2P (OFL), the same file the gabarito scenes use. */
export const PRESS_START_2P = new Uint8Array(
  readFileSync(new URL('../raylib/scenes/assets/fonts/pressstart2p.ttf', import.meta.url)),
)
export const PRESS_START_2P_OFL = readFileSync(
  new URL('../raylib/scenes/assets/fonts/OFL-pressstart2p.txt', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n')

// Nave (16 x 12): casco azul, cabine clara, chama laranja.
const NAVE = [
  '.......##.......',
  '......#oo#......',
  '......#oo#......',
  '.....##oo##.....',
  '....###cc###....',
  '...####cc####...',
  '..#####cc#####..',
  '.##############.',
  '###..######..###',
  '##....####....##',
  '......f..f......',
  '.....ff..ff.....',
]
const NAVE_CORES = { '#': '#4f7cff', o: '#d6f0ff', c: '#2b3fa8', f: '#ff9a3c' }

export const nave = (escala = 1) => pixelArt(NAVE, NAVE_CORES, escala)

// Pedra (16 x 16): asteroide cinza com crateras.
const PEDRA = [
  '.....######.....',
  '...##########...',
  '..####cc######..',
  '.####cccc######.',
  '.#####cc###cc##.',
  '##########cccc##',
  '###cc######cc###',
  '##cccc##########',
  '###cc#######cc##',
  '############cc##',
  '##############c.',
  '.#####cc#######.',
  '.####cccc######.',
  '..####cc######..',
  '...##########...',
  '.....######.....',
]
const PEDRA_CORES = { '#': '#9a8f86', c: '#6d635c' }
export const pedra = (escala = 1) => pixelArt(PEDRA, PEDRA_CORES, escala)

// Estrela (9 x 9) amarela com miolo claro.
const ESTRELA = [
  '....#....',
  '....#....',
  '...###...',
  '#########',
  '.##ooo##.',
  '..#####..',
  '..##.##..',
  '.##...##.',
  '.#.....#.',
]
export const estrela = (escala = 1) => pixelArt(ESTRELA, { '#': '#ffd23f', o: '#fff6c2' }, escala)

export const RAYLIB_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  'ola-raylib': () => ({
    'images/nave.png': nave(4),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'nave-que-desliza': () => ({
    'images/nave.png': nave(3),
    'images/pedra.png': pedra(4),
    'images/estrela.png': estrela(3),
  }),
}
