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

// Dino (16 x 16): corpo verde, barriga clara, olho e duas pernas que se alternam.
const DINO_CORPO = [
  '.........gggggg.',
  '........ggwggggg',
  '........gggggggg',
  '........ggggg...',
  '........gggggll.',
  '.g.....gggg.....',
  '.gg...ggggggg...',
  '.ggg.gggggggg...',
  '.gggggggbbbg....',
  '..gggggbbbbg....',
  '...ggggbbbg.....',
  '....ggggggg.....',
]
const DINO_PERNAS = [
  ['.....gg..g......', '.....g...gg.....', '.....gg.........', '................'],
  ['.....g..gg......', '.....gg..g......', '.........gg.....', '................'],
  ['.....g...g......', '.....gg..gg.....', '................', '................'],
]
const DINO_CORES = { g: '#4caf50', w: '#ffffff', l: '#2e7d32', b: '#c5e1a5' }
export const dino = (quadro: number, escala = 1) =>
  pixelArt([...DINO_CORPO, ...DINO_PERNAS[quadro]!], DINO_CORES, escala)

// Cactos de três tamanhos.
const CACTOS = [
  [
    '...gg...',
    '..gggg..',
    '..gggg..',
    'g.gggg..',
    'g.gggg.g',
    'gggggg.g',
    '..gggggg',
    '..gggg..',
    '..gggg..',
    '..gggg..',
  ],
  [
    '....gg....',
    '...gggg...',
    'g..gggg...',
    'g..gggg..g',
    'gg.gggg..g',
    '.ggggggggg',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
  ],
  [
    '..gg....gg..',
    '.gggg..gggg.',
    '.gggg..gggg.',
    'ggggg.gggggg',
    '.gggggggggg.',
    '.gggg..gggg.',
    '.gggg..gggg.',
    '.gggg..gggg.',
  ],
]
export const cacto = (tipo: number, escala = 1) => pixelArt(CACTOS[tipo]!, { g: '#2e7d32' }, escala)

// Passarinho (12 x 8), asa para cima e para baixo.
const PASSARO = [
  [
    '..pp........',
    '..ppp.......',
    '...ppp......',
    '..pppppppppo',
    'ppppppppppp.',
    '....pppppp..',
    '............',
    '............',
  ],
  [
    '............',
    '............',
    '..........o.',
    '..ppppppppoo',
    'ppppppppppp.',
    '...ppp......',
    '..ppp.......',
    '..pp........',
  ],
]
export const passaro = (quadro: number, escala = 1) =>
  pixelArt(PASSARO[quadro]!, { p: '#7e57c2', o: '#ffb300' }, escala)

// Nuvem (16 x 6).
const NUVEM = [
  '.....wwww.......',
  '...wwwwwwww.....',
  '..wwwwwwwwwwww..',
  '.wwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  '.wwwwwwwwwwwwww.',
]
export const nuvem = (escala = 1) => pixelArt(NUVEM, { w: '#ffffff' }, escala)

// Laser (4 x 14) e estrelinha de fundo (5 x 5).
const LASER = [
  '.ww.',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  '.ww.',
]
export const laser = (escala = 1) => pixelArt(LASER, { w: '#fff59d', y: '#ff5252' }, escala)
const ESTRELINHA = ['..w..', '.wyw.', 'wyyyw', '.wyw.', '..w..']
export const estrelinha = (escala = 1) =>
  pixelArt(ESTRELINHA, { w: '#fff8e1', y: '#ffe082' }, escala)

/** Explosão em anéis (24 x 24): cada quadro tem o anel maior e mais apagado. */
export function explosao(quadro: number, escala = 1) {
  const raio = 3 + quadro * 2.2
  const linhas: string[] = []
  for (let y = 0; y < 24; y++) {
    let linha = ''
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5)
      if (d < raio - 4 && quadro < 2) linha += 'w'
      else if (d < raio - 2) linha += quadro < 3 ? 'y' : '.'
      else if (d < raio) linha += quadro < 4 ? 'o' : 'r'
      else linha += '.'
    }
    linhas.push(linha)
  }
  return pixelArt(linhas, { w: '#ffffff', y: '#ffeb3b', o: '#ff9800', r: '#9e3a1e' }, escala)
}

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
  'dino-corredor': () => ({
    'images/dino0.png': dino(0),
    'images/dino1.png': dino(1),
    'images/dino-pulo.png': dino(2),
    'images/cacto0.png': cacto(0),
    'images/cacto1.png': cacto(1),
    'images/cacto2.png': cacto(2),
    'images/passaro0.png': passaro(0),
    'images/passaro1.png': passaro(1),
    'images/nuvem.png': nuvem(),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'chuva-de-meteoros': () => ({
    'images/nave.png': nave(4),
    'images/meteoro.png': pedra(4),
    'images/laser.png': laser(3),
    'images/estrela.png': estrelinha(2),
    'images/explosao0.png': explosao(0, 3),
    'images/explosao1.png': explosao(1, 3),
    'images/explosao2.png': explosao(2, 3),
    'images/explosao3.png': explosao(3, 3),
    'images/explosao4.png': explosao(4, 3),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'nave-que-desliza': () => ({
    'images/nave.png': nave(3),
    'images/pedra.png': pedra(4),
    'images/estrela.png': estrela(3),
  }),
}
