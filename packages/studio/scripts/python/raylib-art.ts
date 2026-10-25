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

// Herói andando (12 x 16), quatro quadros: as pernas e os braços se alternam.
const HEROI_CABECA = [
  '....kkkk....',
  '...kkkkkk...',
  '...ppppkk...',
  '...pepppk...',
  '...ppppp....',
  '....ppp.....',
]
const HEROI_QUADROS = [
  [
    '...gggggg...',
    '..pgggggggp.',
    '..p.gggg..p.',
    '....gggg....',
    '....bbbb....',
    '...bb..bb...',
    '..bb....bb..',
    '..ss....ss..',
    '.sss....sss.',
    '............',
  ],
  [
    '...gggggg...',
    '...ggggggp..',
    '..pgggg.....',
    '....gggg....',
    '....bbbb....',
    '....bbbb....',
    '....bb.bb...',
    '....ss.ss...',
    '...sss.sss..',
    '............',
  ],
  [
    '...gggggg...',
    '.pgggggggp..',
    '.p..gggg..p.',
    '....gggg....',
    '....bbbb....',
    '...bb..bb...',
    '..bb....bb..',
    '..ss....ss..',
    '.sss....sss.',
    '............',
  ],
  [
    '...gggggg...',
    '..pgggggg...',
    '.....ggggp..',
    '....gggg....',
    '....bbbb....',
    '....bbbb....',
    '...bb.bb....',
    '...ss.ss....',
    '..sss.sss...',
    '............',
  ],
]
const HEROI_CORES = {
  k: '#3b2a1e',
  p: '#f2c38b',
  e: '#2b2b2b',
  g: '#38a169',
  b: '#2b4c8c',
  s: '#6b3f22',
}
export const heroiQuadro = (quadro: number, escala = 1) =>
  pixelArt([...HEROI_CABECA, ...HEROI_QUADROS[quadro]!], HEROI_CORES, escala)

// Maçã (10 x 10) e cesta (16 x 8).
const MACA = [
  '.....g....',
  '....gl....',
  '..rr.rr...',
  '.rrrrrrrr.',
  'rrwrrrrrrr',
  'rwrrrrrrrr',
  'rrrrrrrrrr',
  'rrrrrrrrrr',
  '.rrrrrrrr.',
  '..rr..rr..',
]
export const maca = (escala = 1) =>
  pixelArt(MACA, { g: '#5b3a1e', l: '#4caf50', r: '#e53935', w: '#ffcdd2' }, escala)

export const RAYLIB_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  'ola-raylib': () => ({
    'images/nave.png': nave(4),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  // Encostou! e Câmera que Segue desenham tudo com formas: nenhuma imagem.
  encostou: () => ({}),
  'camera-que-segue': () => ({}),
  'sprites-timer-animacao': () => ({
    'images/heroi0.png': heroiQuadro(0),
    'images/heroi1.png': heroiQuadro(1),
    'images/heroi2.png': heroiQuadro(2),
    'images/heroi3.png': heroiQuadro(3),
    'images/maca.png': maca(),
  }),
  'nave-que-desliza': () => ({
    'images/nave.png': nave(3),
    'images/pedra.png': pedra(4),
    'images/estrela.png': estrela(3),
  }),
}
